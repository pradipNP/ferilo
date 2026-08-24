import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';

const deliveryAddressSchema = z.object({
  street: z.string().min(3).max(200),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
});

const createOrderSchema = z.object({
  productId: z.string().uuid('Invalid product id.'),
  fulfillmentType: z.enum(['MEETUP', 'DELIVERY']),
  offerId: z.string().uuid('Invalid offer id.').optional().nullable(),
  meetupLocationNote: z.string().max(500).optional().nullable(),
  deliveryAddress: deliveryAddressSchema.optional().nullable(),
});

const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const statusUpdateSchema = z.object({
  status: z.enum(['READY_FOR_MEETUP', 'READY_FOR_DELIVERY', 'IN_TRANSIT', 'DELIVERED']),
  note: z.string().max(500).optional().nullable(),
});

const orderSelect = `
  o.id, o.order_number, o.buyer_id, o.seller_id, o.product_id, o.offer_id,
  o.fulfillment_type, o.status, o.product_price, o.delivery_charge, o.trolley_charge,
  o.service_fee, o.total_amount, o.currency, o.meetup_location_note, o.delivery_address,
  o.distance_km, o.buyer_confirmed_at, o.seller_confirmed_at, o.completed_at,
  o.cancelled_at, o.cancellation_reason, o.created_at, o.updated_at,
  p.title AS product_title, p.city AS product_city,
  bp.display_name AS buyer_name, sp.display_name AS seller_name
`;

function mapOrder(row) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    productId: row.product_id,
    offerId: row.offer_id,
    fulfillmentType: row.fulfillment_type,
    status: row.status,
    productPrice: row.product_price,
    deliveryCharge: row.delivery_charge,
    trolleyCharge: row.trolley_charge,
    serviceFee: row.service_fee,
    totalAmount: row.total_amount,
    currency: row.currency,
    meetupLocationNote: row.meetup_location_note,
    deliveryAddress: row.delivery_address,
    distanceKm: row.distance_km,
    buyerConfirmedAt: row.buyer_confirmed_at,
    sellerConfirmedAt: row.seller_confirmed_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productTitle: row.product_title,
    productCity: row.product_city,
    buyerName: row.buyer_name,
    sellerName: row.seller_name,
  };
}

async function loadOrder(orderId, userId) {
  const { rows } = await pool.query(
    `SELECT ${orderSelect}
     FROM orders o
     JOIN products p ON p.id = o.product_id
     JOIN users bu ON bu.id = o.buyer_id
     JOIN users su ON su.id = o.seller_id
     LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
     LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
     WHERE o.id = $1 AND (o.buyer_id = $2 OR o.seller_id = $2)`,
    [orderId, userId],
  );
  return rows.length ? mapOrder(rows[0]) : null;
}

async function getDeliveryRules() {
  const { rows } = await pool.query(
    `SELECT rule_key, rule_value FROM delivery_rules
     WHERE rule_key IN ('min_delivery_charge', 'max_delivery_charge')`,
  );
  const rules = Object.fromEntries(rows.map((r) => [r.rule_key, Number(r.rule_value)]));
  return {
    min: rules.min_delivery_charge ?? 100,
    max: rules.max_delivery_charge ?? 5000,
  };
}

async function getCityDistance(fromCity, toCity) {
  const from = fromCity.trim();
  const to = toCity.trim();
  if (from.toLowerCase() === to.toLowerCase()) return 0;

  const { rows } = await pool.query(
    `SELECT distance_km FROM city_distances
     WHERE LOWER(from_city) = LOWER($1) AND LOWER(to_city) = LOWER($2)`,
    [from, to],
  );
  if (rows.length) return Number(rows[0].distance_km);
  return null;
}

