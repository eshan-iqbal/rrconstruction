'use client';

import React from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  FileText,
  IndianRupee,
  Send,
  ArrowRight,
  CalendarCheck,
  Zap,
  UserPlus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { useSqlStore } from '@/lib/storage/useSqlStore';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const { dealers, sites, workers, allocations, payments, metrics, loading } = useSqlStore();

  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDate();
  const todayAllocations = allocations.filter((a) => a.work_date === todayStr);
  const todayPayments = payments.filter((p) => p.payment_date === todayStr && !p.is_reversed);

  const todayWorkersCount = new Set(todayAllocations.map((a) => a.worker_id)).size;
  const todayWageTotal = todayAllocations.reduce((acc, a) => acc + (a.wage_amount || 0), 0);
  const todayReceipts = todayPayments
    .filter((p) => p.kind === 'DEALER_RECEIPT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const todayAdvances = todayPayments
    .filter((p) => p.kind === 'WORKER_ADVANCE')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const totalLabourUnits = allocations.reduce((acc, a) => acc + (a.units || 1), 0);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const currentDateDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* 1. Header Console Banner */}
      <div className="p-4 sm:p-6 md:p-7 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
                Console
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {currentDateDisplay}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
              Labour Supply & Subledger
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Dispatch crews to client dealers, issue advances, manage vouchers, and track real-time ledgers.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 font-mono pt-1 sm:pt-0">
            <Link
              href="/attendance"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md active:scale-95 flex-1 sm:flex-initial text-center touch-press"
            >
              <Send className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              <span>Send Crew</span>
            </Link>
            <Link
              href="/workers"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-xs uppercase tracking-wide border border-zinc-800 transition-all active:scale-95 flex-1 sm:flex-initial text-center touch-press"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Workers</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Core KPI Matrix (2-in-a-row on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Tile 1: Client Dealers */}
        <Link
          href="/customers"
          className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg flex flex-col justify-between space-y-2.5 group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-950 text-white border border-zinc-800 group-hover:border-zinc-700">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {loading ? (
              <Skeleton className="w-12 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-1.5 sm:px-2 py-0.5 rounded border border-zinc-800/80">
                {dealers.length} DLR
              </span>
            )}
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400 block truncate">
              Client Dealers
            </span>
            {loading ? (
              <Skeleton className="w-24 h-7 my-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-base sm:text-xl md:text-2xl font-black text-white font-mono mt-0.5 truncate">
                {formatINR(metrics.totalReceivable)}
              </div>
            )}
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
              {loading ? <Skeleton className="w-20 h-3 rounded bg-zinc-800 inline-block" /> : `${sites.length} Active Sites`}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-xs font-mono font-semibold text-zinc-400 group-hover:text-white flex items-center justify-between">
            <span className="truncate">Manage Dealers</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>

        {/* Tile 2: Worker Crew */}
        <Link
          href="/workers"
          className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg flex flex-col justify-between space-y-2.5 group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-950 text-white border border-zinc-800 group-hover:border-zinc-700">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {loading ? (
              <Skeleton className="w-14 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-1.5 sm:px-2 py-0.5 rounded border border-zinc-800/80">
                {workers.length} CREW
              </span>
            )}
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400 block truncate">
              Registered Crew
            </span>
            {loading ? (
              <Skeleton className="w-28 h-7 my-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-base sm:text-xl md:text-2xl font-black text-white font-mono mt-0.5 truncate">
                {workers.length} Workers
              </div>
            )}
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
              {loading ? <Skeleton className="w-24 h-3 rounded bg-zinc-800 inline-block" /> : `${todayWorkersCount} Dispatched Today`}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-xs font-mono font-semibold text-zinc-400 group-hover:text-white flex items-center justify-between">
            <span className="truncate">Worker Portal</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>

        {/* Tile 3: Wages Payable */}
        <Link
          href="/reports"
          className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg flex flex-col justify-between space-y-2.5 group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-950 text-white border border-zinc-800 group-hover:border-zinc-700">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            {loading ? (
              <Skeleton className="w-14 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-1.5 sm:px-2 py-0.5 rounded border border-zinc-800/80">
                {totalLabourUnits}x Shifts
              </span>
            )}
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400 block truncate">
              Wages Payable
            </span>
            {loading ? (
              <Skeleton className="w-24 h-7 my-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-base sm:text-xl md:text-2xl font-black text-zinc-200 font-mono mt-0.5 truncate">
                {formatINR(metrics.totalWagePayable)}
              </div>
            )}
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
              Accrued Labour Cost
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-xs font-mono font-semibold text-zinc-400 group-hover:text-white flex items-center justify-between">
            <span className="truncate">Subledger Statements</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>

        {/* Tile 4: Active Advances */}
        <Link
          href="/payments"
          className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all shadow-lg flex flex-col justify-between space-y-2.5 group"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-zinc-950 text-white border border-zinc-800 group-hover:border-zinc-700">
              <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded border border-emerald-500/20">
              Active
            </span>
          </div>

          <div>
            <span className="text-[9px] sm:text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-400 block truncate">
              Worker Advances
            </span>
            {loading ? (
              <Skeleton className="w-24 h-7 my-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-base sm:text-xl md:text-2xl font-black text-zinc-300 font-mono mt-0.5 truncate">
                {formatINR(metrics.totalAdvances)}
              </div>
            )}
            <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
              Recoverable via Ledgers
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 text-[10px] sm:text-xs font-mono font-semibold text-zinc-400 group-hover:text-white flex items-center justify-between">
            <span className="truncate">Cashbook Vouchers</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </Link>
      </div>

      {/* 3. Today's Live Summary Strip (2-in-a-row on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Today's Dispatched Crew */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="w-16 h-5 my-0.5 rounded bg-zinc-800" />
            ) : (
              <div className="text-sm sm:text-base font-black text-white font-mono truncate">{todayWorkersCount}</div>
            )}
            <div className="text-[10px] text-zinc-400 font-mono truncate">Crew On Duty</div>
          </div>
        </div>

        {/* Today's Labour Cost */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="w-20 h-5 my-0.5 rounded bg-zinc-800" />
            ) : (
              <div className="text-sm sm:text-base font-black text-white font-mono truncate">{formatINR(todayWageTotal)}</div>
            )}
            <div className="text-[10px] text-zinc-400 font-mono truncate">Today's Wages</div>
          </div>
        </div>

        {/* Today's Dealer Collections */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ArrowDownRight className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="w-20 h-5 my-0.5 rounded bg-zinc-800" />
            ) : (
              <div className="text-sm sm:text-base font-black text-emerald-400 font-mono truncate">+{formatINR(todayReceipts)}</div>
            )}
            <div className="text-[10px] text-zinc-400 font-mono truncate">Today's Receipts</div>
          </div>
        </div>

        {/* Today's Advances Issued */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="w-20 h-5 my-0.5 rounded bg-zinc-800" />
            ) : (
              <div className="text-sm sm:text-base font-black text-amber-400 font-mono truncate">-{formatINR(todayAdvances)}</div>
            )}
            <div className="text-[10px] text-zinc-400 font-mono truncate">Advances Issued</div>
          </div>
        </div>
      </div>

      {/* 4. 1-Tap Quick Action Tiles (2 in row on mobile) */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-zinc-300" />
            Quick 1-Tap Actions
          </span>
          <span className="text-[10px] font-mono text-zinc-500">Layerbase PostgreSQL Cloud</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
          <Link
            href="/attendance"
            className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-zinc-200 group-hover:text-white truncate">
              <Send className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Send Crew</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          <Link
            href="/customers"
            className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-zinc-200 group-hover:text-white truncate">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Add Dealer</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          <Link
            href="/workers"
            className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-zinc-200 group-hover:text-white truncate">
              <UserPlus className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">Add Worker</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>

          <Link
            href="/payments"
            className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 text-zinc-200 group-hover:text-white truncate">
              <Receipt className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">New Voucher</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>
      </div>

      {/* 5. Live Feeds: Allocations & Cashbook Ledgers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Worker Allocations */}
        <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2 font-mono">
              <CalendarCheck className="w-4 h-4 text-zinc-300" />
              Recent Allocations
            </h3>
            <Link href="/attendance" className="text-[11px] sm:text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1">
              Send Crew →
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between animate-pulse">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-32 h-4 rounded bg-zinc-800" />
                    <Skeleton className="w-48 h-3 rounded bg-zinc-800" />
                  </div>
                  <Skeleton className="w-16 h-6 rounded bg-zinc-800 shrink-0" />
                </div>
              ))
            ) : allocations.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <Users className="w-8 h-8 mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-500 font-mono">
                  No workers sent yet.
                </p>
                <Link
                  href="/attendance"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold text-[11px] font-mono uppercase"
                >
                  <Send className="w-3 h-3" /> + Send Workers
                </Link>
              </div>
            ) : (
              allocations.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-white truncate">{a.worker_name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono truncate">
                      {a.dealer_name} • <span className="text-zinc-500">{a.work_date}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold text-[9px] sm:text-[10px]">
                      {a.attendance} ({a.units}x)
                    </span>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Wage: ₹{a.wage_amount}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payment Vouchers */}
        <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2 font-mono">
              <IndianRupee className="w-4 h-4 text-zinc-300" />
              Recent Cashbook Vouchers
            </h3>
            <Link href="/payments" className="text-[11px] sm:text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1">
              View All →
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="w-8 h-8 rounded-xl bg-zinc-800 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="w-32 h-4 rounded bg-zinc-800" />
                      <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-5 rounded bg-zinc-800 shrink-0" />
                </div>
              ))
            ) : payments.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center font-mono">
                No payment vouchers recorded yet.
              </p>
            ) : (
              payments.slice(0, 5).map((p) => {
                const isPositive = p.kind === 'DEALER_RECEIPT';
                const initialLetter = p.party_name ? p.party_name.charAt(0).toUpperCase() : 'V';

                return (
                  <div
                    key={p.id}
                    className="p-2.5 sm:p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-xs text-white font-mono shrink-0">
                        {initialLetter}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{p.party_name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {p.receipt_number} • {p.method}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div className={`font-bold text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? '+' : '-'}₹{p.amount}
                      </div>
                      <div className="text-[10px] text-zinc-500">{p.payment_date}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
