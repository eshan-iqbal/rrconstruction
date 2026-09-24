const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env.local manually
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        dbUrl = trimmed.substring('DATABASE_URL='.length).trim();
        // Remove quotes if any
        if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
          dbUrl = dbUrl.slice(1, -1);
        }
        break;
      }
    }
  } catch (e) {}
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

const sql = process.argv.slice(2).join(' ') || 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'';

async function main() {
  try {
    const res = await pool.query(sql);
    console.log(`\n--- Results (${res.rows.length} rows) ---`);
    console.table(res.rows);
  } catch (err) {
    console.error('Query error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
