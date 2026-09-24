const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:LyRQbjA5hDIIHbFw7o96OQGw@rrconstuction-vast-notch-pooler.sage.cloud.layerbase.dev/rrconstuction?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const res = await pool.query('SELECT NOW() as current_time, version()');
    console.log('Successfully connected to Layerbase Postgres!', res.rows[0]);
  } catch (err) {
    console.error('Error connecting to Layerbase:', err);
  } finally {
    await pool.end();
  }
}

main();
