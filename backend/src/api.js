import express from 'express';
import { z } from 'zod';
import { pool, testConnection } from './db.js';
import { attachAuthRoutes } from './auth.js';
import { attachProfileRoutes, multerErrorHandler } from './profile.js';
import { attachProductRoutes } from './products.js';
import { attachFavoriteRoutes } from './favorites.js';
import { attachOfferRoutes } from './offers.js';
import { attachMessagingRoutes } from './messages.js';
import { attachOrderRoutes } from './orders.js';

// ─── Errors & response helpers ─────────────────────────────
export class AppError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export function sendSuccess(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      return next(new AppError('VALIDATION_ERROR', message, 400));
    }
    req.validated = result.data;
    next();
  };
}

// ─── v1 routes ───────────────────────────────────────────────
export function createApiRouter() {
  const router = express.Router();

  router.get(
    '/health',
    asyncHandler(async (_req, res) => {
      let dbStatus = 'disconnected';
      try {
        await testConnection();
        dbStatus = 'connected';
      } catch {
        dbStatus = 'disconnected';
      }

      sendSuccess(res, {
        status: 'ok',
        service: 'ferilo-api',
        version: '1',
        database: dbStatus,
        hint:
          dbStatus === 'disconnected'
            ? 'Start PostgreSQL and run npm run db:setup for categories and other data routes.'
            : undefined,
        timestamp: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/categories',
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT id, parent_id, name, slug, icon, sort_order
         FROM categories
         WHERE is_active = true
         ORDER BY sort_order, name`,
      );
      sendSuccess(res, rows);
    }),
  );

  router.get(
    '/categories/:slug',
    validate(
      z.object({
        params: z.object({ slug: z.string().min(1, 'Slug is required.') }),
      }),
    ),
    asyncHandler(async (req, res) => {
      const { slug } = req.validated.params;
      const { rows } = await pool.query(
        `SELECT id, parent_id, name, slug, icon, sort_order
         FROM categories
         WHERE slug = $1 AND is_active = true`,
        [slug],
      );
      if (!rows.length) throw new AppError('CATEGORY_NOT_FOUND', 'Category was not found.', 404);
      sendSuccess(res, rows[0]);
    }),
  );

  attachAuthRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachProfileRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachProductRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachFavoriteRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachOfferRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachMessagingRoutes(router, { asyncHandler, validate, sendSuccess, AppError });
  attachOrderRoutes(router, { asyncHandler, validate, sendSuccess, AppError });

  return router;
}

export { multerErrorHandler };

// ─── Global middleware ───────────────────────────────────────
export function notFoundHandler(_req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
  });
}

export function errorHandler(err, req, res, _next, { logger, isProduction }) {
  if (res.headersSent) return;

  let status = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // PostgreSQL / connection errors
  if (err.code === '23505') {
    status = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists.';
  } else if (err.code === '23503') {
    status = 400;
    code = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist.';
  } else if (err.code === '42P01') {
    status = 503;
    code = 'SCHEMA_NOT_READY';
    message = 'Database tables are missing. Run: npm run db:setup';
  } else if (err.code === '3D000') {
    status = 503;
    code = 'DATABASE_NOT_FOUND';
    message = 'Database "ferilo" does not exist. Create it in PostgreSQL first.';
  } else if (err.code === '28P01') {
    status = 503;
    code = 'DATABASE_AUTH_FAILED';
    message = 'Database login failed. Check DATABASE_URL in .env';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    status = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'PostgreSQL is not running. Start PostgreSQL, then run: npm run db:setup';
  }

  if (!err.isOperational) {
    logger.error({ err, url: req.originalUrl, method: req.method }, message);
  }

  if (isProduction && status === 500 && !err.isOperational) {
    message = 'An unexpected error occurred.';
  }

  res.status(status).json({ success: false, error: { code, message } });
}
