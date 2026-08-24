import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';

const reviewBodySchema = z.object({
  rating: z.coerce
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be between 1 and 5.')
    .max(5, 'Rating must be between 1 and 5.'),
  comment: z.string().trim().max(1000, 'Comment must be 1000 characters or fewer.').optional().nullable(),
});

const orderIdParams = z.object({ orderId: z.string().uuid('Invalid order id.') });
const userIdParams = z.object({ userId: z.string().uuid('Invalid user id.') });

const reviewSelect = `
  r.id, r.order_id, r.reviewer_id, r.reviewee_id, r.reviewer_role,
  r.rating, r.comment, r.created_at,
  o.order_number,
  p.id AS product_id, p.title AS product_title,
  rp.display_name AS reviewer_name, ep.display_name AS reviewee_name
`;

const reviewFrom = `
  FROM reviews r
  JOIN orders o ON o.id = r.order_id
  JOIN products p ON p.id = o.product_id
  LEFT JOIN user_profiles rp ON rp.user_id = r.reviewer_id
  LEFT JOIN user_profiles ep ON ep.user_id = r.reviewee_id
`;

function mapReview(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    reviewerRole: row.reviewer_role,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    reviewerName: row.reviewer_name,
    revieweeName: row.reviewee_name,
    productId: row.product_id,
    productTitle: row.product_title,
  };
}

async function loadReview(reviewId) {
  const { rows } = await pool.query(`SELECT ${reviewSelect} ${reviewFrom} WHERE r.id = $1`, [reviewId]);
  return rows.length ? mapReview(rows[0]) : null;
}

// A buyer's review rates the seller, and vice versa, so each role feeds a different average.
async function refreshRatingAverages(client, userId) {
  await client.query(
    `UPDATE user_profiles SET
       seller_rating_avg = COALESCE((
         SELECT ROUND(AVG(rating), 2) FROM reviews
         WHERE reviewee_id = $1 AND reviewer_role = 'BUYER'
       ), 0),
       buyer_rating_avg = COALESCE((
         SELECT ROUND(AVG(rating), 2) FROM reviews
         WHERE reviewee_id = $1 AND reviewer_role = 'SELLER'
       ), 0),
       updated_at = NOW()
     WHERE user_id = $1`,
    [userId],
  );
}

async function loadOrderParties(orderId, AppError) {
  const { rows } = await pool.query(
    `SELECT id, buyer_id, seller_id, status FROM orders WHERE id = $1`,
    [orderId],
  );
  if (!rows.length) throw new AppError('ORDER_NOT_FOUND', 'Order was not found.', 404);
  return rows[0];
}

export function attachReviewRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/users/:userId/reviews',
    validate(z.object({ params: userIdParams })),
    asyncHandler(async (req, res) => {
      const { userId } = req.validated.params;

      const { rows: users } = await pool.query(
        `SELECT u.id, u.verification_status, u.account_status, u.created_at,
                pr.display_name, pr.city, pr.district, pr.bio, pr.avatar_url,
                pr.buyer_rating_avg, pr.seller_rating_avg, pr.total_sales, pr.total_purchases
         FROM users u
         LEFT JOIN user_profiles pr ON pr.user_id = u.id
         WHERE u.id = $1`,
        [userId],
      );
      if (!users.length || users[0].account_status === 'DELETED') {
        throw new AppError('USER_NOT_FOUND', 'This member was not found.', 404);
      }
      const u = users[0];

      const { rows } = await pool.query(
        `SELECT ${reviewSelect} ${reviewFrom}
         WHERE r.reviewee_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [userId],
      );

      const { rows: counts } = await pool.query(
        `SELECT reviewer_role, COUNT(*)::int AS count, ROUND(AVG(rating), 2) AS average
         FROM reviews WHERE reviewee_id = $1
         GROUP BY reviewer_role`,
        [userId],
      );
      const byRole = Object.fromEntries(counts.map((c) => [c.reviewer_role, c]));

      sendSuccess(res, {
        user: {
          id: u.id,
          displayName: u.display_name,
          verificationStatus: u.verification_status,
          city: u.city,
          district: u.district,
          bio: u.bio,
          avatarUrl: u.avatar_url,
          totalSales: u.total_sales ?? 0,
          totalPurchases: u.total_purchases ?? 0,
          memberSince: u.created_at,
        },
        summary: {
          asSeller: {
            count: byRole.BUYER?.count ?? 0,
            average: Number(byRole.BUYER?.average ?? 0),
          },
          asBuyer: {
            count: byRole.SELLER?.count ?? 0,
            average: Number(byRole.SELLER?.average ?? 0),
          },
        },
        reviews: rows.map(mapReview),
      });
    }),
  );

  router.get(
    '/orders/:orderId/reviews',
    authenticate,
    validate(z.object({ params: orderIdParams })),
    asyncHandler(async (req, res) => {
      const { orderId } = req.validated.params;
      const order = await loadOrderParties(orderId, AppError);
      if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
        throw new AppError('FORBIDDEN', 'Not your order.', 403);
      }

      const { rows } = await pool.query(
        `SELECT ${reviewSelect} ${reviewFrom} WHERE r.order_id = $1 ORDER BY r.created_at ASC`,
        [orderId],
      );
      const reviews = rows.map(mapReview);
      const counterpartId = order.buyer_id === req.user.id ? order.seller_id : order.buyer_id;

      sendSuccess(res, {
        reviews,
        myReview: reviews.find((r) => r.reviewerId === req.user.id) || null,
        counterpartReview: reviews.find((r) => r.reviewerId === counterpartId) || null,
        canReview: order.status === 'COMPLETED' && !reviews.some((r) => r.reviewerId === req.user.id),
      });
    }),
  );

  router.post(
    '/orders/:orderId/reviews',
    authenticate,
    validate(z.object({ params: orderIdParams, body: reviewBodySchema })),
    asyncHandler(async (req, res) => {
      const { orderId } = req.validated.params;
      const { rating, comment } = req.validated.body;
      const order = await loadOrderParties(orderId, AppError);

      const isBuyer = order.buyer_id === req.user.id;
      const isSeller = order.seller_id === req.user.id;
      if (!isBuyer && !isSeller) throw new AppError('FORBIDDEN', 'Not your order.', 403);
      if (order.status !== 'COMPLETED') {
        throw new AppError('ORDER_NOT_COMPLETED', 'Only completed orders can be reviewed.', 400);
      }

      const { rows: existing } = await pool.query(
        `SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2`,
        [orderId, req.user.id],
      );
      if (existing.length) {
        throw new AppError('REVIEW_EXISTS', 'You have already reviewed this order.', 409);
      }

      const revieweeId = isBuyer ? order.seller_id : order.buyer_id;
      const reviewerRole = isBuyer ? 'BUYER' : 'SELLER';

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO reviews (order_id, reviewer_id, reviewee_id, reviewer_role, rating, comment)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [orderId, req.user.id, revieweeId, reviewerRole, rating, comment?.trim() || null],
        );
        await refreshRatingAverages(client, revieweeId);
        await client.query('COMMIT');
        sendSuccess(res, await loadReview(rows[0].id), null, 201);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );
}