export async function calculateDeliveryQuote(product, toCity) {
  if (!product.delivery_eligible) {
    throw new Error('NOT_DELIVERY_ELIGIBLE');
  }

  const distanceKm = await getCityDistance(product.city, toCity);
  if (distanceKm == null) {
    throw new Error('DISTANCE_NOT_FOUND');
  }

  const { rows: zones } = await pool.query(
    `SELECT id FROM delivery_zones WHERE city = $1 AND is_active = true LIMIT 1`,
    [product.city],
  );
  if (!zones.length) throw new Error('ZONE_NOT_FOUND');

  const { rows: rates } = await pool.query(
    `SELECT base_charge, per_km_charge, max_distance_km, trolley_charge
     FROM delivery_rates
     WHERE zone_id = $1 AND size_tier = $2 AND effective_to IS NULL
     LIMIT 1`,
    [zones[0].id, product.delivery_size_tier],
  );
  if (!rates.length) throw new Error('RATE_NOT_FOUND');

  const rate = rates[0];
  if (distanceKm > Number(rate.max_distance_km)) {
    throw new Error('DISTANCE_TOO_FAR');
  }

  let deliveryCharge = Number(rate.base_charge) + Number(rate.per_km_charge) * distanceKm;
  const trolleyCharge = product.requires_trolley ? Number(rate.trolley_charge) : 0;
  const rules = await getDeliveryRules();
  deliveryCharge = Math.min(rules.max, Math.max(rules.min, deliveryCharge));

  return {
    distanceKm,
    deliveryCharge,
    trolleyCharge,
    totalDelivery: deliveryCharge + trolleyCharge,
  };
}

