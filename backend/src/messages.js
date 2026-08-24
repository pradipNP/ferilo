import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate } from './auth.js';

const messageBodySchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty.').max(5000),
});

const startConversationSchema = z.object({
  productId: z.string().uuid('Invalid product id.'),
  otherUserId: z.string().uuid('Invalid user id.').optional(),
});

function mapMessage(row, currentUserId) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    isMine: row.sender_id === currentUserId,
    senderName: row.sender_name,
  };
}

function mapConversation(row) {
  return {
    id: row.id,
    productId: row.product_id,
    productTitle: row.product_title,
    createdAt: row.created_at,
    otherUser: {
      id: row.other_user_id,
      displayName: row.other_user_name || 'User',
    },
    lastMessage: row.last_message_body
      ? {
          body: row.last_message_body,
          createdAt: row.last_message_at,
          senderId: row.last_message_sender_id,
        }
      : null,
    unreadCount: row.unread_count,
  };
}

async function assertParticipant(conversationId, userId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM conversation_participants
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  if (!rows.length) return false;
  return true;
}

async function findExistingConversation(productId, userA, userB) {
  const { rows } = await pool.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $2
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $3
     WHERE c.product_id = $1
     LIMIT 1`,
    [productId, userA, userB],
  );
  return rows[0]?.id || null;
}

async function loadConversation(conversationId, userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.product_id, c.created_at, p.title AS product_title,
      ou.id AS other_user_id, op.display_name AS other_user_name,
      lm.body AS last_message_body, lm.created_at AS last_message_at, lm.sender_id AS last_message_sender_id,
      (
        SELECT COUNT(*)::int FROM messages m
        WHERE m.conversation_id = c.id AND m.is_deleted = false
          AND m.sender_id != $2
          AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
      ) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $2
     JOIN conversation_participants ocp ON ocp.conversation_id = c.id AND ocp.user_id != $2
     JOIN users ou ON ou.id = ocp.user_id
     LEFT JOIN user_profiles op ON op.user_id = ou.id
     LEFT JOIN products p ON p.id = c.product_id
     LEFT JOIN LATERAL (
       SELECT body, created_at, sender_id FROM messages
       WHERE conversation_id = c.id AND is_deleted = false
       ORDER BY created_at DESC LIMIT 1
     ) lm ON true
     WHERE c.id = $1`,
    [conversationId, userId],
  );
  return rows.length ? mapConversation(rows[0]) : null;
}

export function attachMessagingRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);

  router.get(
    '/conversations',
    authenticate,
    asyncHandler(async (req, res) => {
      const { rows } = await pool.query(
        `SELECT c.id, c.product_id, c.created_at, p.title AS product_title,
          ou.id AS other_user_id, op.display_name AS other_user_name,
          lm.body AS last_message_body, lm.created_at AS last_message_at, lm.sender_id AS last_message_sender_id,
          (
            SELECT COUNT(*)::int FROM messages m
            WHERE m.conversation_id = c.id AND m.is_deleted = false
              AND m.sender_id != $1
              AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
          ) AS unread_count
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
         JOIN conversation_participants ocp ON ocp.conversation_id = c.id AND ocp.user_id != $1
         JOIN users ou ON ou.id = ocp.user_id
         LEFT JOIN user_profiles op ON op.user_id = ou.id
         LEFT JOIN products p ON p.id = c.product_id
         LEFT JOIN LATERAL (
           SELECT body, created_at, sender_id FROM messages
           WHERE conversation_id = c.id AND is_deleted = false
           ORDER BY created_at DESC LIMIT 1
         ) lm ON true
         ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
        [req.user.id],
      );
      sendSuccess(res, rows.map(mapConversation));
    }),
  );

  router.post(
    '/conversations',
    authenticate,
    validate(z.object({ body: startConversationSchema })),
    asyncHandler(async (req, res) => {
      const { productId, otherUserId } = req.validated.body;

      const { rows: products } = await pool.query(
        `SELECT id, seller_id, status, title FROM products WHERE id = $1`,
        [productId],
      );
      if (!products.length) throw new AppError('PRODUCT_NOT_FOUND', 'Product was not found.', 404);
      const product = products[0];
      if (product.status !== 'ACTIVE') {
        throw new AppError('PRODUCT_UNAVAILABLE', 'This listing is not available for messaging.', 400);
      }

      let otherId;
      if (req.user.id === product.seller_id) {
        if (!otherUserId) {
          throw new AppError('OTHER_USER_REQUIRED', 'Buyer id is required for seller messages.', 400);
        }
        if (otherUserId === req.user.id) {
          throw new AppError('INVALID_PARTICIPANT', 'Cannot message yourself.', 400);
        }
        otherId = otherUserId;
      } else {
        otherId = product.seller_id;
        if (otherUserId && otherUserId !== otherId) {
          throw new AppError('INVALID_PARTICIPANT', 'Invalid conversation participant.', 400);
        }
      }

      let conversationId = await findExistingConversation(productId, req.user.id, otherId);
      if (!conversationId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const { rows } = await client.query(
            `INSERT INTO conversations (product_id) VALUES ($1) RETURNING id`,
            [productId],
          );
          conversationId = rows[0].id;
          await client.query(
            `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
            [conversationId, req.user.id, otherId],
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }

      sendSuccess(res, await loadConversation(conversationId, req.user.id), null, 201);
    }),
  );

  router.get(
    '/conversations/:id',
    authenticate,
    asyncHandler(async (req, res) => {
      const conversation = await loadConversation(req.params.id, req.user.id);
      if (!conversation) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation was not found.', 404);

      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '100', 10)));
      const { rows } = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, pr.display_name AS sender_name
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN user_profiles pr ON pr.user_id = m.sender_id
         WHERE m.conversation_id = $1 AND m.is_deleted = false
         ORDER BY m.created_at ASC
         LIMIT $2`,
        [req.params.id, limit],
      );

      sendSuccess(res, {
        conversation,
        messages: rows.map((row) => mapMessage(row, req.user.id)),
      });
    }),
  );

  router.post(
    '/conversations/:id/messages',
    authenticate,
    validate(z.object({ body: messageBodySchema })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const isParticipant = await assertParticipant(id, req.user.id);
      if (!isParticipant) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation was not found.', 404);

      const { body } = req.validated.body;
      const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, body)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [id, req.user.id, body],
      );

      await pool.query(
        `UPDATE conversation_participants SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [id, req.user.id],
      );

      const { rows: messageRows } = await pool.query(
        `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at, pr.display_name AS sender_name
         FROM messages m
         LEFT JOIN user_profiles pr ON pr.user_id = m.sender_id
         WHERE m.id = $1`,
        [rows[0].id],
      );

      sendSuccess(res, mapMessage(messageRows[0], req.user.id), null, 201);
    }),
  );

  router.patch(
    '/conversations/:id/read',
    authenticate,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const isParticipant = await assertParticipant(id, req.user.id);
      if (!isParticipant) throw new AppError('CONVERSATION_NOT_FOUND', 'Conversation was not found.', 404);

      await pool.query(
        `UPDATE conversation_participants SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [id, req.user.id],
      );

      sendSuccess(res, { read: true });
    }),
  );
}
