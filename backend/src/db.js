import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

async function readSql(filename) {
  const filePath = path.resolve(__dirname, '../../database', filename);
  return fs.readFile(filePath, 'utf8');
}

export async function migrate() {
  const sql = await readSql('schema.sql');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Database schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function seed() {
  const sql = await readSql('seed.sql');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@ferilo.local';
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (email, password_hash, role, verification_status, account_status, email_verified_at)
       VALUES ($1, $2, 'ADMIN', 'VERIFIED', 'ACTIVE', NOW())
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN'`,
      [adminEmail, passwordHash],
    );

    await client.query(
      `INSERT INTO user_profiles (user_id, display_name, city, district)
       SELECT id, 'FERILO Admin', 'Kathmandu', 'Kathmandu'
       FROM users WHERE email = $1
       ON CONFLICT (user_id) DO NOTHING`,
      [adminEmail],
    );

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
    console.log(`Admin login: ${adminEmail}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const command = process.argv[2];
if (command === 'migrate') {
  migrate()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Migration failed:', err.message || err);
      pool.end();
      process.exit(1);
    });
} else if (command === 'seed') {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Seed failed:', err.message || err);
      pool.end();
      process.exit(1);
    });
}
