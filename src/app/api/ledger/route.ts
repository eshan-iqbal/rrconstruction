import { NextResponse } from 'next/server';
import { pool, initDb } from '@/lib/db/postgres';
import { randomUUID } from 'crypto';

export async function GET(req: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const summary = searchParams.get('summary') === 'true' || searchParams.get('view') === 'all';

    // 1. ALL PARTIES SUMMARY / TRIAL BALANCE VIEW
    if (summary) {
      const dealersRes = await pool.query('SELECT * FROM dealers ORDER BY name ASC');
      const workersRes = await pool.query('SELECT * FROM workers ORDER BY name ASC');

      const dealerLedgerRes = await pool.query(`
        SELECT 
          party_id,
          COALESCE(SUM(debit), 0)::FLOAT as total_debit,
          COALESCE(SUM(credit), 0)::FLOAT as total_credit,
          MAX(entry_date) as last_activity
        FROM ledger_entries
        WHERE party_type = 'DEALER'
        GROUP BY party_id
      `);

      const workerLedgerRes = await pool.query(`
        SELECT 
          party_id,
          COALESCE(SUM(debit), 0)::FLOAT as total_debit,
          COALESCE(SUM(credit), 0)::FLOAT as total_credit,
          MAX(entry_date) as last_activity
        FROM ledger_entries
        WHERE party_type = 'WORKER'
        GROUP BY party_id
      `);

      const dealerMap = new Map(dealerLedgerRes.rows.map(r => [r.party_id, r]));
      const workerMap = new Map(workerLedgerRes.rows.map(r => [r.party_id, r]));

      let totalDealerBilled = 0;
      let totalDealerPaid = 0;
      let totalDealerReceivable = 0;

      const dealerSummaries = dealersRes.rows.map(d => {
        const stats = dealerMap.get(d.id) || { total_debit: 0, total_credit: 0, last_activity: null };
        const billed = Number(stats.total_debit) || 0;
        const paid = Number(stats.total_credit) || 0;
        const balanceDue = billed - paid; // Positive = Receivable due from dealer

        totalDealerBilled += billed;
        totalDealerPaid += paid;
        if (balanceDue > 0) totalDealerReceivable += balanceDue;

        return {
          id: d.id,
          code: d.code,
          name: d.name,
          phone: d.phone,
          address: d.address,
          defaultRate: d.default_rate,
          totalBilled: billed,
          totalPaid: paid,
          balanceDue,
          lastActivity: stats.last_activity || d.created_at?.split('T')[0] || '-'
        };
      });

      let totalWorkerWages = 0;
      let totalWorkerPayouts = 0;
      let totalWorkerPayable = 0;
      let totalWorkerAdvances = 0;

      const workerSummaries = workersRes.rows.map(w => {
        const stats = workerMap.get(w.id) || { total_debit: 0, total_credit: 0, last_activity: null };
        const wages = Number(stats.total_debit) || 0;
        const payouts = Number(stats.total_credit) || 0;
        const netPayable = wages - payouts; // Positive = Wage payable to worker, Negative = Outstanding advance

        totalWorkerWages += wages;
        totalWorkerPayouts += payouts;
        if (netPayable > 0) totalWorkerPayable += netPayable;
        if (netPayable < 0) totalWorkerAdvances += Math.abs(netPayable);

        return {
          id: w.id,
          code: w.code,
          name: w.name,
          phone: w.phone,
          skill: w.skill,
          defaultWage: w.default_wage,
          totalWages: wages,
          totalPayouts: payouts,
          netPayable,
          lastActivity: stats.last_activity || w.created_at?.split('T')[0] || '-'
        };
      });

      return NextResponse.json({
        success: true,
        summary: {
          totalDealerBilled,
          totalDealerPaid,
          totalDealerReceivable,
          totalWorkerWages,
          totalWorkerPayouts,
          totalWorkerPayable, 
          totalWorkerAdvances,
          dealers: dealerSummaries,
          workers: workerSummaries
        }
      });
    }

    // 2. INDIVIDUAL PARTY STATEMENT VIEW
    const rawPartyType = searchParams.get('partyType') || searchParams.get('type') || searchParams.get('party_type');
    const partyType = rawPartyType ? (rawPartyType.toUpperCase() as 'DEALER' | 'WORKER') : 'DEALER';
    const partyId = searchParams.get('partyId') || searchParams.get('id') || searchParams.get('party_id');
    const fromDate = searchParams.get('fromDate') || '2020-01-01';
    const toDate = searchParams.get('toDate') || new Date().toISOString().split('T')[0];

    if (!partyType || !partyId) {
      return NextResponse.json({ success: false, error: 'partyType and partyId required' }, { status: 400 });
    }

    // Party details
    const partyRes = partyType === 'DEALER'
      ? await pool.query('SELECT * FROM dealers WHERE id = $1', [partyId])
      : await pool.query('SELECT * FROM workers WHERE id = $1', [partyId]);

    const party = partyRes.rows[0];
    if (!party) {
      return NextResponse.json({ success: false, error: 'Party not found' }, { status: 404 });
    }

    // Opening Balance before fromDate
    const openingRes = await pool.query(`
      SELECT
        COALESCE(SUM(debit), 0)::FLOAT as debits,
        COALESCE(SUM(credit), 0)::FLOAT as credits
      FROM ledger_entries
      WHERE party_type = $1 AND party_id = $2 AND entry_date < $3
    `, [partyType, partyId, fromDate]);

    const opening = openingRes.rows[0] || { debits: 0, credits: 0 };
    const openingBalance = Number(opening.debits) - Number(opening.credits);

    // Entries in date range
    const entriesRes = await pool.query(`
      SELECT *
      FROM ledger_entries
      WHERE party_type = $1 AND party_id = $2 AND entry_date >= $3 AND entry_date <= $4
      ORDER BY entry_date ASC, created_at ASC
    `, [partyType, partyId, fromDate, toDate]);

    let runningBalance = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = entriesRes.rows.map((entry) => {
      const debitNum = Number(entry.debit) || 0;
      const creditNum = Number(entry.credit) || 0;
      totalDebit += debitNum;
      totalCredit += creditNum;
      runningBalance = runningBalance + debitNum - creditNum;

      return {
        id: entry.id,
        date: entry.entry_date,
        entryType: entry.entry_type,
        sourceType: entry.source_type,
        sourceId: entry.source_id,
        description: entry.description,
        debit: debitNum,
        credit: creditNum,
        runningBalance
      };
    });

    const closingBalance = runningBalance;

    return NextResponse.json({
      success: true,
      party,
      statement: {
        partyId,
        partyName: party.name,
        partyCode: party.code,
        partyPhone: party.phone || '',
        partySkill: party.skill || '',
        partyAddress: party.address || '',
        partyType,
        fromDate,
        toDate,
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance,
        rows
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
    const { action, data } = body;

    // Direct Manual Ledger Adjustment Entry
    if (action === 'ADD_ADJUSTMENT') {
      const {
        party_type,
        party_id,
        entry_date = new Date().toISOString().split('T')[0],
        entry_type = 'ADJUSTMENT',
        adjustment_type = 'DEBIT', // 'DEBIT' or 'CREDIT'
        amount,
        description
      } = data;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
      }

      if (!party_type || !party_id || !description?.trim()) {
        return NextResponse.json({ success: false, error: 'Party, date, and description required' }, { status: 400 });
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

    // Edit Manual Ledger Adjustment
    if (action === 'EDIT_ADJUSTMENT') {
      const {
        id,
        entry_date,
        entry_type = 'ADJUSTMENT',
        adjustment_type = 'DEBIT',
        amount,
        description
      } = data;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
      }

      const debit = adjustment_type === 'DEBIT' ? numAmount : 0;
      const credit = adjustment_type === 'CREDIT' ? numAmount : 0;

      await pool.query(`
        UPDATE ledger_entries
        SET entry_date = $1, entry_type = $2, description = $3, debit = $4, credit = $5
        WHERE id = $6 AND source_type = 'ADJUSTMENT'
      `, [
        entry_date,
        entry_type.toUpperCase(),
        description.trim(),
        debit,
        credit,
        id
      ]);

      return NextResponse.json({ success: true, id });
    }

    // Delete a Manual Ledger Entry
    if (action === 'DELETE_ENTRY') {
      const { id } = data;
      await pool.query("DELETE FROM ledger_entries WHERE id = $1 AND source_type = 'ADJUSTMENT'", [id]);
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