async function generateOrderNumber(client) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS c FROM orders WHERE order_number LIKE $1`,
    [`FER-${date}-%`],
  );
  return `FER-${date}-${String(rows[0].c + 1).padStart(4, '0')}`;
}

async function recordStatusChange(client, orderId, fromStatus, toStatus, userId, note) {
  const q = `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
     VALUES ($1, $2, $3, $4, $5)`;
  const params = [orderId, fromStatus, toStatus, userId, note || null];
  if (client) await client.query(q, params);
  else await pool.query(q, params);
}

async function resolveProductPrice(productId, buyerId, offerId, AppError) {
  if (!offerId) return null;

  const { rows } = await pool.query(
    `SELECT amount, status, buyer_id, product_id FROM offers WHERE id = $1`,
    [offerId],
  );
  if (!rows.length) throw new AppError('OFFER_NOT_FOUND', 'Offer was not found.', 404);
  const offer = rows[0];
  if (offer.buyer_id !== buyerId) throw new AppError('FORBIDDEN', 'Not your offer.', 403);
  if (offer.product_id !== productId) throw new AppError('INVALID_OFFER', 'Offer does not match this product.', 400);
  if (offer.status !== 'ACCEPTED') throw new AppError('OFFER_NOT_ACCEPTED', 'Only accepted offers can be used for orders.', 400);
  return Number(offer.amount);
}

export function attachOrderRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/orders/quote',
    authenticate,
    asyncHandler(async (req, res) => {
      const productId = req.query.productId;
      const toCity = req.query.toCity?.trim();
      if (!productId || !toCity) {
        throw new AppError('VALIDATION_ERROR', 'productId and toCity are required.', 400);
      }

      const { rows } = await pool.query(
        `SELECT id, city, delivery_eligible, delivery_size_tier, requires_trolley, status
         FROM products WHERE id = $1`,
        [productId],
      );
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      const product = rows[0];
      if (product.status !== 'ACTIVE') {
        throw new AppError('PRODUCT_UNAVAILABLE', 'This listing is not available.', 400);
      }

      try {
        const quote = await calculateDeliveryQuote(product, toCity);
        sendSuccess(res, quote);
      } catch (err) {
        if (err.message === 'NOT_DELIVERY_ELIGIBLE') {
          throw new AppError('NOT_DELIVERY_ELIGIBLE', 'This item is not eligible for delivery.', 400);
        }
        if (err.message === 'DISTANCE_NOT_FOUND') {
          throw new AppError('DISTANCE_NOT_FOUND', 'Delivery distance is not configured for this route.', 400);
        }
        if (err.message === 'DISTANCE_TOO_FAR') {
          throw new AppError('DISTANCE_TOO_FAR', 'Delivery is not available beyond the maximum distance.', 400);
        }
        throw err;
      }
    }),
  );

  router.get(
    '/orders/mine',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT ${orderSelect}
         FROM orders o
         JOIN products p ON p.id = o.product_id
         JOIN users bu ON bu.id = o.buyer_id
         JOIN users su ON su.id = o.seller_id
         LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
         LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
         WHERE o.buyer_id = $1
         ORDER BY o.created_at DESC`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapOrder));
    }),
  );

  router.get(
    '/orders/sales',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT ${orderSelect}
         FROM orders o
         JOIN products p ON p.id = o.product_id
         JOIN users bu ON bu.id = o.buyer_id
         JOIN users su ON su.id = o.seller_id
         LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
         LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
         WHERE o.seller_id = $1
         ORDER BY o.created_at DESC`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapOrder));
    }),
  );

  router.get(
    '/orders/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id, req.user.id);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);

      const { rows: history } = await pool.query(
        `SELECT h.from_status, h.to_status, h.note, h.created_at,
          pr.display_name AS changed_by_name
         FROM order_status_history h
         LEFT JOIN user_profiles pr ON pr.user_id = h.changed_by
         WHERE h.order_id = $1
         ORDER BY h.created_at ASC`,
        [req.params.id],
      );

      sendSuccess(res, {
        order,
        history: history.map((h) => ({
          fromStatus: h.from_status,
          toStatus: h.to_status,
          note: h.note,
          changedByName: h.changed_by_name,
          createdAt: h.created_at,
        })),
      });
    }),
  );

  router.post(
    '/orders',
    authenticate,
    validate(z.object({ body: createOrderSchema })),
    asyncHandler(async (req, res) => {
      const b = req.validated.body;

      const { rows: products } = await pool.query(
        `SELECT id, seller_id, status, price, delivery_eligible, delivery_size_tier,
          requires_trolley, meetup_available, city
         FROM products WHERE id = $1`,
        [b.productId],
      );
      if (!products.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      const product = products[0];
      if (product.status !== 'ACTIVE') {
        throw new AppError('PRODUCT_UNAVAILABLE', 'This listing is not available.', 400);
      }
      if (product.seller_id === req.user.id) {
        throw new AppError('CANNOT_ORDER_OWN', 'You cannot order your own listing.', 400);
      }

      const { rows: existing } = await pool.query(
        `SELECT id FROM orders
         WHERE product_id = $1 AND buyer_id = $2 AND status NOT IN ('CANCELLED', 'COMPLETED')`,
        [b.productId, req.user.id],
      );
      if (existing.length) {
        throw new AppError('ORDER_EXISTS', 'You already have an active order for this listing.', 409);
      }

      if (b.fulfillmentType === 'MEETUP' && !product.meetup_available) {
        throw new AppError('MEETUP_UNAVAILABLE', 'Meetup is not available for this listing.', 400);
      }
      if (b.fulfillmentType === 'DELIVERY') {
        if (!product.delivery_eligible) {
          throw new AppError('NOT_DELIVERY_ELIGIBLE', 'This item is not eligible for delivery.', 400);
        }
        if (!b.deliveryAddress) {
          throw new AppError('DELIVERY_ADDRESS_REQUIRED', 'Delivery address is required.', 400);
        }
      }

      const offerPrice = b.offerId
        ? await resolveProductPrice(b.productId, req.user.id, b.offerId, AppError)
        : null;
      const productPrice = offerPrice ?? Number(product.price);

      let deliveryCharge = 0;
      let trolleyCharge = 0;
      let distanceKm = null;

      if (b.fulfillmentType === 'DELIVERY') {
        try {
          const quote = await calculateDeliveryQuote(product, b.deliveryAddress.city);
          deliveryCharge = quote.deliveryCharge;
          trolleyCharge = quote.trolleyCharge;
          distanceKm = quote.distanceKm;
        } catch (err) {
          if (err.message === 'DISTANCE_NOT_FOUND') {
            throw new AppError('DISTANCE_NOT_FOUND', 'Delivery distance is not configured for this route.', 400);
          }
          if (err.message === 'DISTANCE_TOO_FAR') {
            throw new AppError('DISTANCE_TOO_FAR', 'Delivery is not available beyond the maximum distance.', 400);
          }
          throw err;
        }
      }

      const serviceFee = 0;
      const totalAmount = productPrice + deliveryCharge + trolleyCharge + serviceFee;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orderNumber = await generateOrderNumber(client);
        const { rows } = await client.query(
          `INSERT INTO orders (
            order_number, buyer_id, seller_id, product_id, offer_id, fulfillment_type,
            product_price, delivery_charge, trolley_charge, service_fee, total_amount,
            meetup_location_note, delivery_address, distance_km
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          RETURNING id`,
          [
            orderNumber,
            req.user.id,
            product.seller_id,
            b.productId,
            b.offerId || null,
            b.fulfillmentType,
            productPrice,
            deliveryCharge,
            trolleyCharge,
            serviceFee,
            totalAmount,
            b.fulfillmentType === 'MEETUP' ? b.meetupLocationNote?.trim() || null : null,
            b.fulfillmentType === 'DELIVERY' ? JSON.stringify(b.deliveryAddress) : null,
            distanceKm,
          ],
        );
        await recordStatusChange(client, rows[0].id, null, 'PENDING', req.user.id, 'Order placed');
        await client.query('COMMIT');
        sendSuccess(res, await loadOrder(rows[0].id, req.user.id), null, 201);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/orders/:id/confirm',
    authenticate,
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id, req.user.id);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
      if (order.sellerId !== req.user.id) throw new AppError('FORBIDDEN', 'Only the seller can confirm orders.', 403);
      if (order.status !== 'PENDING') throw new AppError('INVALID_STATUS', 'Only pending orders can be confirmed.', 400);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE orders SET status = 'CONFIRMED', seller_confirmed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [order.id],
        );
        await client.query(
          `UPDATE products SET status = 'RESERVED', updated_at = NOW() WHERE id = $1 AND status = 'ACTIVE'`,
          [order.productId],
        );
        await recordStatusChange(client, order.id, 'PENDING', 'CONFIRMED', req.user.id, 'Seller confirmed order');
        await client.query('COMMIT');
        sendSuccess(res, await loadOrder(order.id, req.user.id));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/orders/:id/status',
    authenticate,
    validate(z.object({ body: statusUpdateSchema })),
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id, req.user.id);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
      if (order.sellerId !== req.user.id) throw new AppError('FORBIDDEN', 'Only the seller can update fulfillment status.', 403);

      const { status, note } = req.validated.body;
      const allowed = {
        CONFIRMED: order.fulfillmentType === 'MEETUP' ? ['READY_FOR_MEETUP'] : ['READY_FOR_DELIVERY'],
        READY_FOR_DELIVERY: ['IN_TRANSIT'],
        IN_TRANSIT: ['DELIVERED'],
      };
      if (!allowed[order.status]?.includes(status)) {
        throw new AppError('INVALID_TRANSITION', `Cannot change status from ${order.status} to ${status}.`, 400);
      }

      await pool.query(`UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`, [status, order.id]);
      await recordStatusChange(null, order.id, order.status, status, req.user.id, note);
      sendSuccess(res, await loadOrder(order.id, req.user.id));
    }),
  );

  router.patch(
    '/orders/:id/complete',
    authenticate,
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id, req.user.id);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);

      const canComplete = order.fulfillmentType === 'MEETUP'
        ? order.status === 'READY_FOR_MEETUP'
        : order.status === 'DELIVERED';

      if (!canComplete) {
        throw new AppError('INVALID_STATUS', 'Order is not ready to complete.', 400);
      }

      const isBuyer = order.buyerId === req.user.id;
      const isSeller = order.sellerId === req.user.id;
      if (!isBuyer && !isSeller) throw new AppError('FORBIDDEN', 'Not your order.', 403);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE orders SET status = 'COMPLETED', completed_at = NOW(),
            buyer_confirmed_at = CASE WHEN $2 = buyer_id THEN NOW() ELSE buyer_confirmed_at END,
            updated_at = NOW()
           WHERE id = $1`,
          [order.id, req.user.id],
        );
        await client.query(
          `UPDATE products SET status = 'SOLD', updated_at = NOW() WHERE id = $1`,
          [order.productId],
        );
        await client.query(
          `UPDATE user_profiles SET total_sales = total_sales + 1, updated_at = NOW() WHERE user_id = $1`,
          [order.sellerId],
        );
        await client.query(
          `UPDATE user_profiles SET total_purchases = total_purchases + 1, updated_at = NOW() WHERE user_id = $1`,
          [order.buyerId],
        );
        await recordStatusChange(client, order.id, order.status, 'COMPLETED', req.user.id, 'Order completed');
        await client.query('COMMIT');
        sendSuccess(res, await loadOrder(order.id, req.user.id));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/orders/:id/cancel',
    authenticate,
    validate(z.object({ body: cancelOrderSchema })),
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id, req.user.id);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw new AppError('INVALID_STATUS', 'This order can no longer be cancelled.', 400);
      }

      const { reason } = req.validated.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE orders SET status = 'CANCELLED', cancelled_at = NOW(),
            cancellation_reason = $1, updated_at = NOW()
           WHERE id = $2`,
          [reason, order.id],
        );
        await client.query(
          `UPDATE products SET status = 'ACTIVE', updated_at = NOW()
           WHERE id = $1 AND status = 'RESERVED'`,
          [order.productId],
        );
        await recordStatusChange(client, order.id, order.status, 'CANCELLED', req.user.id, reason);
        await client.query('COMMIT');
        sendSuccess(res, await loadOrder(order.id, req.user.id));
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );
}
