import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const productImageDir = path.resolve(projectRoot, process.env.PRODUCT_IMAGE_DIR || 'uploads/products');
const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '8', 10);
const maxImageMb = parseInt(process.env.MAX_IMAGE_SIZE_MB || '5', 10);
const allowedImageMime = new Set(['image/jpeg', 'image/png', 'image/webp']);

fs.mkdirSync(productImageDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join(productImageDir, req.productId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: maxImageMb * 1024 * 1024, files: maxImages },
  fileFilter: (_req, file, cb) => {
    if (allowedImageMime.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
  },
});

const productBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  categoryId: z.coerce.number().int().positive(),
  subcategoryId: z.coerce.number().int().positive().optional().nullable(),
  condition: z.enum(['NEW_LIKE', 'GOOD', 'FAIR', 'POOR']),
  price: z.coerce.number().min(0),
  isNegotiable: z.boolean().optional(),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  purchaseYear: z.coerce.number().int().min(1970).max(2100).optional().nullable(),
  deliverySizeTier: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']).optional(),
  deliveryEligible: z.boolean().optional(),
  requiresTrolley: z.boolean().optional(),
  meetupAvailable: z.boolean().optional(),
  city: z.string().min(1).max(100),
  district: z.string().min(1).max(100),
});

function mapProduct(row, images = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    categoryName: row.category_name,
    condition: row.condition,
    price: row.price,
    currency: row.currency,
    isNegotiable: row.is_negotiable,
    brand: row.brand,
    model: row.model,
    purchaseYear: row.purchase_year,
    deliverySizeTier: row.delivery_size_tier,
    deliveryEligible: row.delivery_eligible,
    requiresTrolley: row.requires_trolley,
    meetupAvailable: row.meetup_available,
    city: row.city,
    district: row.district,
    status: row.status,
    viewCount: row.view_count,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    seller: row.seller_id
      ? {
          id: row.seller_id,
          displayName: row.seller_name,
          verificationStatus: row.seller_verification,
          sellerRatingAvg: row.seller_rating_avg,
        }
      : undefined,
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.is_primary,
      sortOrder: img.sort_order,
    })),
  };
}

const productSelect = `
  p.id, p.seller_id, p.category_id, p.subcategory_id, p.title, p.description,
  p.condition, p.price, p.currency, p.is_negotiable, p.brand, p.model, p.purchase_year,
  p.delivery_size_tier, p.delivery_eligible, p.requires_trolley, p.meetup_available,
  p.city, p.district, p.status, p.view_count, p.published_at, p.created_at,
  c.name AS category_name,
  pr.display_name AS seller_name, u.verification_status AS seller_verification,
  pr.seller_rating_avg
`;

async function getProductImages(productId) {
  const { rows } = await pool.query(
    `SELECT id, url, is_primary, sort_order FROM product_images
     WHERE product_id = $1 ORDER BY is_primary DESC, sort_order ASC`,
    [productId],
  );
  return rows;
}

async function loadProduct(productId, { requestUserId = null } = {}) {
  const values = [productId];
  let accessFilter = `AND p.status = 'ACTIVE'`;
  if (requestUserId) {
    values.push(requestUserId);
    accessFilter = `AND (p.status = 'ACTIVE' OR (p.seller_id = $2 AND p.status != 'REMOVED'))`;
  }

  const { rows } = await pool.query(
    `SELECT ${productSelect}
     FROM products p
     JOIN categories c ON c.id = p.category_id
     JOIN users u ON u.id = p.seller_id
     LEFT JOIN user_profiles pr ON pr.user_id = p.seller_id
     WHERE p.id = $1 ${accessFilter}`,
    values,
  );
  if (!rows.length) return null;
  const images = await getProductImages(productId);
  return mapProduct(rows[0], images);
}

function requireVerified(AppError) {
  return (req, _res, next) => {
    if (req.user.role === 'ADMIN') return next();
    if (req.user.verification_status !== 'VERIFIED') {
      return next(new AppError('NOT_VERIFIED', 'Identity verification is required to manage listings.', 403));
    }
    next();
  };
}

