const { Pool } = require('pg');

const OLD_DATABASE_URL = 'postgresql://postgres:LyRQbjA5hDIIHbFw7o96OQGw@rrconstuction-vast-notch-pooler.sage.cloud.layerbase.dev/rrconstuction?sslmode=require';
const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_tRPxDpBQun35@ep-blue-shadow-b5tvmyx8-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function migrate() {
  console.log('🚀 Connecting to Old DB (Layerbase) and New DB (Neon)...');

  const oldPool = new Pool({
    connectionString: OLD_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const neonPool = new Pool({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. Initialize schema in Neon
    console.log('📦 Initializing schema on Neon DB...');
    const neonClient = await neonPool.connect();

    await neonClient.query('BEGIN');

    // 1. Dealers Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS dealers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        default_rate DOUBLE PRECISION DEFAULT 900,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Sites Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Workers Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        skill TEXT NOT NULL DEFAULT 'General Helper',
        default_wage DOUBLE PRECISION NOT NULL DEFAULT 600,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Work Allocations Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS work_allocations (
        id TEXT PRIMARY KEY,
        work_date TEXT NOT NULL,
        worker_id TEXT NOT NULL REFERENCES workers(id),
        dealer_id TEXT NOT NULL REFERENCES dealers(id),
        site_id TEXT REFERENCES sites(id),
        attendance TEXT NOT NULL CHECK(attendance IN ('FULL', 'HALF', 'ABSENT')),
        units DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        selling_rate DOUBLE PRECISION NOT NULL,
        wage_rate DOUBLE PRECISION NOT NULL,
        charge_amount DOUBLE PRECISION NOT NULL,
        wage_amount DOUBLE PRECISION NOT NULL,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK(status IN ('DRAFT', 'CONFIRMED', 'VOID')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Payments Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        receipt_number TEXT UNIQUE NOT NULL,
        payment_date TEXT NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('DEALER', 'WORKER')),
        party_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        method TEXT NOT NULL CHECK(method IN ('CASH', 'UPI', 'BANK')),
        reference TEXT,
        note TEXT,
        is_reversed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Ledger Entries Table
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        entry_date TEXT NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('DEALER', 'WORKER')),
        party_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        entry_type TEXT NOT NULL,
        description TEXT NOT NULL,
        debit DOUBLE PRECISION NOT NULL DEFAULT 0,
        credit DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 7. Auth Tables
    await neonClient.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        role TEXT NOT NULL DEFAULT 'user'
      );

      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        token TEXT UNIQUE NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMPTZ,
        "refreshTokenExpiresAt" TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await neonClient.query('COMMIT');
    neonClient.release();
    console.log('✅ Schema tables verified on Neon DB.');

    // Helper to transfer data
    async function copyTable(tableName, query, insertFn) {
      console.log(`⏳ Fetching data from ${tableName} in Layerbase...`);
      const res = await oldPool.query(query);
      console.log(`   Found ${res.rows.length} rows in ${tableName}`);
      for (const row of res.rows) {
        await insertFn(row);
      }
      console.log(`   ✓ Copied ${res.rows.length} rows into Neon DB.`);
    }

    // 1. Dealers
    await copyTable('dealers', 'SELECT * FROM dealers', async (r) => {
      await neonPool.query(`
        INSERT INTO dealers (id, code, name, phone, address, default_rate, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.code, r.name, r.phone, r.address, r.default_rate, r.is_active, r.created_at]);
    });

    // 2. Sites
    await copyTable('sites', 'SELECT * FROM sites', async (r) => {
      await neonPool.query(`
        INSERT INTO sites (id, dealer_id, name, address, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.dealer_id, r.name, r.address, r.is_active, r.created_at]);
    });

    // 3. Workers
    await copyTable('workers', 'SELECT * FROM workers', async (r) => {
      await neonPool.query(`
        INSERT INTO workers (id, code, name, phone, skill, default_wage, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.code, r.name, r.phone, r.skill, r.default_wage, r.is_active, r.created_at]);
    });

    // 4. Work Allocations
    await copyTable('work_allocations', 'SELECT * FROM work_allocations', async (r) => {
      await neonPool.query(`
        INSERT INTO work_allocations (
          id, work_date, worker_id, dealer_id, site_id, attendance, units,
          selling_rate, wage_rate, charge_amount, wage_amount, notes, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.work_date, r.worker_id, r.dealer_id, r.site_id, r.attendance, r.units,
        r.selling_rate, r.wage_rate, r.charge_amount, r.wage_amount, r.notes, r.status, r.created_at
      ]);
    });

    // 5. Payments
    await copyTable('payments', 'SELECT * FROM payments', async (r) => {
      await neonPool.query(`
        INSERT INTO payments (
          id, receipt_number, payment_date, party_type, party_id, kind, amount, method, reference, note, is_reversed, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.receipt_number, r.payment_date, r.party_type, r.party_id, r.kind,
        r.amount, r.method, r.reference, r.note, r.is_reversed, r.created_at
      ]);
    });

    // 6. Ledger Entries
    await copyTable('ledger_entries', 'SELECT * FROM ledger_entries', async (r) => {
      await neonPool.query(`
        INSERT INTO ledger_entries (
          id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.entry_date, r.party_type, r.party_id, r.source_type, r.source_id,
        r.entry_type, r.description, r.debit, r.credit, r.created_at
      ]);
    });

    // 7. Users
    await copyTable('user', 'SELECT * FROM "user"', async (r) => {
      await neonPool.query(`
        INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [r.id, r.name, r.email, r.emailVerified, r.image, r.createdAt, r.updatedAt, r.role]);
    });

    // 8. Accounts
    await copyTable('account', 'SELECT * FROM "account"', async (r) => {
      await neonPool.query(`
        INSERT INTO "account" (
          id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
          "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING
      `, [
        r.id, r.accountId, r.providerId, r.userId, r.accessToken, r.refreshToken, r.idToken,
        r.accessTokenExpiresAt, r.refreshTokenExpiresAt, r.scope, r.password, r.createdAt, r.updatedAt
      ]);
    });

    console.log('\n🎉 MIGRATION COMPLETE! All data successfully transferred to Neon DB.');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await oldPool.end();
    await neonPool.end();
  }
}

migrate();
