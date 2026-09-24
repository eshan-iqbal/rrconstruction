const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  // SQLite uninstalled
}

const DATABASE_URL = 'postgresql://postgres:LyRQbjA5hDIIHbFw7o96OQGw@rrconstuction-vast-notch-pooler.sage.cloud.layerbase.dev/rrconstuction?sslmode=require';

const pgPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sqlitePath = path.join(__dirname, '..', 'data', 'labour_master.db');

async function migrate() {
  console.log('--- Starting Migration from SQLite to Layerbase PostgreSQL ---');

  const client = await pgPool.connect();
  try {
    // 1. Initialize Tables in PostgreSQL
    console.log('1. Creating schema tables in Layerbase Postgres if they do not exist...');
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

      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        dealer_id TEXT NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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
    console.log('✓ Tables created successfully.');

    if (fs.existsSync(sqlitePath)) {
      console.log('2. Reading data from local SQLite database...');
      const sqlite = new Database(sqlitePath);

      // Helper date parser
      const parseDate = (d) => {
        if (!d) return new Date();
        if (typeof d === 'number') return new Date(d);
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };

      // 1. Users
      const users = sqlite.prepare('SELECT * FROM user').all();
      console.log(`Found ${users.length} user records.`);
      for (const u of users) {
        await client.query(`
          INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, username, "displayUsername")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            username = EXCLUDED.username
        `, [
          u.id, u.name, u.email, Boolean(u.emailVerified), u.image || null,
          parseDate(u.createdAt), parseDate(u.updatedAt),
          u.role || 'OWNER', u.username || null, u.displayUsername || null
        ]);
      }

      // 2. Accounts (Passwords / Auth Providers)
      const accounts = sqlite.prepare('SELECT * FROM account').all();
      console.log(`Found ${accounts.length} account records.`);
      for (const a of accounts) {
        await client.query(`
          INSERT INTO "account" (id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken", scope, password, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            password = EXCLUDED.password,
            "updatedAt" = EXCLUDED."updatedAt"
        `, [
          a.id, a.accountId, a.providerId, a.userId,
          a.accessToken || null, a.refreshToken || null, a.idToken || null,
          a.scope || null, a.password || null,
          parseDate(a.createdAt), parseDate(a.updatedAt)
        ]);
      }

      // 3. Dealers
      const dealers = sqlite.prepare('SELECT * FROM dealers').all();
      console.log(`Found ${dealers.length} dealer records.`);
      for (const d of dealers) {
        await client.query(`
          INSERT INTO dealers (id, code, name, phone, address, default_rate, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(NULLIF($8, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            default_rate = EXCLUDED.default_rate,
            is_active = EXCLUDED.is_active
        `, [d.id, d.code, d.name, d.phone || null, d.address || null, Number(d.default_rate) || 900, d.is_active, d.created_at]);
      }

      // 4. Sites
      const sites = sqlite.prepare('SELECT * FROM sites').all();
      console.log(`Found ${sites.length} site records.`);
      for (const s of sites) {
        await client.query(`
          INSERT INTO sites (id, dealer_id, name, address, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, COALESCE(NULLIF($6, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            dealer_id = EXCLUDED.dealer_id,
            name = EXCLUDED.name,
            address = EXCLUDED.address,
            is_active = EXCLUDED.is_active
        `, [s.id, s.dealer_id, s.name, s.address || null, s.is_active, s.created_at]);
      }

      // 5. Workers
      const workers = sqlite.prepare('SELECT * FROM workers').all();
      console.log(`Found ${workers.length} worker records.`);
      for (const w of workers) {
        await client.query(`
          INSERT INTO workers (id, code, name, phone, skill, default_wage, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(NULLIF($8, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            phone = EXCLUDED.phone,
            skill = EXCLUDED.skill,
            default_wage = EXCLUDED.default_wage,
            is_active = EXCLUDED.is_active
        `, [w.id, w.code, w.name, w.phone || null, w.skill, Number(w.default_wage) || 600, w.is_active, w.created_at]);
      }

      // 6. Work Allocations
      const allocations = sqlite.prepare('SELECT * FROM work_allocations').all();
      console.log(`Found ${allocations.length} work allocation records.`);
      for (const a of allocations) {
        await client.query(`
          INSERT INTO work_allocations (id, work_date, worker_id, dealer_id, site_id, attendance, units, selling_rate, wage_rate, charge_amount, wage_amount, notes, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE(NULLIF($14, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            work_date = EXCLUDED.work_date,
            attendance = EXCLUDED.attendance,
            units = EXCLUDED.units,
            selling_rate = EXCLUDED.selling_rate,
            wage_rate = EXCLUDED.wage_rate,
            charge_amount = EXCLUDED.charge_amount,
            wage_amount = EXCLUDED.wage_amount,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status
        `, [a.id, a.work_date, a.worker_id, a.dealer_id, a.site_id || null, a.attendance, a.units, a.selling_rate, a.wage_rate, a.charge_amount, a.wage_amount, a.notes || null, a.status, a.created_at]);
      }

      // 7. Payments
      const payments = sqlite.prepare('SELECT * FROM payments').all();
      console.log(`Found ${payments.length} payment records.`);
      for (const p of payments) {
        await client.query(`
          INSERT INTO payments (id, receipt_number, payment_date, party_type, party_id, kind, amount, method, reference, note, is_reversed, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE(NULLIF($12, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            receipt_number = EXCLUDED.receipt_number,
            payment_date = EXCLUDED.payment_date,
            amount = EXCLUDED.amount,
            method = EXCLUDED.method,
            reference = EXCLUDED.reference,
            note = EXCLUDED.note,
            is_reversed = EXCLUDED.is_reversed
        `, [p.id, p.receipt_number, p.payment_date, p.party_type, p.party_id, p.kind, p.amount, p.method, p.reference || null, p.note || null, p.is_reversed, p.created_at]);
      }

      // 8. Ledger Entries
      const ledgerEntries = sqlite.prepare('SELECT * FROM ledger_entries').all();
      console.log(`Found ${ledgerEntries.length} ledger records.`);
      for (const e of ledgerEntries) {
        await client.query(`
          INSERT INTO ledger_entries (id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE(NULLIF($11, '')::TIMESTAMPTZ, NOW()))
          ON CONFLICT (id) DO UPDATE SET
            entry_date = EXCLUDED.entry_date,
            description = EXCLUDED.description,
            debit = EXCLUDED.debit,
            credit = EXCLUDED.credit
        `, [e.id, e.entry_date, e.party_type, e.party_id, e.source_type, e.source_id, e.entry_type, e.description, e.debit, e.credit, e.created_at]);
      }

      sqlite.close();
      console.log('✓ All SQLite records successfully migrated into Layerbase PostgreSQL!');
    } else {
      console.log('No local SQLite database found; tables initialized on Layerbase.');
    }

    // Verify Row Counts in Layerbase
    const userCount = (await client.query('SELECT COUNT(*) FROM "user"')).rows[0].count;
    const workerCount = (await client.query('SELECT COUNT(*) FROM workers')).rows[0].count;
    const dealerCount = (await client.query('SELECT COUNT(*) FROM dealers')).rows[0].count;
    const allocCount = (await client.query('SELECT COUNT(*) FROM work_allocations')).rows[0].count;
    const paymentCount = (await client.query('SELECT COUNT(*) FROM payments')).rows[0].count;
    const ledgerCount = (await client.query('SELECT COUNT(*) FROM ledger_entries')).rows[0].count;

    console.log('\n--- Layerbase PostgreSQL Status ---');
    console.log(`Users: ${userCount}`);
    console.log(`Dealers: ${dealerCount}`);
    console.log(`Workers: ${workerCount}`);
    console.log(`Allocations: ${allocCount}`);
    console.log(`Payments: ${paymentCount}`);
    console.log(`Ledger Entries: ${ledgerCount}`);
    console.log('-----------------------------------');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pgPool.end();
  }
}

migrate();