export function attachProductRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);
  const verified = requireVerified(AppError);

  router.get(
    '/products',
    asyncHandler(async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
      const city = req.query.city?.trim();

      const conditions = [`p.status = 'ACTIVE'`];
      const values = [];
      let idx = 1;

      if (categoryId) {
        conditions.push(`(p.category_id = $${idx} OR p.subcategory_id = $${idx})`);
        values.push(categoryId);
        idx++;
      }
      if (city) {
        conditions.push(`p.city ILIKE $${idx}`);
        values.push(`%${city}%`);
        idx++;
      }

      const where = conditions.join(' AND ');
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`,
        values,
      );

      values.push(limit, offset);
      const { rows } = await pool.query(
        `SELECT ${productSelect},
          (SELECT url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) AS primary_image
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
         LEFT JOIN user_profiles pr ON pr.user_id = p.seller_id
         WHERE ${where}
         ORDER BY p.published_at DESC NULLS LAST, p.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        values,
      );

      const products = rows.map((row) => ({
        ...mapProduct(row, row.primary_image ? [{ url: row.primary_image, is_primary: true }] : []),
      }));

      sendSuccess(res, products, {
        page,
        limit,
        total: countResult.rows[0].total,
      });
    }),
  );

  router.get(
    '/products/mine',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT ${productSelect}
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
         LEFT JOIN user_profiles pr ON pr.user_id = p.seller_id
         WHERE p.seller_id = $1 AND p.status != 'REMOVED'
         ORDER BY p.updated_at DESC`,
        [req.user.id],
      );
      const products = await Promise.all(
        rows.map(async (row) => mapProduct(row, await getProductImages(row.id))),
      );
      sendSuccess(res, products);
    }),
  );

  router.get(
    '/products/mine/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const product = await loadProduct(req.params.id, { requestUserId: req.user.id });
      if (!product || product.seller?.id !== req.user.id) {
        throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      }
      sendSuccess(res, product);
    }),
  );

  router.get(
    '/products/:id',
    asyncHandler(async (req, res) => {
      const product = await loadProduct(req.params.id);
      if (!product) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      await pool.query(`UPDATE products SET view_count = view_count + 1 WHERE id = $1`, [req.params.id]);
      sendSuccess(res, product);
    }),
  );

  router.post(
    '/products',
    authenticate,
    verified,
    validate(z.object({ body: productBodySchema })),
    asyncHandler(async (req, res) => {
      const b = req.validated.body;
      const { rows } = await pool.query(
        `INSERT INTO products (
          seller_id, category_id, subcategory_id, title, description, condition, price,
          is_negotiable, brand, model, purchase_year, delivery_size_tier, delivery_eligible,
          requires_trolley, meetup_available, city, district, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'DRAFT')
        RETURNING id`,
        [
          req.user.id, b.categoryId, b.subcategoryId || null, b.title.trim(), b.description.trim(),
          b.condition, b.price, b.isNegotiable ?? true, b.brand || null, b.model || null,
          b.purchaseYear || null, b.deliverySizeTier || 'SMALL', b.deliveryEligible ?? true,
          b.requiresTrolley ?? false, b.meetupAvailable ?? true, b.city.trim(), b.district.trim(),
        ],
      );
      const product = await loadProduct(rows[0].id, { requestUserId: req.user.id });
      sendSuccess(res, product, null, 201);
    }),
  );

  router.patch(
    '/products/:id',
    authenticate,
    validate(z.object({ params: z.object({ id: z.string().uuid() }), body: productBodySchema.partial() })),
    asyncHandler(async (req, res) => {
      const { id } = req.validated.params;
      const { rows } = await pool.query(`SELECT seller_id, status FROM products WHERE id = $1`, [id]);
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      if (rows[0].seller_id !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('FORBIDDEN', 'You can only edit your own listings.', 403);
      }
      if (['SOLD', 'REMOVED'].includes(rows[0].status)) {
        throw new AppError('INVALID_STATUS', 'This listing cannot be edited.', 400);
      }

      const b = req.validated.body;
      const fieldMap = {
        title: 'title', description: 'description', categoryId: 'category_id',
        subcategoryId: 'subcategory_id', condition: 'condition', price: 'price',
        isNegotiable: 'is_negotiable', brand: 'brand', model: 'model',
        purchaseYear: 'purchase_year', deliverySizeTier: 'delivery_size_tier',
        deliveryEligible: 'delivery_eligible', requiresTrolley: 'requires_trolley',
        meetupAvailable: 'meetup_available', city: 'city', district: 'district',
      };

      const sets = [];
      const values = [];
      let i = 1;
      for (const [key, col] of Object.entries(fieldMap)) {
        if (b[key] !== undefined) {
          sets.push(`${col} = $${i++}`);
          values.push(b[key]);
        }
      }
      if (!sets.length) throw new AppError('VALIDATION_ERROR', 'No fields to update.', 400);
      sets.push(`updated_at = NOW()`);
      values.push(id);

      await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = $${i}`, values);
      sendSuccess(res, await loadProduct(id, { requestUserId: req.user.id }));
    }),
  );

  router.post(
    '/products/:id/publish',
    authenticate,
    verified,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { rows } = await pool.query(
        `SELECT seller_id, status FROM products WHERE id = $1`,
        [id],
      );
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      if (rows[0].seller_id !== req.user.id) throw new AppError('FORBIDDEN', 'Not your listing.', 403);
      if (!['DRAFT', 'REJECTED'].includes(rows[0].status)) {
        throw new AppError('INVALID_STATUS', 'Only draft listings can be published.', 400);
      }

      const imgCount = await pool.query(
        `SELECT COUNT(*)::int AS c FROM product_images WHERE product_id = $1`,
        [id],
      );
      if (imgCount.rows[0].c < 1) {
        throw new AppError('IMAGES_REQUIRED', 'Add at least one image before publishing.', 400);
      }

      await pool.query(
        `UPDATE products SET status = 'ACTIVE', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );
      sendSuccess(res, await loadProduct(id, { requestUserId: req.user.id }));
    }),
  );

  router.delete(
    '/products/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { rows } = await pool.query(`SELECT seller_id FROM products WHERE id = $1`, [id]);
      if (!rows.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      if (rows[0].seller_id !== req.user.id && req.user.role !== 'ADMIN') {
        throw new AppError('FORBIDDEN', 'Not your listing.', 403);
      }
      await pool.query(
        `UPDATE products SET status = 'REMOVED', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      sendSuccess(res, { message: 'Listing removed.' });
    }),
  );

  router.post(
    '/products/:id/images',
    authenticate,
    asyncHandler(async (req, res, next) => {
      const { id } = req.params;
      const { rows } = await pool.query(`SELECT seller_id, status FROM products WHERE id = $1`, [id]);
      if (!rows.length) return next(new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404));
      if (rows[0].seller_id !== req.user.id) return next(new AppError('FORBIDDEN', 'Not your listing.', 403));
      if (['SOLD', 'REMOVED'].includes(rows[0].status)) {
        return next(new AppError('INVALID_STATUS', 'Cannot add images to this listing.', 400));
      }

      req.productId = id;
      imageUpload.array('images', maxImages)(req, res, async (err) => {
        if (err) return next(err);
        if (!req.files?.length) return next(new AppError('VALIDATION_ERROR', 'At least one image is required.', 400));

        try {
          const countResult = await pool.query(
            `SELECT COUNT(*)::int AS c FROM product_images WHERE product_id = $1`,
            [id],
          );
          if (countResult.rows[0].c + req.files.length > maxImages) {
            throw new AppError('TOO_MANY_IMAGES', `Maximum ${maxImages} images per listing.`, 400);
          }

          const hasPrimary = countResult.rows[0].c > 0;
          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const storageKey = path.relative(projectRoot, file.path);
            const url = `/uploads/products/${id}/${path.basename(file.path)}`;
            const isPrimary = !hasPrimary && i === 0;
            await pool.query(
              `INSERT INTO product_images (product_id, url, storage_key, is_primary, sort_order)
               VALUES ($1, $2, $3, $4, $5)`,
              [id, url, storageKey, isPrimary, countResult.rows[0].c + i],
            );
          }
          sendSuccess(res, await loadProduct(id, { requestUserId: req.user.id }));
        } catch (e) {
          next(e);
        }
      });
    }),
  );

  router.delete(
    '/products/:id/images/:imageId',
    authenticate,
    asyncHandler(async (req, res) => {
      const { id, imageId } = req.params;
      const { rows } = await pool.query(
        `SELECT pi.storage_key, p.seller_id FROM product_images pi
         JOIN products p ON p.id = pi.product_id
         WHERE pi.id = $1 AND pi.product_id = $2`,
        [imageId, id],
      );
      if (!rows.length) throw new AppError('NOT_FOUND', 'Image not found.', 404);
      if (rows[0].seller_id !== req.user.id) throw new AppError('FORBIDDEN', 'Not your listing.', 403);

      const filePath = path.resolve(projectRoot, rows[0].storage_key);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await pool.query(`DELETE FROM product_images WHERE id = $1`, [imageId]);
      sendSuccess(res, { message: 'Image deleted.' });
    }),
  );
}

export { productImageDir };
