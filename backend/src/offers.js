import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';
import { notify, formatNpr } from './notifications.js';

const OFFER_EXPIRY_DAYS = 7;

const offerBodySchema = z.object({
  productId: z.string().uuid('Invalid product id.'),
  amount: z.coerce.number().positive('Offer amount must be greater than zero.'),
  message: z.string().max(1000).optional().nullable(),
});

const counterBodySchema = z.object({
  amount: z.coerce.number().positive('Counter amount must be greater than zero.'),
  message: z.string().max(1000).optional().nullable(),
});

function mapOffer(row) {
  return {
    id: row.id,
    productId: row.product_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    amount: row.amount,
    message: row.message,
    status: row.status,
    parentOfferId: row.parent_offer_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productTitle: row.product_title,
    productPrice: row.product_price,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
  };
}

const offerSelect = `
  o.id, o.product_id, o.buyer_id, o.seller_id, o.amount, o.message, o.status,
  o.parent_offer_id, o.expires_at, o.created_at, o.updated_at,
  p.title AS product_title, p.price AS product_price,
  bp.display_name AS buyer_name, sp.display_name AS seller_name
`;

async function expireStaleOffers() {
  await pool.query(
    `UPDATE offers SET status = 'EXPIRED', updated_at = NOW()
     WHERE status = 'PENDING' AND expires_at < NOW()`,
  );
}

async function loadOffer(offerId) {
  const { rows } = await pool.query(
    `SELECT ${offerSelect}
     FROM offers o
     JOIN products p ON p.id = o.product_id
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.seller_id
     LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
     LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
     WHERE o.id = $1`,
    [offerId],
  );
  return rows.length ? mapOffer(rows[0]) : null;
}

function canAccept(offer, userId) {
  if (offer.status !== 'PENDING') return false;
  if (!offer.parentOfferId && offer.sellerId === userId) return true;
  if (offer.parentOfferId && offer.buyerId === userId) return true;
  return false;
}

function canRespondAsSeller(offer, userId) {
  return offer.status === 'PENDING' && offer.sellerId === userId && !offer.parentOfferId;
}

function canRespondAsBuyer(offer, userId) {
  return offer.status === 'PENDING' && offer.buyerId === userId && !!offer.parentOfferId;
}

function counterpartyOf(offer, userId) {
  return offer.sellerId === userId ? offer.buyerId : offer.sellerId;
}

function actorName(offer, userId) {
  return (offer.sellerId === userId ? offer.sellerName : offer.buyerName) || 'A FERILO member';
}

