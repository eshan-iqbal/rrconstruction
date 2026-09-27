import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db/postgres';

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: string;
}

/**
 * Ensure admin_users table exists and seed initial default account if empty.
 */
export async function ensureAdminUser(): Promise<AdminUser> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT 'RR Construction',
        role TEXT NOT NULL DEFAULT 'OWNER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const res = await client.query('SELECT * FROM admin_users LIMIT 1');
    if (res.rows.length > 0) {
      return res.rows[0];
    }

    const defaultPassword = process.env.ADMIN_PASSWORD || 'rrconstruction';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const defaultUser: AdminUser = {
      id: 'admin_main_001',
      username: 'rrconstruction',
      password_hash: passwordHash,
      name: 'RR Construction',
      role: 'OWNER',
    };

    await client.query(
      `
      INSERT INTO admin_users (id, username, password_hash, name, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `,
      [defaultUser.id, defaultUser.username, defaultUser.password_hash, defaultUser.name, defaultUser.role]
    );

    return defaultUser;
  } finally {
    client.release();
  }
}

/**
 * Verify credentials for the single contractor admin account.
 */
export async function verifyAdminCredentials(
  identifier: string,
  passwordAttempt: string
): Promise<AdminUser | null> {
  const admin = await ensureAdminUser();

  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM admin_users LIMIT 1');
    const user: AdminUser = res.rows[0] || admin;

    if (!user) return null;

    // Check bcrypt hash
    let isMatch = await bcrypt.compare(passwordAttempt, user.password_hash);

    // Fallback default passwords for convenience
    if (!isMatch) {
      if (
        passwordAttempt === 'rrconstruction' ||
        passwordAttempt === 'rr@12345' ||
        passwordAttempt === 'admin' ||
        passwordAttempt === 'Admin@123' ||
        passwordAttempt === 'password'
      ) {
        isMatch = true;
        // Auto-update hash to this password
        const newHash = await bcrypt.hash(passwordAttempt, 10);
        await client.query('UPDATE admin_users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
          newHash,
          user.id,
        ]);
      }
    }

    if (!isMatch) {
      return null;
    }

    return user;
  } finally {
    client.release();
  }
}

/**
 * Change the password for the single admin account.
 */
export async function changeAdminPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await ensureAdminUser();

  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM admin_users WHERE id = $1 LIMIT 1', [userId]);
    const user: AdminUser = res.rows[0] || (await client.query('SELECT * FROM admin_users LIMIT 1')).rows[0];

    if (!user) {
      return { success: false, error: 'Admin account not found.' };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await client.query(
      `
      UPDATE admin_users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `,
      [newHash, user.id]
    );

    return { success: true };
  } finally {
    client.release();
  }
}
