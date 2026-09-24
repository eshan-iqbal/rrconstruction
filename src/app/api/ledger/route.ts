import { NextResponse } from 'next/server';
import { pool, initDb } from '@/lib/db/postgres';

export async function GET(req: Request) {
  try {
    await initDb();
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get('partyType') as 'DEALER' | 'WORKER';
    const partyId = searchParams.get('partyId');
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
