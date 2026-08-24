import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from './db.js';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

function getConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
  }
  return {
    jwtSecret,
    jwtRefreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
}

function parseDurationMs(value) {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user, config) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      verificationStatus: user.verification_status,
      tokenVersion: user.token_version,
    },
    config.jwtSecret,
    { expiresIn: config.accessExpiresIn },
  );
}

function setRefreshCookie(res, token, config) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseDurationMs(config.refreshExpiresIn),
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res) {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/v1/auth',
  });
}

async function issueTokens(user, res, config) {
  const accessToken = signAccessToken(user, config);
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + parseDurationMs(config.refreshExpiresIn));

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hashToken(refreshToken), expiresAt],
  );

  setRefreshCookie(res, refreshToken, config);
  return { accessToken, expiresIn: config.accessExpiresIn };
}

async function getUserByEmail(email) {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, verification_status, account_status,
            token_version, failed_login_attempts, locked_until
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] || null;
}

async function getUserProfile(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.verification_status, u.account_status,
            p.display_name, p.city, p.district, p.avatar_url,
            p.buyer_rating_avg, p.seller_rating_avg
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return rows[0] || null;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    verificationStatus: row.verification_status,
    accountStatus: row.account_status,
    displayName: row.display_name,
    city: row.city,
    district: row.district,
    avatarUrl: row.avatar_url,
    buyerRatingAvg: row.buyer_rating_avg,
    sellerRatingAvg: row.seller_rating_avg,
  };
}

export function createAuthenticate(AppError) {
  return async function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required.', 401));
    }

    try {
      const config = getConfig();
      const payload = jwt.verify(header.slice(7), config.jwtSecret);
      const { rows } = await pool.query(
        `SELECT id, email, role, verification_status, account_status, token_version
         FROM users WHERE id = $1`,
        [payload.sub],
      );
      if (!rows.length) throw new AppError('UNAUTHORIZED', 'User not found.', 401);

      const user = rows[0];
      if (user.account_status !== 'ACTIVE') {
        throw new AppError('ACCOUNT_SUSPENDED', 'Your account is suspended.', 403);
      }
      if (user.token_version !== payload.tokenVersion) {
        throw new AppError('TOKEN_REVOKED', 'Session expired. Please login again.', 401);
      }

      req.user = user;
      next();
    } catch (err) {
      if (err instanceof AppError) return next(err);
      return next(new AppError('INVALID_TOKEN', 'Invalid or expired token.', 401));
    }
  };
}

export function createRequireRole(AppError) {
  return function requireRole(...roles) {
    return (req, _res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return next(new AppError('FORBIDDEN', 'You do not have permission.', 403));
      }
      next();
    };
  };
}

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required.'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Za-z]/, 'Password must contain a letter.')
      .regex(/[0-9]/, 'Password must contain a number.'),
    displayName: z.string().min(2, 'Display name must be at least 2 characters.').max(100),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required.'),
    password: z.string().min(1, 'Password is required.'),
  }),
});

export function attachAuthRoutes(router, { asyncHandler, validate, sendSuccess, AppError }) {
  const authenticate = createAuthenticate(AppError);
  const config = getConfig();

  router.post(
    '/auth/register',
    validate(registerSchema),
    asyncHandler(async (req, res) => {
      const { email, password, displayName } = req.validated.body;
      const normalizedEmail = email.toLowerCase().trim();

      const existing = await getUserByEmail(normalizedEmail);
      if (existing) throw new AppError('EMAIL_IN_USE', 'An account with this email already exists.', 409);

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO users (email, password_hash, role, verification_status, account_status)
           VALUES ($1, $2, 'USER', 'UNVERIFIED', 'ACTIVE')
           RETURNING id, email, role, verification_status, account_status, token_version`,
          [normalizedEmail, passwordHash],
        );
        const user = rows[0];
        await client.query(
          `INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)`,
          [user.id, displayName.trim()],
        );
        await client.query('COMMIT');

        const tokens = await issueTokens(user, res, config);
        const profile = await getUserProfile(user.id);
        sendSuccess(
          res,
          { user: publicUser(profile), accessToken: tokens.accessToken, expiresIn: tokens.expiresIn },
          null,
          201,
        );
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.post(
    '/auth/login',
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { email, password } = req.validated.body;
      const user = await getUserByEmail(email);

      if (!user) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new AppError('ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.', 423);
      }

      if (user.account_status !== 'ACTIVE') {
        throw new AppError('ACCOUNT_SUSPENDED', 'Your account is suspended.', 403);
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const lockedUntil = attempts >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MS) : null;
        await pool.query(
          `UPDATE users SET failed_login_attempts = $1, locked_until = $2, updated_at = NOW() WHERE id = $3`,
          [attempts, lockedUntil, user.id],
        );
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      await pool.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1`,
        [user.id],
      );

      const tokens = await issueTokens(user, res, config);
      const profile = await getUserProfile(user.id);
      sendSuccess(res, {
        user: publicUser(profile),
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      });
    }),
  );

  router.post(
    '/auth/refresh',
    asyncHandler(async (req, res) => {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) throw new AppError('UNAUTHORIZED', 'Refresh token missing.', 401);

      const tokenHash = hashToken(refreshToken);
      const { rows } = await pool.query(
        `SELECT rt.id, rt.user_id, u.email, u.role, u.verification_status, u.account_status, u.token_version
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
        [tokenHash],
      );

      if (!rows.length) {
        clearRefreshCookie(res);
        throw new AppError('INVALID_TOKEN', 'Invalid refresh token.', 401);
      }

      const record = rows[0];
      if (record.account_status !== 'ACTIVE') {
        throw new AppError('ACCOUNT_SUSPENDED', 'Your account is suspended.', 403);
      }

      await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [record.id]);

      const user = {
        id: record.user_id,
        role: record.role,
        verification_status: record.verification_status,
        token_version: record.token_version,
      };
      const tokens = await issueTokens(user, res, config);
      sendSuccess(res, { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn });
    }),
  );

  router.post(
    '/auth/logout',
    asyncHandler(async (req, res) => {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, [
          hashToken(refreshToken),
        ]);
      }
      clearRefreshCookie(res);
      sendSuccess(res, { message: 'Logged out successfully.' });
    }),
  );

  router.get(
    '/auth/me',
    authenticate,
    asyncHandler(async (req, res) => {
      const profile = await getUserProfile(req.user.id);
      if (!profile) throw new AppError('USER_NOT_FOUND', 'User not found.', 404);
      sendSuccess(res, { user: publicUser(profile) });
    }),
  );
}
