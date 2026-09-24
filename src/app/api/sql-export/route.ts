import { NextResponse } from 'next/server';
import { pool, initDb } from '@/lib/db/postgres';

export async function GET() {
  try {
    await initDb();
    const dealers = (await pool.query('SELECT * FROM dealers')).rows;
    const sites = (await pool.query('SELECT * FROM sites')).rows;
    const workers = (await pool.query('SELECT * FROM workers')).rows;
    const allocations = (await pool.query('SELECT * FROM work_allocations')).rows;
    const payments = (await pool.query('SELECT * FROM payments')).rows;
    const entries = (await pool.query('SELECT * FROM ledger_entries')).rows;

    let sql = `-- LABOUR MASTER SQL DUMP (LAYERBASE POSTGRESQL)\n-- Exported on: ${new Date().toISOString()}\n\n`;

    // Dealers
    dealers.forEach((d: any) => {
      sql += `INSERT INTO dealers (id, code, name, phone, address, default_rate, is_active, created_at) VALUES ('${d.id}', '${d.code}', '${d.name.replace(/'/g, "''")}', ${d.phone ? `'${d.phone}'` : 'NULL'}, ${d.address ? `'${d.address.replace(/'/g, "''")}'` : 'NULL'}, ${d.default_rate}, ${d.is_active}, '${d.created_at}');\n`;
    });

    // Sites
    sites.forEach((s: any) => {
      sql += `INSERT INTO sites (id, dealer_id, name, address, is_active, created_at) VALUES ('${s.id}', '${s.dealer_id}', '${s.name.replace(/'/g, "''")}', ${s.address ? `'${s.address.replace(/'/g, "''")}'` : 'NULL'}, ${s.is_active}, '${s.created_at}');\n`;
    });

    // Workers
    workers.forEach((w: any) => {
      sql += `INSERT INTO workers (id, code, name, phone, skill, default_wage, is_active, created_at) VALUES ('${w.id}', '${w.code}', '${w.name.replace(/'/g, "''")}', ${w.phone ? `'${w.phone}'` : 'NULL'}, '${w.skill.replace(/'/g, "''")}', ${w.default_wage}, ${w.is_active}, '${w.created_at}');\n`;
    });

    // Allocations
    allocations.forEach((a: any) => {
      sql += `INSERT INTO work_allocations (id, work_date, worker_id, dealer_id, site_id, attendance, units, selling_rate, wage_rate, charge_amount, wage_amount, notes, status, created_at) VALUES ('${a.id}', '${a.work_date}', '${a.worker_id}', '${a.dealer_id}', ${a.site_id ? `'${a.site_id}'` : 'NULL'}, '${a.attendance}', ${a.units}, ${a.selling_rate}, ${a.wage_rate}, ${a.charge_amount}, ${a.wage_amount}, ${a.notes ? `'${a.notes.replace(/'/g, "''")}'` : 'NULL'}, '${a.status}', '${a.created_at}');\n`;
    });

    // Payments
    payments.forEach((p: any) => {
      sql += `INSERT INTO payments (id, receipt_number, payment_date, party_type, party_id, kind, amount, method, reference, note, is_reversed, created_at) VALUES ('${p.id}', '${p.receipt_number}', '${p.payment_date}', '${p.party_type}', '${p.party_id}', '${p.kind}', ${p.amount}, '${p.method}', ${p.reference ? `'${p.reference.replace(/'/g, "''")}'` : 'NULL'}, ${p.note ? `'${p.note.replace(/'/g, "''")}'` : 'NULL'}, ${p.is_reversed}, '${p.created_at}');\n`;
    });

    // Ledger Entries
    entries.forEach((e: any) => {
      sql += `INSERT INTO ledger_entries (id, entry_date, party_type, party_id, source_type, source_id, entry_type, description, debit, credit, created_at) VALUES ('${e.id}', '${e.entry_date}', '${e.party_type}', '${e.party_id}', '${e.source_type}', '${e.source_id}', '${e.entry_type}', '${e.description.replace(/'/g, "''")}', ${e.debit}, ${e.credit}, '${e.created_at}');\n`;
    });

    return new Response(sql, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="labour_master_dump_${new Date().toISOString().split('T')[0]}.sql"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
