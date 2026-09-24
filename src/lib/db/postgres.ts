import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:LyRQbjA5hDIIHbFw7o96OQGw@rrconstuction-vast-notch-pooler.sage.cloud.layerbase.dev/rrconstuction?sslmode=require';

// Global singleton pool for Next.js hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var __pg_pool: Pool | undefined;
}

export const pool: Pool = global.__pg_pool || new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') {
  global.__pg_pool = pool;
}

let schemaInitialized = false;

export async function initDb() {
  if (schemaInitialized) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Dealers Table
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        receipt_number TEXT UNIQUE NOT NULL,
        payment_date TEXT NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('DEALER', 'WORKER')),
        party_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('DEALER_RECEIPT', 'DEALER_REFUND', 'WORKER_PAYOUT', 'WORKER_ADVANCE', 'WORKER_ADVANCE_RETURN')),
        amount DOUBLE PRECISION NOT NULL CHECK(amount > 0),
        method TEXT NOT NULL DEFAULT 'CASH' CHECK(method IN ('CASH', 'UPI', 'BANK')),
        reference TEXT,
        note TEXT,
        is_reversed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Ledger Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        entry_date TEXT NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('DEALER', 'WORKER')),
        party_id TEXT NOT NULL,
        source_type TEXT NOT NULL CHECK(source_type IN ('WORK', 'PAYMENT', 'ADVANCE', 'REVERSAL')),
        source_id TEXT NOT NULL,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('CHARGE', 'WAGE', 'RECEIPT', 'PAYOUT', 'ADVANCE', 'REVERSAL')),
        description TEXT NOT NULL,
        debit DOUBLE PRECISION NOT NULL DEFAULT 0,
        credit DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Better Auth Core Tables (PostgreSQL compliant quotes for reserved words)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        role TEXT DEFAULT 'OWNER',
        username TEXT UNIQUE,
        "displayUsername" TEXT
      );

      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMPTZ NOT NULL,
        token TEXT NOT NULL UNIQUE,
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

    await client.query('COMMIT');
    schemaInitialized = true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize Layerbase PostgreSQL schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
