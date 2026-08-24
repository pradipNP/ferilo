import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate, createRequireRole } from './auth.js';
import { notify } from './notifications.js';
import { attachAdminReportRoutes } from './reports.js';

async function audit(actorId, action, entityType, entityId, metadata = null) {
  await pool.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, action, entityType, entityId, metadata ? JSON.stringify(metadata) : null],
  );
}

export function attachAdminRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);
  const requireAdmin = createRequireRole(AppError)('ADMIN');

  attachAdminReportRoutes(router, {
    asyncHandler,
    validate,
    sendSuccess,
    AppError,
    authenticate,
    requireAdmin,
  });

  router.get(
    '/admin/stats',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const [users, products, orders, reports, verifications] = await Promise.all([
        pool.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE account_status = 'ACTIVE')::int AS active,
          COUNT(*) FILTER (WHERE account_status = 'SUSPENDED')::int AS suspended,
          COUNT(*) FILTER (WHERE verification_status = 'VERIFIED')::int AS verified
          FROM users`),
        pool.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
          COUNT(*) FILTER (WHERE status = 'PENDING_REVIEW')::int AS pending_review,
          COUNT(*) FILTER (WHERE status = 'REMOVED')::int AS removed
          FROM products`),
        pool.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled
          FROM orders`),
        pool.query(`SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status IN ('OPEN', 'UNDER_REVIEW'))::int AS open
          FROM reports`),
        pool.query(`SELECT COUNT(*)::int AS pending
          FROM identity_verifications
          WHERE status IN ('PENDING', 'UNDER_REVIEW')`),
      ]);

      sendSuccess(res, {
        users: users.rows[0],
        products: products.rows[0],
        orders: orders.rows[0],
        reports: reports.rows[0],
        verifications: verifications.rows[0],
      });
    }),
  );

  router.get(
    '/admin/users',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const q = (req.query.q || '').trim();
      const values = [];
      let where = `WHERE u.account_status <> 'DELETED'`;
      if (q) {
        values.push(`%${q}%`);
        where += ` AND (u.email ILIKE $1 OR pr.display_name ILIKE $1)`;
      }
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.role, u.verification_status, u.account_status, u.created_at,
           pr.display_name, pr.city, pr.seller_rating_avg, pr.buyer_rating_avg,
           pr.total_sales, pr.total_purchases
         FROM users u
         LEFT JOIN user_profiles pr ON pr.user_id = u.id
         ${where}
         ORDER BY u.created_at DESC
         LIMIT 100`,
        values,
      );
      sendSuccess(res, rows.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        verificationStatus: u.verification_status,
        accountStatus: u.account_status,
        displayName: u.display_name,
        city: u.city,
        sellerRatingAvg: u.seller_rating_avg,
        buyerRatingAvg: u.buyer_rating_avg,
        totalSales: u.total_sales,
        totalPurchases: u.total_purchases,
        createdAt: u.created_at,
      })));
    }),
  );

  router.patch(
    '/admin/users/:id/status',
    authenticate,
    requireAdmin,
    validate(z.object({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        accountStatus: z.enum(['ACTIVE', 'SUSPENDED']),
        reason: z.string().trim().min(3).max(500).optional().nullable(),
      }),
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.validated.params;
      const { accountStatus, reason } = req.validated.body;
      if (id === req.user.id) {
        throw new AppError('INVALID_ACTION', 'You cannot change your own account status.', 400);
      }

      const { rows } = await pool.query(
        `UPDATE users SET account_status = $1, token_version = token_version + 1, updated_at = NOW()
         WHERE id = $2 AND role <> 'ADMIN'
         RETURNING id, email, account_status, verification_status, role`,
        [accountStatus, id],
      );
      if (!rows.length) throw new AppError('USER_NOT_FOUND', 'User was not found or cannot be modified.', 404);

      await audit(req.user.id, accountStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', 'user', id, {
        reason: reason || null,
      });

      await notify(null, {
        userId: id,
        type: accountStatus === 'SUSPENDED' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_REACTIVATED',
        title: accountStatus === 'SUSPENDED' ? 'Account suspended' : 'Account reactivated',
        body: accountStatus === 'SUSPENDED'
          ? `Your FERILO account was suspended.${reason ? ` Reason: ${reason}` : ''}`
          : 'Your FERILO account is active again.',
        link: '/app/dashboard',
      });

      sendSuccess(res, {
        id: rows[0].id,
        email: rows[0].email,
        accountStatus: rows[0].account_status,
        verificationStatus: rows[0].verification_status,
        role: rows[0].role,
      });
    }),
  );

  router.get(
    '/admin/products',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const status = req.query.status || 'ACTIVE';
      const values = [];
      let where = '';
      if (status !== 'ALL') {
        values.push(status);
        where = `WHERE p.status = $${values.length}`;
      }
      const { rows } = await pool.query(
        `SELECT p.id, p.title, p.price, p.status, p.city, p.created_at, p.published_at,
           pr.display_name AS seller_name, u.email AS seller_email, p.seller_id
         FROM products p
         JOIN users u ON u.id = p.seller_id
         LEFT JOIN user_profiles pr ON pr.user_id = p.seller_id
         ${where}
         ORDER BY p.created_at DESC
         LIMIT 100`,
        values,
      );
      sendSuccess(res, rows.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        status: p.status,
        city: p.city,
        sellerId: p.seller_id,
        sellerName: p.seller_name,
        sellerEmail: p.seller_email,
        createdAt: p.created_at,
        publishedAt: p.published_at,
      })));
    }),
  );

  router.patch(
    '/admin/products/:id/status',
    authenticate,
    requireAdmin,
    validate(z.object({
      params: z.object({ id: z.string().uuid() }),
      body: z.object({
        status: z.enum(['ACTIVE', 'REMOVED', 'REJECTED']),
        reason: z.string().trim().min(3).max(500).optional().nullable(),
      }),
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.validated.params;
      const { status, reason } = req.validated.body;

      const { rows } = await pool.query(
        `UPDATE products SET status = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, status, seller_id`,
        [status, id],
      );
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);

      await audit(req.user.id, 'PRODUCT_STATUS_CHANGED', 'product', id, { status, reason: reason || null });

      if (['REMOVED', 'REJECTED'].includes(status)) {
        await notify(null, {
          userId: rows[0].seller_id,
          type: 'LISTING_MODERATED',
          title: status === 'REMOVED' ? 'Listing removed' : 'Listing rejected',
          body: `"${rows[0].title}" was ${status.toLowerCase()} by moderation.${reason ? ` Reason: ${reason}` : ''}`,
          link: '/app/listings',
        });
      }

      sendSuccess(res, {
        id: rows[0].id,
        title: rows[0].title,
        status: rows[0].status,
      });
    }),
  );

  router.get(
    '/admin/orders',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT o.id, o.order_number, o.status, o.fulfillment_type, o.total_amount, o.created_at,
           p.title AS product_title,
           bp.display_name AS buyer_name, sp.display_name AS seller_name
         FROM orders o
         JOIN products p ON p.id = o.product_id
         LEFT JOIN user_profiles bp ON bp.user_id = o.buyer_id
         LEFT JOIN user_profiles sp ON sp.user_id = o.seller_id
         ORDER BY o.created_at DESC
         LIMIT 50`,
      );
      sendSuccess(res, rows.map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        fulfillmentType: o.fulfillment_type,
        totalAmount: o.total_amount,
        productTitle: o.product_title,
        buyerName: o.buyer_name,
        sellerName: o.seller_name,
        createdAt: o.created_at,
      })));
    }),
  );
}