export function attachOfferRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/offers/mine',
    authenticate,
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const { rows } = await pool.query(
        `SELECT ${offerSelect}
         FROM offers o
         JOIN products p ON p.id = o.product_id
         JOIN users bu ON bu.id = o.buyer_id
         JOIN users su ON su.id = o.seller_id
         LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
         LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
         WHERE o.buyer_id = $1
         ORDER BY o.created_at DESC`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapOffer));
    }),
  );

  router.get(
    '/offers/incoming',
    authenticate,
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const { rows } = await pool.query(
        `SELECT ${offerSelect}
         FROM offers o
         JOIN products p ON p.id = o.product_id
         JOIN users bu ON bu.id = o.buyer_id
         JOIN users su ON su.id = o.seller_id
         LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
         LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
         WHERE o.seller_id = $1
         ORDER BY o.created_at DESC`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapOffer));
    }),
  );

  router.post(
    '/offers',
    authenticate,
    validate(z.object({ body: offerBodySchema })),
    asyncHandler(async (req, res) => {
      const { productId, amount, message } = req.validated.body;

      const { rows: products } = await pool.query(
        `SELECT id, seller_id, status, price, is_negotiable FROM products WHERE id = $1`,
        [productId],
      );
      if (!products.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      const product = products[0];
      if (product.status !== 'ACTIVE') {
        throw new AppError('PRODUCT_UNAVAILABLE', 'This listing is not available for offers.', 400);
      }
      if (product.seller_id === req.user.id) {
        throw new AppError('CANNOT_OFFER_OWN', 'You cannot make an offer on your own listing.', 400);
      }
      if (!product.is_negotiable) {
        throw new AppError('NOT_NEGOTIABLE', 'This listing has a fixed price.', 400);
      }

      const { rows: pending } = await pool.query(
        `SELECT id FROM offers
         WHERE product_id = $1 AND buyer_id = $2 AND status = 'PENDING'`,
        [productId, req.user.id],
      );
      if (pending.length) {
        throw new AppError('OFFER_EXISTS', 'You already have a pending offer on this listing.', 409);
      }

      const expiresAt = new Date(Date.now() + OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const { rows } = await pool.query(
        `INSERT INTO offers (product_id, buyer_id, seller_id, amount, message, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [productId, req.user.id, product.seller_id, amount, message?.trim() || null, expiresAt],
      );

      const offer = await loadOffer(rows[0].id);
      await notify(null, {
        userId: offer.sellerId,
        type: 'OFFER_RECEIVED',
        title: 'New offer received',
        body: `${offer.buyerName || 'A buyer'} offered ${formatNpr(offer.amount)} for "${offer.productTitle}".`,
        link: '/app/offers',
      });

      sendSuccess(res, offer, null, 201);
    }),
  );

  router.patch(
    '/offers/:id/accept',
    authenticate,
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const offer = await loadOffer(req.params.id);
      if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer was not found.', 404);
      if (!canAccept(offer, req.user.id)) {
        throw new AppError('FORBIDDEN', 'You cannot accept this offer.', 403);
      }

      await pool.query(
        `UPDATE offers SET status = 'ACCEPTED', updated_at = NOW() WHERE id = $1`,
        [offer.id],
      );

      await notify(null, {
        userId: counterpartyOf(offer, req.user.id),
        type: 'OFFER_ACCEPTED',
        title: 'Offer accepted',
        body: `${actorName(offer, req.user.id)} accepted the ${formatNpr(offer.amount)} offer on "${offer.productTitle}". You can place the order now.`,
        link: `/products/${offer.productId}?offerId=${offer.id}`,
      });

      sendSuccess(res, await loadOffer(offer.id));
    }),
  );

  router.patch(
    '/offers/:id/reject',
    authenticate,
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const offer = await loadOffer(req.params.id);
      if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer was not found.', 404);
      if (!canRespondAsSeller(offer, req.user.id) && !canRespondAsBuyer(offer, req.user.id)) {
        throw new AppError('FORBIDDEN', 'You cannot reject this offer.', 403);
      }

      await pool.query(
        `UPDATE offers SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
        [offer.id],
      );

      await notify(null, {
        userId: counterpartyOf(offer, req.user.id),
        type: 'OFFER_REJECTED',
        title: 'Offer declined',
        body: `${actorName(offer, req.user.id)} declined the ${formatNpr(offer.amount)} offer on "${offer.productTitle}".`,
        link: '/app/offers',
      });

      sendSuccess(res, await loadOffer(offer.id));
    }),
  );

  router.patch(
    '/offers/:id/counter',
    authenticate,
    validate(z.object({ body: counterBodySchema })),
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const offer = await loadOffer(req.params.id);
      if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer was not found.', 404);
      if (offer.status !== 'PENDING') {
        throw new AppError('OFFER_NOT_PENDING', 'Only pending offers can be countered.', 400);
      }

      const isSellerCounter = canRespondAsSeller(offer, req.user.id);
      const isBuyerCounter = canRespondAsBuyer(offer, req.user.id);
      if (!isSellerCounter && !isBuyerCounter) {
        throw new AppError('FORBIDDEN', 'You cannot counter this offer.', 403);
      }

      const { amount, message } = req.validated.body;
      const expiresAt = new Date(Date.now() + OFFER_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE offers SET status = 'COUNTERED', updated_at = NOW() WHERE id = $1`,
          [offer.id],
        );
        const { rows } = await client.query(
          `INSERT INTO offers (product_id, buyer_id, seller_id, amount, message, parent_offer_id, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            offer.productId,
            offer.buyerId,
            offer.sellerId,
            amount,
            message?.trim() || null,
            offer.id,
            expiresAt,
          ],
        );
        await client.query('COMMIT');

        await notify(null, {
          userId: counterpartyOf(offer, req.user.id),
          type: 'OFFER_COUNTERED',
          title: 'Counter offer received',
          body: `${actorName(offer, req.user.id)} countered with ${formatNpr(amount)} on "${offer.productTitle}".`,
          link: '/app/offers',
        });

        sendSuccess(res, await loadOffer(rows[0].id), null, 201);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/offers/:id/cancel',
    authenticate,
    asyncHandler(async (req, res) => {
      await expireStaleOffers();
      const offer = await loadOffer(req.params.id);
      if (!offer) throw new AppError('OFFER_NOT_FOUND', 'Offer was not found.', 404);
      if (offer.buyerId !== req.user.id || offer.status !== 'PENDING') {
        throw new AppError('FORBIDDEN', 'You can only cancel your own pending offers.', 403);
      }

      await pool.query(
        `UPDATE offers SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
        [offer.id],
      );

      await notify(null, {
        userId: offer.sellerId,
        type: 'OFFER_CANCELLED',
        title: 'Offer withdrawn',
        body: `${offer.buyerName || 'The buyer'} withdrew the ${formatNpr(offer.amount)} offer on "${offer.productTitle}".`,
        link: '/app/offers',
      });

      sendSuccess(res, await loadOffer(offer.id));
    }),
  );
}
