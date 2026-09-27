#!/usr/bin/env node
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const username = process.argv[2] || 'rrconstruction';
const password = process.argv[3] || 'rrconstruction';
const name = process.argv[4] || 'RR Construction';
const role = (process.argv[5] || 'OWNER').toUpperCase();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_tRPxDpBQun35@ep-blue-shadow-b5tvmyx8-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await client.query('SELECT * FROM admin_users LIMIT 1');
    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE admin_users SET username = $1, password_hash = $2, name = $3, role = $4, updated_at = NOW() WHERE id = $5',
        [username.toLowerCase(), hashedPassword, name, role, existing.rows[0].id]
      );
    } else {
      await client.query(
        'INSERT INTO admin_users (id, username, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin_main_001', username.toLowerCase(), hashedPassword, name, role]
      );
    }

    console.log(`✅ Admin Account successfully configured for single-account JWT auth!`);
    console.log(`-----------------------------------------------`);
    console.log(`Username : ${username.toLowerCase()}`);
    console.log(`Name     : ${name}`);
    console.log(`Role     : ${role}`);
    console.log(`Password : ${password}`);
    console.log(`-----------------------------------------------`);
  } catch (err) {
    console.error('Error creating/updating admin user:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
