import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_tRPxDpBQun35@ep-blue-shadow-b5tvmyx8-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

// Global singleton pool for Next.js hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var __pg_pool: Pool | undefined;
}

function getOrCreatePool(): Pool {
  if (global.__pg_pool) return global.__pg_pool;

  const newPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: false,
  });

  // Handle background client connection drops to prevent uncaughtException crashes
  newPool.on('error', (err) => {
    console.warn('[PostgreSQL Pool] Idle client connection disconnected, pool will recover automatically:', err.message);
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__pg_pool = newPool;
  }

  return newPool;
}

export const pool: Pool = getOrCreatePool();

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
        default_rate DOUBLE PRECISION DEFAULT 0,
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

    // 3. Workers Table (with complete KYC, Banking, and Contact Fields)
    await client.query(`
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        skill TEXT NOT NULL DEFAULT 'General Helper',
        default_wage DOUBLE PRECISION NOT NULL DEFAULT 600,
        aadhaar_number TEXT,
        pan_number TEXT,
        voter_id TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        upi_id TEXT,
        father_name TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        permanent_address TEXT,
        local_address TEXT,
        gender TEXT,
        blood_group TEXT,
        date_of_birth TEXT,
        joining_date TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Auto-migrate columns if table already existed
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS aadhaar_number TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS pan_number TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS voter_id TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS bank_ifsc TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS upi_id TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS father_name TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS local_address TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS gender TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS blood_group TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS joining_date TEXT;
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS notes TEXT;
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

      ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_reversed INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS note TEXT;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'CASH';

      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS attendance TEXT DEFAULT 'FULL';
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS units DOUBLE PRECISION DEFAULT 1.0;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS selling_rate DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS wage_rate DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS charge_amount DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS wage_amount DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'CONFIRMED';
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE work_allocations ADD COLUMN IF NOT EXISTS site_id TEXT;
    `);

    // 6. Ledger Entries Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        entry_date TEXT NOT NULL,
        party_type TEXT NOT NULL CHECK(party_type IN ('DEALER', 'WORKER')),
        party_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        entry_type TEXT NOT NULL,
        description TEXT NOT NULL,
        debit DOUBLE PRECISION NOT NULL DEFAULT 0,
        credit DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_source_type_check;
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
      ALTER TABLE ledger_entries ALTER COLUMN entry_number DROP NOT NULL;
      ALTER TABLE ledger_entries ALTER COLUMN category DROP NOT NULL;
      ALTER TABLE ledger_entries ALTER COLUMN amount DROP NOT NULL;
      ALTER TABLE ledger_entries ALTER COLUMN running_balance DROP NOT NULL;

      ALTER TABLE work_allocations ALTER COLUMN billing_rate DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN worker_wage DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN margin_amount DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN shift_type DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN day_fraction DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN billed_status DROP NOT NULL;
      ALTER TABLE work_allocations ALTER COLUMN worker_paid_status DROP NOT NULL;
    `);

    // 6. Dedicated Admin User Table for Single Account JWT Auth
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

    // 7. Dedicated Companies / Multi-Entity Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS company_profile (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'RR CONSTRUCTION',
        short_name TEXT NOT NULL DEFAULT 'RR',
        tagline TEXT DEFAULT 'Labour Suppliers & Civil Infrastructure Contractors',
        est_year TEXT DEFAULT 'EST. 2018',
        gstin TEXT DEFAULT '07AABCR8892F1Z4',
        phone TEXT DEFAULT '+91 98765 43210',
        email TEXT DEFAULT 'accounts@rrconstruction.in',
        address TEXT DEFAULT 'Civil Lines, Sector 62, Noida, Delhi NCR - 201301',
        website TEXT DEFAULT 'https://rrconstruction.in',
        authorized_signatory TEXT DEFAULT 'FOR RR CONSTRUCTION',
        statement_title TEXT DEFAULT 'STATEMENT OF SUBLEDGER ACCOUNT',
        statement_subtitle TEXT DEFAULT 'Double-Entry Verified & Reconciled',
        terms_notes TEXT DEFAULT 'Certified official subledger statement issued by RR Construction. Verified under double-entry accounting rules.',
        is_active INTEGER NOT NULL DEFAULT 1,
        is_default INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS short_name TEXT DEFAULT 'RR';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT 'Labour Suppliers & Civil Infrastructure Contractors';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS est_year TEXT DEFAULT 'EST. 2018';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '07AABCR8892F1Z4';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '+91 98765 43210';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS email TEXT DEFAULT 'accounts@rrconstruction.in';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'Civil Lines, Sector 62, Noida, Delhi NCR - 201301';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS website TEXT DEFAULT 'https://rrconstruction.in';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS authorized_signatory TEXT DEFAULT 'FOR RR CONSTRUCTION';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS statement_title TEXT DEFAULT 'STATEMENT OF SUBLEDGER ACCOUNT';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS statement_subtitle TEXT DEFAULT 'Double-Entry Verified & Reconciled';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS terms_notes TEXT DEFAULT 'Certified official subledger statement issued by RR Construction. Verified under double-entry accounting rules.';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/logo.png';
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS is_default INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

      INSERT INTO company_profile (id, name, short_name, tagline, est_year, gstin, phone, email, address, website, authorized_signatory, statement_title, statement_subtitle, terms_notes, is_active, is_default)
      VALUES (
        'default',
        'RR CONSTRUCTION',
        'RR',
        'Labour Suppliers & Civil Infrastructure Contractors',
        'EST. 2018',
        '07AABCR8892F1Z4',
        '+91 98765 43210',
        'accounts@rrconstruction.in',
        'Civil Lines, Sector 62, Noida, Delhi NCR - 201301',
        'https://rrconstruction.in',
        'FOR RR CONSTRUCTION',
        'STATEMENT OF SUBLEDGER ACCOUNT',
        'Double-Entry Verified & Reconciled',
        'Certified official subledger statement issued by RR Construction. Verified under double-entry accounting rules.',
        1,
        1
      )
      ON CONFLICT (id) DO NOTHING;
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
