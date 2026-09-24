const { hashPassword } = require('better-auth/crypto');
const { Pool } = require('pg');

const usernameOrEmail = process.argv[2];
const newPassword = process.argv[3];

if (!usernameOrEmail || !newPassword) {
  console.log(`
Usage:
  node scripts/reset-password.js <username_or_email> <new_password>

Examples:
  node scripts/reset-password.js rrconstruction "rr@12345"
  node scripts/reset-password.js admin "rr@12345"
`);
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:LyRQbjA5hDIIHbFw7o96OQGw@rrconstuction-vast-notch-pooler.sage.cloud.layerbase.dev/rrconstuction?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  const client = await pool.connect();
  try {
    const userRes = await client.query(
      'SELECT * FROM "user" WHERE username = $1 OR email = $2',
      [usernameOrEmail.toLowerCase(), usernameOrEmail.toLowerCase()]
    );

    const user = userRes.rows[0];
    if (!user) {
      console.error(`❌ User "${usernameOrEmail}" not found in Layerbase PostgreSQL database.`);
      const allUsers = await client.query('SELECT id, name, username, email, role FROM "user"');
      console.log('Available users:', allUsers.rows);
      process.exit(1);
    }

    const hashedPassword = await hashPassword(newPassword);

    const accountRes = await client.query('SELECT * FROM "account" WHERE "userId" = $1', [user.id]);
    if (accountRes.rows.length > 0) {
      await client.query(
        'UPDATE "account" SET password = $1, "updatedAt" = NOW() WHERE "userId" = $2',
        [hashedPassword, user.id]
      );
    } else {
      const crypto = require('crypto');
      const accountId = crypto.randomUUID().replace(/-/g, '');
      await client.query(
        'INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [accountId, user.id, 'credential', user.id, hashedPassword]
      );
    }

    console.log(`✅ Password successfully updated in Layerbase for user:`);
    console.log(`-----------------------------------------------`);
    console.log(`Username : ${user.username}`);
    console.log(`Email    : ${user.email}`);
    console.log(`Name     : ${user.name}`);
    console.log(`Role     : ${user.role}`);
    console.log(`New Pass : ${newPassword}`);
    console.log(`-----------------------------------------------`);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
