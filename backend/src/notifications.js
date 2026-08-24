import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;

const listQuerySchema = z.object({
  unreadOnly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
});

const idParams = z.object({ id: z.string().uuid('Invalid notification id.') });

function mapNotification(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.payload?.link ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export function formatNpr(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-NP')}`;
}

async function insertNotification(executor, { userId, type, title, body, link }) {
  await executor.query(
    `INSERT INTO notifications (user_id, type, title, body, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, link ? JSON.stringify({ link }) : null],
  );
}

/**
 * Records a notification. Pass a transaction client to tie it to the caller's
 * transaction; pass null for best-effort delivery that never fails the action
 * that triggered it.
 */
export async function notify(client, notification) {
  if (!notification.userId) return;
  if (client) {
    await insertNotification(client, notification);
    return;
  }
  try {
    await insertNotification(pool, notification);
  } catch {
    // Best-effort: a failed notification must not break the user's action.
  }
}

async function countUnread(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId],
  );
  return rows[0].count;
}

export function attachNotificationRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/notifications',
    authenticate,
    validate(z.object({ query: listQuerySchema })),
    asyncHandler(async (req, res) => {
      const { unreadOnly, limit } = req.validated.query;
      const { rows } = await pool.query(
        `SELECT id, type, title, body, payload, is_read, created_at
         FROM notifications
         WHERE user_id = $1
           AND ($2::boolean IS NOT TRUE OR is_read = false)
         ORDER BY created_at DESC
         LIMIT $3`,
        [req.user.id, unreadOnly === 'true', limit ?? DEFAULT_LIMIT],
      );

      sendSuccess(res, {
        notifications: rows.map(mapNotification),
        unreadCount: await countUnread(req.user.id),
      });
    }),
  );

  router.get(
    '/notifications/unread-count',
    authenticate,
    asyncHandler(async (req, res) => {
      sendSuccess(res, { unreadCount: await countUnread(req.user.id) });
    }),
  );

  router.patch(
    '/notifications/read-all',
    authenticate,
    asyncHandler(async (req, res) => {
      await pool.query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
        [req.user.id],
      );
      sendSuccess(res, { unreadCount: 0 });
    }),
  );

  router.patch(
    '/notifications/:id/read',
    authenticate,
    validate(z.object({ params: idParams })),
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `UPDATE notifications SET is_read = true
         WHERE id = $1 AND user_id = $2
         RETURNING id, type, title, body, payload, is_read, created_at`,
        [req.validated.params.id, req.user.id],
      );
      if (!rows.length) {
        throw new AppError('NOTIFICATION_NOT_FOUND', 'Notification was not found.', 404);
      }
      sendSuccess(res, {
        notification: mapNotification(rows[0]),
        unreadCount: await countUnread(req.user.id),
      });
    }),
  );
}
