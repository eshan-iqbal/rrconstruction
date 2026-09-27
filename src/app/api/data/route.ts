import { NextResponse } from 'next/server';
import { pool, initDb } from '@/lib/db/postgres';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    await initDb();

    const dealersRes = await pool.query('SELECT * FROM dealers ORDER BY name ASC');
    const sitesRes = await pool.query('SELECT * FROM sites ORDER BY name ASC');
    const workersRes = await pool.query('SELECT * FROM workers ORDER BY name ASC');

    const allocationsRes = await pool.query(`
      SELECT a.*, w.name as worker_name, w.code as worker_code, w.skill as worker_skill,
             d.name as dealer_name, d.code as dealer_code, s.name as site_name
      FROM work_allocations a
      LEFT JOIN workers w ON a.worker_id = w.id
      LEFT JOIN dealers d ON a.dealer_id = d.id
      LEFT JOIN sites s ON a.site_id = s.id
      ORDER BY a.work_date DESC, a.created_at DESC
    `);

    const paymentsRes = await pool.query(`
      SELECT p.*,
        CASE
          WHEN p.party_type = 'DEALER' THEN (SELECT name FROM dealers WHERE id = p.party_id)
          ELSE (SELECT name FROM workers WHERE id = p.party_id)
        END as party_name,
        CASE
          WHEN p.party_type = 'DEALER' THEN (SELECT code FROM dealers WHERE id = p.party_id)
          ELSE (SELECT code FROM workers WHERE id = p.party_id)
        END as party_code
      FROM payments p
      ORDER BY p.payment_date DESC, p.created_at DESC
    `);

    const ledgerRes = await pool.query(`
      SELECT l.*,
        CASE
          WHEN l.party_type = 'DEALER' THEN (SELECT name FROM dealers WHERE id = l.party_id)
          ELSE (SELECT name FROM workers WHERE id = l.party_id)
        END as party_name,
        CASE
          WHEN l.party_type = 'DEALER' THEN (SELECT code FROM dealers WHERE id = l.party_id)
          ELSE (SELECT code FROM workers WHERE id = l.party_id)
        END as party_code
      FROM ledger_entries l
      ORDER BY l.entry_date DESC, l.created_at DESC
    `);

    // Compute metrics
    const dealerTotalsRes = await pool.query(`
      SELECT
        COALESCE(SUM(debit), 0)::FLOAT as total_debit,
        COALESCE(SUM(credit), 0)::FLOAT as total_credit
      FROM ledger_entries
      WHERE party_type = 'DEALER'
    `);
    const dealerTotals = dealerTotalsRes.rows[0] || { total_debit: 0, total_credit: 0 };

    const workerTotalsRes = await pool.query(`
      SELECT
        COALESCE(SUM(debit), 0)::FLOAT as total_wages,
        COALESCE(SUM(credit), 0)::FLOAT as total_payouts
      FROM ledger_entries
      WHERE party_type = 'WORKER'
    `);
    const workerTotals = workerTotalsRes.rows[0] || { total_wages: 0, total_payouts: 0 };

    const workerAdvancesRes = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::FLOAT as total_advances
      FROM payments
      WHERE kind = 'WORKER_ADVANCE' AND is_reversed = 0
    `);
    const workerAdvances = workerAdvancesRes.rows[0] || { total_advances: 0 };

    const totalReceivable = Math.max(0, Number(dealerTotals.total_debit) - Number(dealerTotals.total_credit));
    const totalWagePayable = Math.max(0, Number(workerTotals.total_wages) - Number(workerTotals.total_payouts));

    const companiesRes = await pool.query('SELECT * FROM company_profile ORDER BY is_default DESC, created_at ASC');
    const fallbackCompany = {
      id: 'default',
      name: 'RR CONSTRUCTION',
      short_name: 'RR',
      tagline: 'Labour Suppliers & Civil Infrastructure Contractors',
      est_year: 'EST. 2018',
      gstin: '07AABCR8892F1Z4',
      phone: '+91 98765 43210',
      email: 'accounts@rrconstruction.in',
      address: 'Civil Lines, Sector 62, Noida, Delhi NCR - 201301',
      website: 'https://rrconstruction.in',
      authorized_signatory: 'FOR RR CONSTRUCTION',
      statement_title: 'STATEMENT OF SUBLEDGER ACCOUNT',
      statement_subtitle: 'Double-Entry Verified & Reconciled',
      terms_notes: 'Certified official subledger statement issued by RR Construction. Verified under double-entry accounting rules.',
      is_active: 1,
      is_default: 1
    };
    const companies = companiesRes.rows.length > 0 ? companiesRes.rows : [fallbackCompany];
    const companyProfile = companies.find(c => c.is_default === 1) || companies[0];

    return NextResponse.json({
      success: true,
      companies,
      companyProfile,
      dealers: dealersRes.rows,
      sites: sitesRes.rows,
      workers: workersRes.rows,
      allocations: allocationsRes.rows,
      payments: paymentsRes.rows,
      ledgerEntries: ledgerRes.rows,
      metrics: {
        totalReceivable,
        totalWagePayable,
        totalAdvances: Number(workerAdvances.total_advances),
        dealerCount: dealersRes.rows.length,
        workerCount: workersRes.rows.length,
        allocationsCount: allocationsRes.rows.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json();
    const { action } = body;

    // 1. ADD DEALER
    if (action === 'ADD_DEALER') {
      const { name, phone, address, default_rate } = body.data;
      const existingCodesRes = await pool.query('SELECT code FROM dealers');
      let maxNum = 0;
      for (const row of existingCodesRes.rows) {
        const match = String(row.code).match(/DLR-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const code = `DLR-${String(maxNum + 1).padStart(3, '0')}`;
      const id = randomUUID();

      await pool.query(`
        INSERT INTO dealers (id, code, name, phone, address, default_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, code, name, phone || null, address || null, Number(default_rate) || 0]);

      const siteId = randomUUID();
      await pool.query(`
        INSERT INTO sites (id, dealer_id, name, address)
        VALUES ($1, $2, $3, $4)
      `, [siteId, id, `${name} Main Site`, address || 'Main Site']);

      return NextResponse.json({ success: true, id, code });
    }

    // 2. ADD SITE
    if (action === 'ADD_SITE') {
      const { dealer_id, name, address } = body.data;
      const id = randomUUID();
      await pool.query(`
        INSERT INTO sites (id, dealer_id, name, address)
        VALUES ($1, $2, $3, $4)
      `, [id, dealer_id, name, address || null]);
      return NextResponse.json({ success: true, id });
    }

    // 3. ADD WORKER
    if (action === 'ADD_WORKER') {
      const {
        name,
        phone,
        skill = 'General Helper',
        default_wage = 600,
        aadhaar_number,
        pan_number,
        voter_id,
        bank_name,
        bank_account_number,
        bank_ifsc,
        upi_id,
        father_name,
        emergency_contact_name,
        emergency_contact_phone,
        permanent_address,
        local_address,
        gender,
        blood_group,
        date_of_birth,
        joining_date = new Date().toISOString().split('T')[0],
        notes
      } = body.data;

      const existingCodesRes = await pool.query('SELECT code FROM workers');
      let maxNum = 0;
      for (const row of existingCodesRes.rows) {
        const match = String(row.code).match(/WRK-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const code = `WRK-${String(maxNum + 1).padStart(3, '0')}`;
      const id = randomUUID();

      await pool.query(`
        INSERT INTO workers (
          id, code, name, phone, skill, default_wage,
          aadhaar_number, pan_number, voter_id, bank_name, bank_account_number, bank_ifsc, upi_id,
          father_name, emergency_contact_name, emergency_contact_phone,
          permanent_address, local_address, gender, blood_group, date_of_birth, joining_date, notes
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23
        )
      `, [
        id, code, name, phone || null, skill, Number(default_wage) || 600,
        aadhaar_number || null, pan_number || null, voter_id || null,
        bank_name || null, bank_account_number || null, bank_ifsc || null, upi_id || null,
        father_name || null, emergency_contact_name || null, emergency_contact_phone || null,
        permanent_address || null, local_address || null, gender || null, blood_group || null,
        date_of_birth || null, joining_date || null, notes || null
      ]);

      return NextResponse.json({ success: true, id, code });
    }

    // 4. SEND SINGLE OR MULTI WORKERS (ATOMIC BATCH TRANSACTION)
    if (action === 'SEND_WORKER' || action === 'SEND_MULTI_WORKERS') {
      const {
        work_date = new Date().toISOString().split('T')[0],
        dealer_id,
        site_id,
        notes = '',
        workers: workerList
      } = body.data;

      const itemsToProcess = workerList || [
        {
          worker_id: body.data.worker_id,
          attendance: body.data.attendance || 'FULL',
          selling_rate: body.data.selling_rate,
          wage_rate: body.data.wage_rate,
          notes: body.data.notes || notes
        }
      ];

      if (!itemsToProcess || itemsToProcess.length === 0) {
        return NextResponse.json({ success: false, error: 'No workers selected' }, { status: 400 });
      }

      const createdIds: string[] = [];
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const dealerRes = await client.query('SELECT name, code FROM dealers WHERE id = $1', [dealer_id]);
        const dealer = dealerRes.rows[0];

        for (const item of itemsToProcess) {
          const allocationId = randomUUID();
          const attendance = item.attendance || 'FULL';
          const units = attendance === 'FULL' ? 1.0 : attendance === 'HALF' ? 0.5 : 0.0;
          const selling_rate = Number(item.selling_rate);
          const wage_rate = Number(item.wage_rate);
          const charge_amount = Math.round(selling_rate * units * 100) / 100;
          const wage_amount = Math.round(wage_rate * units * 100) / 100;

          // Insert allocation
          await client.query(`
            INSERT INTO work_allocations (
              id, work_date, worker_id, dealer_id, site_id,
              attendance, units, selling_rate, wage_rate, charge_amount, wage_amount, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'CONFIRMED')
          `, [
            allocationId, work_date, item.worker_id, dealer_id, site_id || null,
            attendance, units, selling_rate, wage_rate, charge_amount, wage_amount, item.notes || notes || ''
          ]);

          createdIds.push(allocationId);

          const workerRes = await client.query('SELECT name, code FROM workers WHERE id = $1', [item.worker_id]);
          const worker = workerRes.rows[0];

          if (units > 0) {
            // 1. Dealer Ledger Entry (DEBIT = Billed Charge)
            await client.query(`
              INSERT INTO ledger_entries (
                id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit
              ) VALUES ($1, $2, 'DEALER', $3, 'WORK', $4, 'CHARGE', $5, $6, 0)
            `, [
              randomUUID(), work_date, dealer_id, allocationId,
              `Labour Supply: ${worker?.name || 'Worker'} (${attendance} day) @ ₹${selling_rate}`,
              charge_amount
            ]);

            // 2. Worker Ledger Entry (DEBIT = Wage Earned)
            await client.query(`
              INSERT INTO ledger_entries (
                id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit
              ) VALUES ($1, $2, 'WORKER', $3, 'WORK', $4, 'WAGE', $5, $6, 0)
            `, [
              randomUUID(), work_date, item.worker_id, allocationId,
              `Daily Wage Earned: ${dealer?.name || 'Dealer'} (${attendance} day) @ ₹${wage_rate}`,
              wage_amount
            ]);
          }
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, count: createdIds.length, ids: createdIds });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 5. RECORD PAYMENT
    if (action === 'RECORD_PAYMENT') {
      const {
        party_type,
        party_id,
        kind,
        payment_date = new Date().toISOString().split('T')[0],
        amount,
        method = 'CASH',
        reference = '',
        note = ''
      } = body.data;

      const numAmount = Number(amount);
      if (numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Amount must be positive' }, { status: 400 });
      }

      const currentYear = new Date().getFullYear();
      const existingReceiptsRes = await pool.query('SELECT receipt_number FROM payments');
      let maxNum = 0;
      for (const row of existingReceiptsRes.rows) {
        const match = String(row.receipt_number).match(new RegExp(`RCP-${currentYear}-(\\d+)`, 'i'));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const receiptNumber = `RCP-${currentYear}-${String(maxNum + 1).padStart(4, '0')}`;
      const paymentId = randomUUID();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(`
          INSERT INTO payments (
            id, receipt_number, payment_date, party_type, party_id, kind, amount, method, reference, note
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          paymentId, receiptNumber, payment_date, party_type, party_id, kind, numAmount, method, reference, note
        ]);

        if (party_type === 'DEALER') {
          await client.query(`
            INSERT INTO ledger_entries (
              id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit
            ) VALUES ($1, $2, 'DEALER', $3, 'PAYMENT', $4, 'RECEIPT', $5, 0, $6)
          `, [
            randomUUID(), payment_date, party_id, paymentId,
            `Payment Received [${receiptNumber}] via ${method}${reference ? ` (Ref: ${reference})` : ''}`,
            numAmount
          ]);
        } else {
          const entryType = kind === 'WORKER_ADVANCE' ? 'ADVANCE' : 'PAYOUT';
          const desc = kind === 'WORKER_ADVANCE'
            ? `Cash Advance Issued [${receiptNumber}] via ${method}${note ? ` - ${note}` : ''}`
            : `Wage Payout [${receiptNumber}] via ${method}${reference ? ` (Ref: ${reference})` : ''}`;

          await client.query(`
            INSERT INTO ledger_entries (
              id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit
            ) VALUES ($1, $2, 'WORKER', $3, 'PAYMENT', $4, $5, $6, 0, $7)
          `, [
            randomUUID(), payment_date, party_id, paymentId, entryType, desc, numAmount
          ]);
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, paymentId, receiptNumber });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 6. EDIT DEALER
    if (action === 'EDIT_DEALER') {
      const { id, name, phone, address, default_rate = 0, is_active = 1 } = body.data;
      await pool.query(`
        UPDATE dealers
        SET name = $1, phone = $2, address = $3, default_rate = $4, is_active = $5
        WHERE id = $6
      `, [name, phone || null, address || null, Number(default_rate) || 0, is_active ? 1 : 0, id]);
      return NextResponse.json({ success: true, id });
    }

    // 7. DELETE DEALER
    if (action === 'DELETE_DEALER') {
      const { id } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM ledger_entries WHERE party_id = $1 AND party_type = 'DEALER'", [id]);
        await client.query("DELETE FROM work_allocations WHERE dealer_id = $1", [id]);
        await client.query("DELETE FROM payments WHERE party_id = $1 AND party_type = 'DEALER'", [id]);
        await client.query("DELETE FROM sites WHERE dealer_id = $1", [id]);
        await client.query("DELETE FROM dealers WHERE id = $1", [id]);
        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 8. EDIT WORKER
    if (action === 'EDIT_WORKER') {
      const {
        id,
        name,
        phone,
        skill,
        default_wage = 0,
        is_active = 1,
        aadhaar_number,
        pan_number,
        voter_id,
        bank_name,
        bank_account_number,
        bank_ifsc,
        upi_id,
        father_name,
        emergency_contact_name,
        emergency_contact_phone,
        permanent_address,
        local_address,
        gender,
        blood_group,
        date_of_birth,
        joining_date,
        notes
      } = body.data;

      await pool.query(`
        UPDATE workers
        SET name = $1,
            phone = $2,
            skill = $3,
            default_wage = $4,
            is_active = $5,
            aadhaar_number = $6,
            pan_number = $7,
            voter_id = $8,
            bank_name = $9,
            bank_account_number = $10,
            bank_ifsc = $11,
            upi_id = $12,
            father_name = $13,
            emergency_contact_name = $14,
            emergency_contact_phone = $15,
            permanent_address = $16,
            local_address = $17,
            gender = $18,
            blood_group = $19,
            date_of_birth = $20,
            joining_date = $21,
            notes = $22
        WHERE id = $23
      `, [
        name,
        phone || null,
        skill,
        Number(default_wage) || 0,
        is_active ? 1 : 0,
        aadhaar_number || null,
        pan_number || null,
        voter_id || null,
        bank_name || null,
        bank_account_number || null,
        bank_ifsc || null,
        upi_id || null,
        father_name || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        permanent_address || null,
        local_address || null,
        gender || null,
        blood_group || null,
        date_of_birth || null,
        joining_date || null,
        notes || null,
        id
      ]);

      return NextResponse.json({ success: true, id });
    }

    // 9. DELETE WORKER
    if (action === 'DELETE_WORKER') {
      const { id } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM ledger_entries WHERE party_id = $1 AND party_type = 'WORKER'", [id]);
        await client.query("DELETE FROM work_allocations WHERE worker_id = $1", [id]);
        await client.query("DELETE FROM payments WHERE party_id = $1 AND party_type = 'WORKER'", [id]);
        await client.query("DELETE FROM workers WHERE id = $1", [id]);
        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 10. EDIT WORK ALLOCATION
    if (action === 'EDIT_ALLOCATION') {
      const { id, work_date, attendance, selling_rate, wage_rate, notes, site_id } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existingRes = await client.query("SELECT * FROM work_allocations WHERE id = $1", [id]);
        const existing = existingRes.rows[0];
        if (!existing) throw new Error("Allocation not found");

        const units = attendance === 'FULL' ? 1.0 : attendance === 'HALF' ? 0.5 : 0.0;
        const sRate = Number(selling_rate) || 0;
        const wRate = Number(wage_rate) || 0;
        const charge_amount = Math.round(sRate * units * 100) / 100;
        const wage_amount = Math.round(wRate * units * 100) / 100;
        const newDate = work_date || existing.work_date;

        await client.query(`
          UPDATE work_allocations
          SET work_date = $1, attendance = $2, units = $3, selling_rate = $4, wage_rate = $5, charge_amount = $6, wage_amount = $7, notes = $8, site_id = $9
          WHERE id = $10
        `, [newDate, attendance, units, sRate, wRate, charge_amount, wage_amount, notes || '', site_id || null, id]);

        const workerRes = await client.query('SELECT name FROM workers WHERE id = $1', [existing.worker_id]);
        const worker = workerRes.rows[0];

        const dealerRes = await client.query('SELECT name FROM dealers WHERE id = $1', [existing.dealer_id]);
        const dealer = dealerRes.rows[0];

        // Update Dealer Ledger Entry
        await client.query(`
          UPDATE ledger_entries
          SET entry_date = $1, description = $2, debit = $3
          WHERE source_id = $4 AND source_type = 'WORK' AND party_type = 'DEALER'
        `, [
          newDate,
          `Labour Supply: ${worker?.name || 'Worker'} (${attendance} day) @ ₹${sRate}`,
          charge_amount,
          id
        ]);

        // Update Worker Ledger Entry
        await client.query(`
          UPDATE ledger_entries
          SET entry_date = $1, description = $2, debit = $3
          WHERE source_id = $4 AND source_type = 'WORK' AND party_type = 'WORKER'
        `, [
          newDate,
          `Daily Wage Earned: ${dealer?.name || 'Dealer'} (${attendance} day) @ ₹${wRate}`,
          wage_amount,
          id
        ]);

        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 11. DELETE WORK ALLOCATION
    if (action === 'DELETE_ALLOCATION') {
      const { id } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM ledger_entries WHERE source_id = $1 AND source_type = 'WORK'", [id]);
        await client.query("DELETE FROM work_allocations WHERE id = $1", [id]);
        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 12. EDIT PAYMENT VOUCHER
    if (action === 'EDIT_PAYMENT') {
      const { id, payment_date, amount, method, reference, note } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existingRes = await client.query("SELECT * FROM payments WHERE id = $1", [id]);
        const existing = existingRes.rows[0];
        if (!existing) throw new Error("Payment voucher not found");

        const numAmount = Number(amount);
        const newDate = payment_date || existing.payment_date;
        const newMethod = method || existing.method;
        const newRef = reference !== undefined ? reference : existing.reference;
        const newNote = note !== undefined ? note : existing.note;

        await client.query(`
          UPDATE payments
          SET payment_date = $1, amount = $2, method = $3, reference = $4, note = $5
          WHERE id = $6
        `, [newDate, numAmount, newMethod, newRef || null, newNote || null, id]);

        if (existing.party_type === 'DEALER') {
          await client.query(`
            UPDATE ledger_entries
            SET entry_date = $1, credit = $2, description = $3
            WHERE source_id = $4 AND source_type = 'PAYMENT' AND party_type = 'DEALER'
          `, [
            newDate,
            numAmount,
            `Payment Received [${existing.receipt_number}] via ${newMethod}${newRef ? ` (Ref: ${newRef})` : ''}`,
            id
          ]);
        } else {
          const desc = existing.kind === 'WORKER_ADVANCE'
            ? `Cash Advance Issued [${existing.receipt_number}] via ${newMethod}${newNote ? ` - ${newNote}` : ''}`
            : `Wage Payout [${existing.receipt_number}] via ${newMethod}${newRef ? ` (Ref: ${newRef})` : ''}`;

          await client.query(`
            UPDATE ledger_entries
            SET entry_date = $1, credit = $2, description = $3
            WHERE source_id = $4 AND source_type = 'PAYMENT' AND party_type = 'WORKER'
          `, [newDate, numAmount, desc, id]);
        }

        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 13. DELETE PAYMENT VOUCHER
    if (action === 'DELETE_PAYMENT') {
      const { id } = body.data;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("DELETE FROM ledger_entries WHERE source_id = $1 AND source_type = 'PAYMENT'", [id]);
        await client.query("DELETE FROM payments WHERE id = $1", [id]);
        await client.query('COMMIT');
        return NextResponse.json({ success: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 13.1 ADD MANUAL LEDGER ADJUSTMENT
    if (action === 'ADD_ADJUSTMENT') {
      const {
        party_type,
        party_id,
        entry_date = new Date().toISOString().split('T')[0],
        entry_type = 'ADJUSTMENT',
        adjustment_type = 'DEBIT',
        amount,
        description
      } = body.data;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
      }

      const id = randomUUID();
      const debit = adjustment_type === 'DEBIT' ? numAmount : 0;
      const credit = adjustment_type === 'CREDIT' ? numAmount : 0;

      await pool.query(`
        INSERT INTO ledger_entries (
          id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit
        ) VALUES ($1, $2, $3, $4, 'ADJUSTMENT', $5, $6, $7, $8, $9)
      `, [
        id,
        entry_date,
        party_type.toUpperCase(),
        party_id,
        id,
        entry_type.toUpperCase(),
        description.trim(),
        debit,
        credit
      ]);

      return NextResponse.json({ success: true, id });
    }

    // 13.2 DELETE MANUAL LEDGER ENTRY
    if (action === 'DELETE_ENTRY' || action === 'DELETE_ADJUSTMENT') {
      const { id } = body.data;
      await pool.query("DELETE FROM ledger_entries WHERE id = $1 AND source_type = 'ADJUSTMENT'", [id]);
      return NextResponse.json({ success: true, id });
    }

    // 14. CLEAR ALL DATA
    if (action === 'CLEAR_DATA') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ledger_entries');
        await client.query('DELETE FROM payments');
        await client.query('DELETE FROM work_allocations');
        await client.query('DELETE FROM sites');
        await client.query('DELETE FROM workers');
        await client.query('DELETE FROM dealers');
        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'All data cleared successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 15. SEED CLEAN REAL SAMPLES
    if (action === 'SEED_CLEAN_SAMPLES') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ledger_entries');
        await client.query('DELETE FROM payments');
        await client.query('DELETE FROM work_allocations');
        await client.query('DELETE FROM sites');
        await client.query('DELETE FROM workers');
        await client.query('DELETE FROM dealers');

        const d1 = randomUUID();
        const d2 = randomUUID();
        await client.query('INSERT INTO dealers (id, code, name, phone, address, default_rate) VALUES ($1, $2, $3, $4, $5, $6)', [
          d1, 'DLR-001', 'Apex Construction & Infra Ltd', '+91 99100 22334', 'Plot 45, Sector 62, Noida', 950
        ]);
        await client.query('INSERT INTO dealers (id, code, name, phone, address, default_rate) VALUES ($1, $2, $3, $4, $5, $6)', [
          d2, 'Metro Line Projects (Shreeji Infra)', '+91 98200 33445', 'Metro Pier 140, Gurugram', 900
        ]);

        const s1 = randomUUID();
        const s2 = randomUUID();
        await client.query('INSERT INTO sites (id, dealer_id, name, address) VALUES ($1, $2, $3, $4)', [
          s1, d1, 'Tower A & B Finishing', 'Sector 62 Gate 1'
        ]);
        await client.query('INSERT INTO sites (id, dealer_id, name, address) VALUES ($1, $2, $3, $4)', [
          s2, d2, 'Pillar Girder Casting Yard', 'Pier 148 Site Office'
        ]);

        const w1 = randomUUID();
        const w2 = randomUUID();
        const w3 = randomUUID();
        const w4 = randomUUID();
        await client.query('INSERT INTO workers (id, code, name, phone, skill, default_wage) VALUES ($1, $2, $3, $4, $5, $6)', [
          w1, 'WRK-001', 'Raju Sharma', '+91 98111 55667', 'Head Mason (Rajmistri)', 750
        ]);
        await client.query('INSERT INTO workers (id, code, name, phone, skill, default_wage) VALUES ($1, $2, $3, $4, $5, $6)', [
          w2, 'WRK-002', 'Suresh Kumar', '+91 98222 66778', 'Assistant Mason', 650
        ]);
        await client.query('INSERT INTO workers (id, code, name, phone, skill, default_wage) VALUES ($1, $2, $3, $4, $5, $6)', [
          w3, 'WRK-003', 'Bablu Yadav', '+91 98333 77889', 'General Helper (Beldar)', 550
        ]);
        await client.query('INSERT INTO workers (id, code, name, phone, skill, default_wage) VALUES ($1, $2, $3, $4, $5, $6)', [
          w4, 'WRK-004', 'Dilip Verma', '+91 98444 88990', 'Barbender / Saria Worker', 700
        ]);

        await client.query('COMMIT');
        return NextResponse.json({ success: true, message: 'Database populated with clean sample dealers & workers' });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // 14. ADD NEW COMPANY
    if (action === 'ADD_COMPANY') {
      const {
        name,
        short_name,
        tagline,
        est_year,
        gstin,
        phone,
        email,
        address,
        website,
        authorized_signatory,
        statement_title,
        statement_subtitle,
        terms_notes,
        set_as_active
      } = body.data;

      const newId = randomUUID();

      if (set_as_active) {
        await pool.query('UPDATE company_profile SET is_default = 0');
      }

      const insertRes = await pool.query(
        `INSERT INTO company_profile (
          id, name, short_name, tagline, est_year, gstin, phone, email, address, website,
          authorized_signatory, statement_title, statement_subtitle, terms_notes, is_active, is_default, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, $15, NOW(), NOW()
        ) RETURNING *`,
        [
          newId,
          name || 'NEW COMPANY ENTITY',
          short_name || 'NC',
          tagline || '',
          est_year || '',
          gstin || '',
          phone || '',
          email || '',
          address || '',
          website || '',
          authorized_signatory || `FOR ${name || 'NEW COMPANY'}`,
          statement_title || 'STATEMENT OF SUBLEDGER ACCOUNT',
          statement_subtitle || 'Double-Entry Verified & Reconciled',
          terms_notes || '',
          set_as_active ? 1 : 0
        ]
      );

      return NextResponse.json({
        success: true,
        company: insertRes.rows[0],
        message: 'New company entity added successfully'
      });
    }

    // 15. UPDATE COMPANY PROFILE (CRUD EDIT)
    if (action === 'UPDATE_COMPANY_PROFILE') {
      const {
        id,
        name,
        short_name,
        tagline,
        est_year,
        gstin,
        phone,
        email,
        address,
        website,
        authorized_signatory,
        statement_title,
        statement_subtitle,
        terms_notes,
        logo_url,
        is_default
      } = body.data;

      const targetId = id || 'default';

      if (is_default === 1) {
        await pool.query('UPDATE company_profile SET is_default = 0 WHERE id != $1', [targetId]);
      }

      const updateRes = await pool.query(
        `INSERT INTO company_profile (
          id, name, short_name, tagline, est_year, gstin, phone, email, address, website,
          authorized_signatory, statement_title, statement_subtitle, terms_notes, logo_url, is_active, is_default, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1, $16, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          tagline = EXCLUDED.tagline,
          est_year = EXCLUDED.est_year,
          gstin = EXCLUDED.gstin,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          website = EXCLUDED.website,
          authorized_signatory = EXCLUDED.authorized_signatory,
          statement_title = EXCLUDED.statement_title,
          statement_subtitle = EXCLUDED.statement_subtitle,
          terms_notes = EXCLUDED.terms_notes,
          logo_url = COALESCE(EXCLUDED.logo_url, company_profile.logo_url, '/logo.png'),
          is_default = CASE WHEN $16 = 1 THEN 1 ELSE company_profile.is_default END,
          updated_at = NOW()
        RETURNING *`,
        [
          targetId,
          name || 'RR CONSTRUCTION',
          short_name || 'RR',
          tagline || '',
          est_year || '',
          gstin || '',
          phone || '',
          email || '',
          address || '',
          website || '',
          authorized_signatory || 'FOR RR CONSTRUCTION',
          statement_title || 'STATEMENT OF SUBLEDGER ACCOUNT',
          statement_subtitle || 'Double-Entry Verified & Reconciled',
          terms_notes || '',
          logo_url || '/logo.png',
          is_default === 1 ? 1 : 0
        ]
      );

      return NextResponse.json({
        success: true,
        companyProfile: updateRes.rows[0],
        message: 'Company profile updated successfully'
      });
    }

    // 16. DELETE COMPANY PROFILE (CRUD DELETE)
    if (action === 'DELETE_COMPANY') {
      const { id } = body.data;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
      }

      const countRes = await pool.query('SELECT COUNT(*)::INT as total FROM company_profile');
      if (countRes.rows[0].total <= 1) {
        return NextResponse.json({ success: false, error: 'At least one company profile must be retained.' }, { status: 400 });
      }

      const toDeleteRes = await pool.query('SELECT is_default FROM company_profile WHERE id = $1', [id]);
      const wasDefault = toDeleteRes.rows[0]?.is_default === 1;

      await pool.query('DELETE FROM company_profile WHERE id = $1', [id]);

      // If the default one was deleted, make the first remaining one default
      if (wasDefault) {
        await pool.query(`
          UPDATE company_profile
          SET is_default = 1
          WHERE id = (SELECT id FROM company_profile ORDER BY created_at ASC LIMIT 1)
        `);
      }

      return NextResponse.json({
        success: true,
        message: 'Company entity deleted successfully'
      });
    }

    // 17. SET ACTIVE COMPANY
    if (action === 'SET_ACTIVE_COMPANY') {
      const { id } = body.data;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
      }

      await pool.query('UPDATE company_profile SET is_default = 0');
      const activeRes = await pool.query('UPDATE company_profile SET is_default = 1, updated_at = NOW() WHERE id = $1 RETURNING *', [id]);

      return NextResponse.json({
        success: true,
        companyProfile: activeRes.rows[0],
        message: 'Active company profile switched successfully'
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
