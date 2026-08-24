import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { z } from 'zod';
import { pool } from './db.js';
import { createAuthenticate, createRequireRole } from './auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');
const identityDir = path.resolve(projectRoot, process.env.IDENTITY_DOC_DIR || 'uploads/identity');
const maxDocMb = parseInt(process.env.MAX_ID_DOC_SIZE_MB || '10', 10);
const allowedMime = new Set(['image/jpeg', 'image/png', 'application/pdf']);

fs.mkdirSync(identityDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const userDir = path.join(identityDir, req.user.id);
      fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: maxDocMb * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (allowedMime.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and PDF files are allowed.'));
  },
});

const profileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).max(100).optional(),
    phone: z.string().max(20).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    district: z.string().max(100).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
  }),
});

const submitFieldsSchema = z.object({
  body: z.object({
    documentType: z.enum(['CITIZENSHIP', 'PASSPORT', 'DRIVING_LICENSE']),
  }),
});

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    verificationStatus: row.verification_status,
    accountStatus: row.account_status,
    displayName: row.display_name,
    phone: row.phone,
    city: row.city,
    district: row.district,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    buyerRatingAvg: row.buyer_rating_avg,
    sellerRatingAvg: row.seller_rating_avg,
  };
}

async function getFullProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.verification_status, u.account_status,
            p.display_name, p.phone, p.city, p.district, p.bio, p.avatar_url,
            p.buyer_rating_avg, p.seller_rating_avg
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return rows[0] || null;
}

