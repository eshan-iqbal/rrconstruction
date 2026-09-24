'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Users,
  Search,
  IndianRupee,
  RotateCcw,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useSqlStore } from '@/lib/storage/useSqlStore';
import { Skeleton } from '@/components/ui/Skeleton';

function LedgerContent() {
  const { dealers, workers } = useSqlStore();
  const searchParams = useSearchParams();

  const initialPartyType = (searchParams.get('partyType') as 'DEALER' | 'WORKER') || 'DEALER';
  const initialPartyId = searchParams.get('partyId') || '';

  const [partyType, setPartyType] = useState<'DEALER' | 'WORKER'>(initialPartyType);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId);
  const [fromDate, setFromDate] = useState<string>('2020-01-01');
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [statementData, setStatementData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select first party when type changes
  useEffect(() => {
    if (!selectedPartyId || (partyType === 'DEALER' && !dealers.some(d => d.id === selectedPartyId)) || (partyType === 'WORKER' && !workers.some(w => w.id === selectedPartyId))) {
      if (partyType === 'DEALER' && dealers.length > 0) {
        setSelectedPartyId(dealers[0].id);
      } else if (partyType === 'WORKER' && workers.length > 0) {
        setSelectedPartyId(workers[0].id);
      }
    }
  }, [partyType, dealers, workers, selectedPartyId]);

  // Fetch statement from API
  useEffect(() => {
    if (!selectedPartyId) return;

    let isMounted = true;
    setLoading(true);
    fetch(`/api/ledger?partyType=${partyType}&partyId=${selectedPartyId}&fromDate=${fromDate}&toDate=${toDate}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setStatementData(json.statement);
        }
      })
      .catch((err) => console.error('Failed to load statement:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [partyType, selectedPartyId, fromDate, toDate]);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const handleExportCSV = () => {
    if (!statementData) return;

    const sanitize = (str: string) => {
      if (typeof str !== 'string') return str;
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        return `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = ['Date', 'Description', 'Entry Type', 'Debit (+)', 'Credit (-)', 'Running Balance'];
    const rows = statementData.rows.map((r: any) => [
      sanitize(r.date),
      sanitize(r.description),
      sanitize(r.entryType),
      r.debit.toFixed(2),
      r.credit.toFixed(2),
      r.runningBalance.toFixed(2)
    ]);

    const csvContent = [
      `"Subledger Statement for: ${statementData.partyName} (${statementData.partyCode})"`,
      `"Type: ${partyType === 'DEALER' ? 'Client Dealer' : 'Worker'}"`,
      `"Period: ${fromDate} to ${toDate}"`,
      `"Opening Balance: ${statementData.openingBalance.toFixed(2)}"`,
      `"Closing Net Balance: ${statementData.closingBalance.toFixed(2)}"`,
      '',
      headers.join(','),
      ...rows.map((e: any) => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ledger_${statementData.partyCode}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner (Hidden in Print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">Real-time Statements</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Ledgers for Dealers & Workers</h1>
          <p className="text-xs text-zinc-400">
            Real-time financial statement for every client dealer and worker personnel with running balance.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-all shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" /> Print Statement
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wide transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-black stroke-[2.5]" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Controls (Hidden in Print) */}
      <div className="no-print p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center gap-3">
        {/* Switch Pillar: Dealer vs Worker */}
        <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800 font-mono">
          <button
            onClick={() => {
              setPartyType('DEALER');
              if (dealers.length > 0) setSelectedPartyId(dealers[0].id);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              partyType === 'DEALER' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Dealer Ledgers
          </button>
          <button
            onClick={() => {
              setPartyType('WORKER');
              if (workers.length > 0) setSelectedPartyId(workers[0].id);
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              partyType === 'WORKER' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Worker Ledgers
          </button>
        </div>

        {/* Party Selector */}
        <div className="flex-1 min-w-[220px]">
          <select
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
          >
            {partyType === 'DEALER'
              ? dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))
              : workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code} - {w.skill})
                  </option>
                ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400">From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
          <span className="text-zinc-400">To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>
      </div>

      {/* Statement View */}
      {loading ? (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800 gap-4">
            <div className="space-y-2">
              <Skeleton className="w-48 h-3 rounded bg-zinc-800" />
              <Skeleton className="w-64 h-7 rounded bg-zinc-800" />
              <Skeleton className="w-36 h-4 rounded bg-zinc-800" />
            </div>
            <div className="space-y-2 sm:text-right">
              <Skeleton className="w-28 h-3 rounded bg-zinc-800 sm:ml-auto" />
              <Skeleton className="w-40 h-5 rounded bg-zinc-800 sm:ml-auto" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <Skeleton className="w-20 h-3 rounded bg-zinc-800" />
                <Skeleton className="w-28 h-6 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-10 rounded-xl bg-zinc-950" />
            ))}
          </div>
        </div>
      ) : statementData && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 card-print">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800 gap-4">
            <div>
              <div className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider font-mono">
                RR Construction Subledger Statement
              </div>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">{statementData.partyName}</h2>
              <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-mono">
                <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-white font-bold">
                  Code: {statementData.partyCode}
                </span>
                <span>•</span>
                <span>{partyType === 'DEALER' ? 'Client Dealer Account' : 'Worker Wage Account'}</span>
              </div>
            </div>

            <div className="sm:text-right font-mono">
              <div className="text-xs text-zinc-400 uppercase tracking-wider">Statement Window</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {fromDate} to {toDate}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Base: INR (₹)</div>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Opening Balance</div>
              <div className="text-lg font-mono font-bold text-zinc-200 mt-1">
                {formatINR(statementData.openingBalance)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
                {partyType === 'DEALER' ? 'Total Work Billed' : 'Total Wages Earned'}
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">{formatINR(statementData.totalDebit)}</div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">
                {partyType === 'DEALER' ? 'Payments Received' : 'Payouts & Advances'}
              </div>
              <div className="text-lg font-mono font-bold text-white mt-1">{formatINR(statementData.totalCredit)}</div>
            </div>

            <div className="p-4 rounded-xl bg-white text-black">
              <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-600">
                {partyType === 'DEALER' ? 'Net Receivable Due' : 'Net Wage Payable'}
              </div>
              <div className="text-xl font-mono font-black mt-1 text-black">
                {formatINR(statementData.closingBalance)}
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Description & Voucher</th>
                  <th className="p-3">Entry Type</th>
                  <th className="p-3 text-right">Debit (+)</th>
                  <th className="p-3 text-right">Credit (-)</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70 font-mono">
                {/* Opening Balance Row */}
                <tr className="bg-zinc-950 text-zinc-400 font-sans italic">
                  <td className="p-3">{fromDate}</td>
                  <td className="p-3" colSpan={4}>
                    [Opening Balance as of {fromDate}]
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-white">
                    {formatINR(statementData.openingBalance)}
                  </td>
                </tr>

                {statementData.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 font-sans">
                      No ledger transactions recorded in this date range.
                    </td>
                  </tr>
                ) : (
                  statementData.rows.map((row: any) => (
                    <tr key={row.id} className="hover:bg-zinc-850/60 transition-colors">
                      <td className="p-3 text-zinc-300 whitespace-nowrap">{row.date}</td>
                      <td className="p-3 font-sans text-white text-xs max-w-md">{row.description}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            row.entryType === 'CHARGE' || row.entryType === 'WAGE'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : row.entryType === 'RECEIPT' || row.entryType === 'PAYOUT'
                              ? 'bg-white text-black'
                              : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {row.entryType}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {row.debit > 0 ? formatINR(row.debit) : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-zinc-300">
                        {row.credit > 0 ? formatINR(row.credit) : '-'}
                      </td>
                      <td className="p-3 text-right font-bold text-white">{formatINR(row.runningBalance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono">
            <div>Double-entry ledger statement — RR Construction</div>
            <div>
              Closing Balance:{' '}
              <strong className="text-white font-mono text-sm">{formatINR(statementData.closingBalance)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400 font-mono">Loading ledger data...</div>}>
      <LedgerContent />
    </Suspense>
  );
}
