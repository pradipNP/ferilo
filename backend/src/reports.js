import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';
import { notify } from './notifications.js';

const REPORT_CATEGORIES = [
  'SPAM',
  'SCAM',
  'INAPPROPRIATE',
  'COUNTERFEIT',
  'PROHIBITED_ITEM',
  'HARASSMENT',
  'MISLEADING',
  'OTHER',
];

const createReportSchema = z.object({
  targetType: z.enum(['USER', 'PRODUCT', 'MESSAGE', 'ORDER']),
  targetId: z.string().uuid('Invalid target id.'),
  category: z.enum(REPORT_CATEGORIES),
  description: z.string().trim().min(10, 'Please describe the issue (min 10 characters).').max(2000),
});

const resolveSchema = z.object({
  status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
  adminNotes: z.string().trim().max(2000).optional().nullable(),
});

function mapReport(row) {
  return {
    id: row.id,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    reporterEmail: row.reporter_email,
    targetType: row.target_type,
    targetId: row.target_id,
    category: row.category,
    description: row.description,
    status: row.status,
    adminNotes: row.admin_notes,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

async function assertTargetExists(targetType, targetId, AppError) {
  const tables = {
    USER: 'users',
    PRODUCT: 'products',
    MESSAGE: 'messages',
    ORDER: 'orders',
  };
  const table = tables[targetType];
  const { rows } = await pool.query(`SELECT id FROM ${table} WHERE id = $1`, [targetId]);
  if (!rows.length) throw new AppError('TARGET_NOT_FOUND', 'The reported item was not found.', 404);
}

export function attachReportRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.post(
    '/reports',
    authenticate,
    validate(z.object({ body: createReportSchema })),
    asyncHandler(async (req, res) => {
      const { targetType, targetId, category, description } = req.validated.body;
      await assertTargetExists(targetType, targetId, AppError);

      if (targetType === 'USER' && targetId === req.user.id) {
        throw new AppError('INVALID_REPORT', 'You cannot report yourself.', 400);
      }

      const { rows: recent } = await pool.query(
        `SELECT id FROM reports
         WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3
           AND status IN ('OPEN', 'UNDER_REVIEW')
           AND created_at > NOW() - INTERVAL '7 days'`,
        [req.user.id, targetType, targetId],
      );
      if (recent.length) {
        throw new AppError('REPORT_EXISTS', 'You already have an open report for this item.', 409);
      }

      const { rows } = await pool.query(
        `INSERT INTO reports (reporter_id, target_type, target_id, category, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, reporter_id, target_type, target_id, category, description, status,
           admin_notes, resolved_by, created_at, resolved_at`,
        [req.user.id, targetType, targetId, category, description],
      );

      sendSuccess(res, mapReport(rows[0]), null, 201);
    }),
  );

  router.get(
    '/reports/mine',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT id, reporter_id, target_type, target_id, category, description, status,
           admin_notes, resolved_by, created_at, resolved_at
         FROM reports WHERE reporter_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapReport));
    }),
  );
}

export function attachAdminReportRoutes(router, {
  asyncHandler, validate, sendSuccess, AppError, authenticate, requireAdmin,
}) {
  router.get(
    '/admin/reports',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const status = req.query.status || 'OPEN';
      const values = [];
      let where = '';
      if (status !== 'ALL') {
        values.push(status);
        where = `WHERE r.status = $${values.length}`;
      }
      const { rows } = await pool.query(
        `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.category, r.description,
           r.status, r.admin_notes, r.resolved_by, r.created_at, r.resolved_at,
           pr.display_name AS reporter_name, u.email AS reporter_email
         FROM reports r
         JOIN users u ON u.id = r.reporter_id
         LEFT JOIN user_profiles pr ON pr.user_id = r.reporter_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT 100`,
        values,
      );
      sendSuccess(res, rows.map(mapReport));
    }),
  );

  router.patch(
    '/admin/reports/:id',
    authenticate,
    requireAdmin,
    validate(z.object({
      params: z.object({ id: z.string().uuid() }),
      body: resolveSchema,
    })),
    asyncHandler(async (req, res) => {
      const { id } = req.validated.params;
      const { status, adminNotes } = req.validated.body;

      const { rows } = await pool.query(
        `UPDATE reports SET
           status = $1,
           admin_notes = COALESCE($2, admin_notes),
           resolved_by = $3,
           resolved_at = CASE WHEN $1 IN ('RESOLVED', 'DISMISSED') THEN NOW() ELSE resolved_at END
         WHERE id = $4
         RETURNING id, reporter_id, target_type, target_id, category, description, status,
           admin_notes, resolved_by, created_at, resolved_at`,
        [status, adminNotes?.trim() || null, req.user.id, id],
      );
      if (!rows.length) throw new AppError('REPORT_NOT_FOUND', 'Report was not found.', 404);

      await pool.query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
         VALUES ($1, 'REPORT_UPDATED', 'report', $2, $3)`,
        [req.user.id, id, JSON.stringify({ status, adminNotes: adminNotes || null })],
      );

      if (['RESOLVED', 'DISMISSED'].includes(status)) {
        await notify(null, {
          userId: rows[0].reporter_id,
          type: 'REPORT_UPDATE',
          title: status === 'RESOLVED' ? 'Your report was resolved' : 'Your report was dismissed',
          body: adminNotes?.trim()
            ? `Update on your ${rows[0].category.toLowerCase()} report: ${adminNotes.trim()}`
            : `Your report about a ${rows[0].target_type.toLowerCase()} was marked ${status.toLowerCase()}.`,
          link: '/app/reports',
        });
      }

      sendSuccess(res, mapReport(rows[0]));
    }),
  );
}

export { REPORT_CATEGORIES };
