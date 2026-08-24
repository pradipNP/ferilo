import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';
import { mapProduct, productSelect } from './products.js';

export function attachFavoriteRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/favorites/ids',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT f.product_id FROM favorites f
         JOIN products p ON p.id = f.product_id
         WHERE f.user_id = $1 AND p.status = 'ACTIVE'`,
        [req.user.id],
      );
      sendSuccess(res, rows.map((r) => r.product_id));
    }),
  );

  router.get(
    '/favorites',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT ${productSelect}, f.created_at AS favorited_at,
          (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
         FROM favorites f
         JOIN products p ON p.id = f.product_id
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
         LEFT JOIN user_profiles pr ON pr.user_id = p.seller_id
         WHERE f.user_id = $1 AND p.status = 'ACTIVE'
         ORDER BY f.created_at DESC`,
        [req.user.id],
      );

      const favorites = rows.map((row) => ({
        ...mapProduct(row, row.primary_image ? [{ url: row.primary_image, is_primary: true }] : []),
        favoritedAt: row.favorited_at,
      }));

      sendSuccess(res, favorites);
    }),
  );

  router.post(
    '/favorites/:productId',
    authenticate,
    validate(z.object({ params: z.object({ productId: z.string().uuid('Invalid product id.') }) })),
    asyncHandler(async (req, res) => {
      const { productId } = req.validated.params;

      const { rows } = await pool.query(
        `SELECT seller_id, status FROM products WHERE id = $1`,
        [productId],
      );
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      if (rows[0].status !== 'ACTIVE') {
        throw new AppError('PRODUCT_UNAVAILABLE', 'Only active listings can be saved.', 400);
      }
      if (rows[0].seller_id === req.user.id) {
        throw new AppError('CANNOT_FAVORITE_OWN', 'You cannot save your own listing.', 400);
      }

      await pool.query(
        `INSERT INTO favorites (user_id, product_id) VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO NOTHING`,
        [req.user.id, productId],
      );

      sendSuccess(res, { productId, favorited: true }, null, 201);
    }),
  );

  router.delete(
    '/favorites/:productId',
    authenticate,
    validate(z.object({ params: z.object({ productId: z.string().uuid('Invalid product id.') }) })),
    asyncHandler(async (req, res) => {
      const { productId } = req.validated.params;
      const result = await pool.query(
        `DELETE FROM favorites WHERE user_id = $1 AND product_id = $2`,
        [req.user.id, productId],
      );
      if (result.rowCount === 0) {
        throw new AppError('FAVORITE_NOT_FOUND', 'Favorite was not found.', 404);
      }
      sendSuccess(res, { productId, favorited: false });
    }),
  );
}
