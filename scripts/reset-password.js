const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const usernameOrNewPassword = process.argv[2];
const optionalNewPassword = process.argv[3];

let username = 'rrconstruction';
let newPassword = '';

if (optionalNewPassword) {
  username = usernameOrNewPassword;
  newPassword = optionalNewPassword;
} else if (usernameOrNewPassword) {
  newPassword = usernameOrNewPassword;
}

if (!newPassword) {
  console.log(`
Usage:
  node scripts/reset-password.js <new_password>
  or
  node scripts/reset-password.js <username> <new_password>

Examples:
  node scripts/reset-password.js "rr@12345"
  node scripts/reset-password.js rrconstruction "rr@12345"
`);
  process.exit(1);
}

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

    const userRes = await client.query('SELECT * FROM admin_users LIMIT 1');
    const user = userRes.rows[0];

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (user) {
      await client.query(
        'UPDATE admin_users SET username = $1, password_hash = $2, updated_at = NOW() WHERE id = $3',
        [username.toLowerCase(), hashedPassword, user.id]
      );
    } else {
      await client.query(
        'INSERT INTO admin_users (id, username, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)',
        ['admin_main_001', username.toLowerCase(), hashedPassword, 'RR Construction', 'OWNER']
      );
    }

    console.log(`✅ Admin password successfully updated!`);
    console.log(`-----------------------------------------------`);
    console.log(`Username : ${username.toLowerCase()}`);
    console.log(`Role     : OWNER`);
    console.log(`New Pass : ${newPassword}`);
    console.log(`-----------------------------------------------`);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