async function getVerificationStatus(userId) {
  const { rows } = await pool.query(
    `SELECT id, status, document_type, submitted_at, reviewed_at, rejection_reason
     FROM identity_verifications
     WHERE user_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [userId],
  );
  const user = await pool.query(`SELECT verification_status FROM users WHERE id = $1`, [userId]);
  return {
    accountStatus: user.rows[0]?.verification_status || 'UNVERIFIED',
    latest: rows[0]
      ? {
          id: rows[0].id,
          status: rows[0].status,
          documentType: rows[0].document_type,
          submittedAt: rows[0].submitted_at,
          reviewedAt: rows[0].reviewed_at,
          rejectionReason: rows[0].rejection_reason,
        }
      : null,
  };
}

async function saveVerification(userId, documentType, files) {
  const pending = await pool.query(
    `SELECT id FROM identity_verifications
     WHERE user_id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')`,
    [userId],
  );
  if (pending.rows.length) {
    throw new Error('PENDING_EXISTS');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO identity_verifications (user_id, status, document_type)
       VALUES ($1, 'PENDING', $2)
       RETURNING id`,
      [userId, documentType],
    );
    const verificationId = rows[0].id;

    for (const file of files) {
      const sideMap = { front: 'FRONT', back: 'BACK', selfie: 'SELFIE' };
      const side = sideMap[file.fieldname];
      if (!side) continue;
      const storageKey = path.relative(projectRoot, file.path);
      const fileHash = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
      await client.query(
        `INSERT INTO verification_documents
         (verification_id, storage_key, file_hash, mime_type, file_size_bytes, side)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [verificationId, storageKey, fileHash, file.mimetype, file.size, side],
      );
    }

    await client.query(
      `UPDATE users SET verification_status = 'PENDING', updated_at = NOW() WHERE id = $1`,
      [userId],
    );
    await client.query('COMMIT');
    return verificationId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function attachProfileRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);
  const requireAdmin = createRequireRole(AppError)('ADMIN');

  router.get(
    '/users/me/profile',
    authenticate,
    asyncHandler(async (req, res) => {
      const profile = await getFullProfile(req.user.id);
      if (!profile) throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
      sendSuccess(res, { user: mapUser(profile) });
    }),
  );

  router.patch(
    '/users/me/profile',
    authenticate,
    validate(profileSchema),
    asyncHandler(async (req, res) => {
      const { displayName, phone, city, district, bio } = req.validated.body;
      const fields = [];
      const values = [];
      let i = 1;

      if (displayName !== undefined) {
        fields.push(`display_name = $${i++}`);
        values.push(displayName.trim());
      }
      if (phone !== undefined) {
        fields.push(`phone = $${i++}`);
        values.push(phone);
      }
      if (city !== undefined) {
        fields.push(`city = $${i++}`);
        values.push(city);
      }
      if (district !== undefined) {
        fields.push(`district = $${i++}`);
        values.push(district);
      }
      if (bio !== undefined) {
        fields.push(`bio = $${i++}`);
        values.push(bio);
      }

      if (!fields.length) throw new AppError('VALIDATION_ERROR', 'No fields to update.', 400);

      fields.push(`updated_at = NOW()`);
      values.push(req.user.id);

      await pool.query(
        `UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = $${i}`,
        values,
      );

      const profile = await getFullProfile(req.user.id);
      sendSuccess(res, { user: mapUser(profile) });
    }),
  );

  router.get(
    '/verification/status',
    authenticate,
    asyncHandler(async (req, res) => {
      sendSuccess(res, await getVerificationStatus(req.user.id));
    }),
  );

  router.post(
    '/verification/submit',
    authenticate,
    upload.fields([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ]),
    asyncHandler(async (req, res) => {
      const parsed = submitFieldsSchema.safeParse({ body: req.body });
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Document type is required.', 400);
      }

      const front = req.files?.front?.[0];
      if (!front) throw new AppError('VALIDATION_ERROR', 'Front document image is required.', 400);

      const userStatus = req.user.verification_status;
      if (userStatus === 'VERIFIED') {
        throw new AppError('ALREADY_VERIFIED', 'Your account is already verified.', 400);
      }
      if (userStatus === 'PENDING') {
        throw new AppError('VERIFICATION_PENDING', 'Verification is already under review.', 400);
      }

      const allFiles = [...(req.files?.front || []), ...(req.files?.back || []), ...(req.files?.selfie || [])];

      try {
        await saveVerification(req.user.id, parsed.data.body.documentType, allFiles);
      } catch (err) {
        if (err.message === 'PENDING_EXISTS') {
          throw new AppError('VERIFICATION_PENDING', 'Verification is already under review.', 400);
        }
        throw err;
      }

      sendSuccess(res, await getVerificationStatus(req.user.id), null, 201);
    }),
  );

  router.get(
    '/admin/verifications',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req, res) => {
      const { rows } = await pool.query(
        `SELECT iv.id, iv.user_id, iv.status, iv.document_type, iv.submitted_at,
                u.email, p.display_name,
                (SELECT COUNT(*)::int FROM verification_documents vd WHERE vd.verification_id = iv.id) AS document_count
         FROM identity_verifications iv
         JOIN users u ON u.id = iv.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE iv.status IN ('PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED')
         ORDER BY iv.submitted_at ASC`,
      );
      sendSuccess(res, rows);
    }),
  );

  router.patch(
    '/admin/verifications/:id/approve',
    authenticate,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE identity_verifications
           SET status = 'VERIFIED', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = NULL
           WHERE id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED')
           RETURNING user_id`,
          [id, req.user.id],
        );
        if (!rows.length) throw new AppError('NOT_FOUND', 'Verification request not found.', 404);

        await client.query(
          `UPDATE users SET verification_status = 'VERIFIED', updated_at = NOW() WHERE id = $1`,
          [rows[0].user_id],
        );
        await client.query(
          `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id)
           VALUES ($1, 'VERIFICATION_APPROVED', 'identity_verification', $2)`,
          [req.user.id, id],
        );
        await client.query('COMMIT');
        sendSuccess(res, { message: 'User verified successfully.' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/admin/verifications/:id/reject',
    authenticate,
    requireAdmin,
    validate(z.object({ body: z.object({ reason: z.string().min(5).max(500) }) })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { reason } = req.validated.body;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE identity_verifications
           SET status = 'REJECTED', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3
           WHERE id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')
           RETURNING user_id`,
          [id, req.user.id, reason],
        );
        if (!rows.length) throw new AppError('NOT_FOUND', 'Verification request not found.', 404);

        await client.query(
          `UPDATE users SET verification_status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
          [rows[0].user_id],
        );
        await client.query(
          `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
           VALUES ($1, 'VERIFICATION_REJECTED', 'identity_verification', $2, $3)`,
          [req.user.id, id, JSON.stringify({ reason })],
        );
        await client.query('COMMIT');
        sendSuccess(res, { message: 'Verification rejected.' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.patch(
    '/admin/verifications/:id/resubmit',
    authenticate,
    requireAdmin,
    validate(z.object({ body: z.object({ reason: z.string().min(5).max(500) }) })),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { reason } = req.validated.body;
      const { rows } = await pool.query(
        `UPDATE identity_verifications
         SET status = 'RESUBMISSION_REQUIRED', reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3
         WHERE id = $1 AND status IN ('PENDING', 'UNDER_REVIEW', 'REJECTED')
         RETURNING user_id`,
        [id, req.user.id, reason],
      );
      if (!rows.length) throw new AppError('NOT_FOUND', 'Verification request not found.', 404);

      await pool.query(
        `UPDATE users SET verification_status = 'UNVERIFIED', updated_at = NOW() WHERE id = $1`,
        [rows[0].user_id],
      );
      sendSuccess(res, { message: 'Resubmission requested.' });
    }),
  );
}

export function multerErrorHandler(err, _req, _res, next) {
  if (err instanceof multer.MulterError) {
    err.statusCode = 400;
    err.isOperational = true;
    err.message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large.' : err.message;
    err.code = 'UPLOAD_ERROR';
  } else if (err.message?.includes('Only JPG')) {
    err.statusCode = 400;
    err.code = 'UPLOAD_ERROR';
    err.isOperational = true;
  }
  next(err);
}
