'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Calendar,
  CreditCard,
  FileText,
  MapPin,
  Phone,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Building,
  TrendingUp,
  X,
  Clock,
  Briefcase,
  Loader2
} from 'lucide-react';
import { useSqlStore, Dealer, Worker, WorkAllocation, Payment } from '@/lib/storage/useSqlStore';
import { Skeleton } from '@/components/ui/Skeleton';

interface PartyHistoryModalProps {
  partyType: 'DEALER' | 'WORKER';
  partyId: string;
  onClose: () => void;
  onRecordPayment?: (partyType: 'DEALER' | 'WORKER', partyId: string) => void;
}

export default function PartyHistoryModal({
  partyType,
  partyId,
  onClose,
  onRecordPayment
}: PartyHistoryModalProps) {
  const { dealers, workers, allocations, payments, sites, loading } = useSqlStore();
  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'PAYMENTS' | 'KYC'>('SHIFTS');
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    setIsPreparing(true);
    const timer = setTimeout(() => {
      setIsPreparing(false);
    }, 240);
    return () => clearTimeout(timer);
  }, [partyId, partyType]);

  const isDealer = partyType === 'DEALER';
  const dealer = isDealer ? dealers.find((d) => d.id === partyId) : null;
  const worker = !isDealer ? workers.find((w) => w.id === partyId) : null;

  if (!dealer && !worker) return null;

  // Filter Allocations (Work Shifts)
  const partyAllocations = allocations.filter((a) =>
    isDealer ? a.dealer_id === dealer?.id : a.worker_id === worker?.id
  );

  // Filter Payments (Receipts, Wage Payouts, Advances)
  const partyPayments = payments.filter(
    (p) => p.party_type === partyType && p.party_id === (isDealer ? dealer?.id : worker?.id) && !p.is_reversed
  );

  // Calculations
  const formatINR = (val: number) => '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // Dealer Metrics
  const totalBilled = isDealer ? partyAllocations.reduce((sum, a) => sum + (a.charge_amount || 0), 0) : 0;
  const totalReceived = isDealer
    ? partyPayments.filter((p) => p.kind === 'DEALER_RECEIPT').reduce((sum, p) => sum + p.amount, 0)
    : 0;
  const totalDealerRefunds = isDealer
    ? partyPayments.filter((p) => p.kind === 'DEALER_REFUND').reduce((sum, p) => sum + p.amount, 0)
    : 0;
  const dealerBalanceDue = totalBilled - totalReceived + totalDealerRefunds;

  // Worker Metrics
  const totalWagesEarned = !isDealer ? partyAllocations.reduce((sum, a) => sum + (a.wage_amount || 0), 0) : 0;
  const totalPayouts = !isDealer
    ? partyPayments.filter((p) => p.kind === 'WORKER_PAYOUT').reduce((sum, p) => sum + p.amount, 0)
    : 0;
  const totalAdvances = !isDealer
    ? partyPayments.filter((p) => p.kind === 'WORKER_ADVANCE').reduce((sum, p) => sum + p.amount, 0)
    : 0;
  const workerNetPayable = totalWagesEarned - (totalPayouts + totalAdvances);

  const partyName = isDealer ? dealer?.name : worker?.name;
  const partyCode = isDealer ? dealer?.code : worker?.code;
  const partyPhone = isDealer ? dealer?.phone : worker?.phone;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0 shadow-inner">
              {isDealer ? (
                <Building2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <Users className="w-6 h-6 text-sky-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider ${
                    isDealer
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-sky-950 text-sky-300 border border-sky-800'
                  }`}
                >
                  {isDealer ? 'Client Dealer' : `Worker • ${worker?.skill || 'General'}`}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-1">{partyName}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono mt-0.5">
                {partyPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-500" /> {partyPhone}
                  </span>
                )}
                {isDealer && dealer?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-zinc-500" /> {dealer.address}
                  </span>
                )}
                {isDealer && (
                  <span className="text-zinc-300 font-bold">
                    Default Rate: ₹{dealer?.default_rate}/day
                  </span>
                )}
                {!isDealer && (
                  <span className="text-zinc-300 font-bold">
                    Daily Wage: ₹{worker?.default_wage}/day
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/reports?type=${partyType.toLowerCase()}&id=${partyId}`}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-semibold border border-zinc-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" /> Full Subledger
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Summary Metric Strip */}
        <div className="p-4 bg-zinc-950/70 border-b border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          {isPreparing || loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                <Skeleton className="w-20 h-3 rounded bg-zinc-800" />
                <Skeleton className="w-28 h-6 rounded bg-zinc-800" />
                <Skeleton className="w-16 h-2.5 rounded bg-zinc-800" />
              </div>
            ))
          ) : isDealer ? (
            <>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Total Work Billed</span>
                <strong className="text-sm sm:text-base font-black font-mono text-white block mt-0.5">{formatINR(totalBilled)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">{partyAllocations.length} Shifts Supplied</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">Total Received</span>
                <strong className="text-sm sm:text-base font-black font-mono text-emerald-400 block mt-0.5">{formatINR(totalReceived)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">{partyPayments.filter(p => p.kind === 'DEALER_RECEIPT').length} Receipts</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Refunds Returned</span>
                <strong className="text-sm sm:text-base font-black font-mono text-zinc-300 block mt-0.5">{formatINR(totalDealerRefunds)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">Reversals & Credits</span>
              </div>
              <div className={`p-3 rounded-xl border ${dealerBalanceDue > 0 ? 'bg-amber-950/30 border-amber-800/60' : 'bg-emerald-950/30 border-emerald-800/60'}`}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Outstanding Due</span>
                <strong className={`text-sm sm:text-base font-black font-mono block mt-0.5 ${dealerBalanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatINR(dealerBalanceDue)}
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {dealerBalanceDue > 0 ? 'Pending Collection' : 'Settled in Full'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Total Wages Earned</span>
                <strong className="text-sm sm:text-base font-black font-mono text-white block mt-0.5">{formatINR(totalWagesEarned)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">{partyAllocations.length} Shifts Worked</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 block">Wages Disbursed</span>
                <strong className="text-sm sm:text-base font-black font-mono text-sky-400 block mt-0.5">{formatINR(totalPayouts)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">{partyPayments.filter(p => p.kind === 'WORKER_PAYOUT').length} Vouchers</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">Cash Advances</span>
                <strong className="text-sm sm:text-base font-black font-mono text-amber-400 block mt-0.5">{formatINR(totalAdvances)}</strong>
                <span className="text-[10px] text-zinc-500 font-mono">{partyPayments.filter(p => p.kind === 'WORKER_ADVANCE').length} Advances</span>
              </div>
              <div className={`p-3 rounded-xl border ${workerNetPayable > 0 ? 'bg-amber-950/30 border-amber-800/60' : workerNetPayable < 0 ? 'bg-rose-950/30 border-rose-800/60' : 'bg-emerald-950/30 border-emerald-800/60'}`}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Net Payable</span>
                <strong className={`text-sm sm:text-base font-black font-mono block mt-0.5 ${workerNetPayable > 0 ? 'text-amber-400' : workerNetPayable < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {workerNetPayable < 0 ? `-₹${Math.abs(workerNetPayable).toLocaleString('en-IN')}` : formatINR(workerNetPayable)}
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {workerNetPayable > 0 ? 'Unpaid Balance' : workerNetPayable < 0 ? 'Overpaid Advance' : 'Settled'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Modal Tab Navigation */}
        <div className="px-5 pt-3 border-b border-zinc-800 bg-zinc-950 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 font-mono text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'SHIFTS'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Work & Shift Log ({partyAllocations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 font-mono text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PAYMENTS'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Payment Vouchers ({partyPayments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('KYC')}
            className={`flex items-center gap-2 pb-3 px-3 border-b-2 font-mono text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'KYC'
                ? 'border-white text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Profile & KYC Details</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 max-h-[50vh]">
          {isPreparing || loading ? (
            <div className="py-12 space-y-4 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-lg animate-pulse">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-white tracking-wide">
                  Tabulating Shift History & Subledger Balances...
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Loading verified double-entry ledgers from Neon PostgreSQL
                </p>
              </div>
              <div className="space-y-2 max-w-md mx-auto pt-2">
                <Skeleton className="h-8 w-full rounded-lg bg-zinc-800/80" />
                <Skeleton className="h-8 w-full rounded-lg bg-zinc-800/50" />
                <Skeleton className="h-8 w-full rounded-lg bg-zinc-800/30" />
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: WORK & SHIFTS */}
              {activeTab === 'SHIFTS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
                <span>Detailed record of dates, job sites, shifts, rates and daily charges:</span>
                <span>{partyAllocations.length} Total Shift Records</span>
              </div>

              {partyAllocations.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  <Calendar className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                  <p className="text-xs font-semibold text-zinc-400">No shift records found for this party</p>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono font-semibold text-[11px]">
                        <th className="p-3">Date</th>
                        <th className="p-3">{isDealer ? 'Worker Assigned' : 'Client Dealer & Site'}</th>
                        <th className="p-3 text-center">Attendance</th>
                        <th className="p-3 text-right">{isDealer ? 'Rate / Shift' : 'Wage / Shift'}</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/60 font-mono">
                      {partyAllocations.map((a) => {
                        const shiftSite = sites.find((s) => s.id === a.site_id);
                        return (
                          <tr key={a.id} className="hover:bg-zinc-800/40">
                            <td className="p-3 font-bold text-white whitespace-nowrap">{a.work_date}</td>
                            <td className="p-3">
                              <div className="font-sans font-semibold text-zinc-200">
                                {isDealer ? a.worker_name : a.dealer_name}
                              </div>
                              {shiftSite && (
                                <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-sans">
                                  <MapPin className="w-2.5 h-2.5" /> {shiftSite.name}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  a.attendance === 'FULL'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : a.attendance === 'HALF'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}
                              >
                                {a.attendance === 'FULL' ? '1.0 Full' : a.attendance === 'HALF' ? '0.5 Half' : 'Absent'}
                              </span>
                            </td>
                            <td className="p-3 text-right text-zinc-300">
                              ₹{isDealer ? a.selling_rate : a.wage_rate}
                            </td>
                            <td className="p-3 text-right font-bold text-white">
                              {formatINR(isDealer ? a.charge_amount : a.wage_amount)}
                            </td>
                            <td className="p-3 text-[11px] text-zinc-400 font-sans max-w-xs truncate">
                              {a.notes || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS & VOUCHERS */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
                <span>Receipts received and disbursements paid out:</span>
                <span>{partyPayments.length} Total Payment Vouchers</span>
              </div>

              {partyPayments.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
                  <CreditCard className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                  <p className="text-xs font-semibold text-zinc-400">No payment vouchers recorded for this party</p>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-mono font-semibold text-[11px]">
                        <th className="p-3">Date & Voucher #</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Payment Channel</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Reference / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/60 font-mono">
                      {partyPayments.map((p) => {
                        const isReceipt = p.kind === 'DEALER_RECEIPT';
                        return (
                          <tr key={p.id} className="hover:bg-zinc-800/40">
                            <td className="p-3">
                              <span className="font-bold text-white block">{p.payment_date}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">{p.receipt_number}</span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isReceipt
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : p.kind === 'WORKER_ADVANCE'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-sky-950 text-sky-300 border border-sky-800'
                                }`}
                              >
                                {isReceipt ? 'Receipt (+)' : p.kind === 'WORKER_ADVANCE' ? 'Advance (−)' : 'Wage Payout (−)'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-300">
                                {p.method}
                              </span>
                            </td>
                            <td className={`p-3 text-right font-bold text-sm ${isReceipt ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isReceipt ? '+' : '−'}{formatINR(p.amount)}
                            </td>
                            <td className="p-3 font-sans text-zinc-300 text-xs">
                              {p.reference && (
                                <div className="text-[10px] font-mono text-zinc-400">Ref: {p.reference}</div>
                              )}
                              <div>{p.note || '—'}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: KYC & BANK DETAILS */}
          {activeTab === 'KYC' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> General & Contact Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-500">Legal Name:</span>
                      <span className="font-bold text-white">{partyName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-500">Identifier Code:</span>
                      <span className="font-mono text-zinc-300">{partyCode}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-zinc-850">
                      <span className="text-zinc-500">Phone Number:</span>
                      <span className="font-mono text-zinc-300">{partyPhone || 'Not Provided'}</span>
                    </div>
                    {isDealer && (
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Office / Site Address:</span>
                        <span className="text-zinc-300 text-right max-w-xs">{dealer?.address || 'Not Provided'}</span>
                      </div>
                    )}
                    {!isDealer && (
                      <>
                        <div className="flex justify-between py-1 border-b border-zinc-850">
                          <span className="text-zinc-500">Skill / Trade:</span>
                          <span className="font-bold text-zinc-200">{worker?.skill || 'General'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-850">
                          <span className="text-zinc-500">Aadhaar / ID Proof:</span>
                          <span className="font-mono text-zinc-300">{worker?.aadhaar_number || 'Not Provided'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-sky-400" /> Banking & Settlement Info
                  </h4>
                  {!isDealer ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Bank Name:</span>
                        <span className="font-bold text-white">{worker?.bank_name || 'Not on file'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Account Number:</span>
                        <span className="font-mono text-zinc-300">{worker?.bank_account_number || 'Not on file'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">IFSC Code:</span>
                        <span className="font-mono text-zinc-300">{worker?.bank_ifsc || 'Not on file'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">UPI / VPA ID:</span>
                        <span className="font-mono text-zinc-300">{worker?.upi_id || 'Not on file'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Standard Daily Wage:</span>
                        <span className="font-mono font-bold text-emerald-400">₹{worker?.default_wage || 0}/day</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Standard Selling Rate:</span>
                        <span className="font-mono font-bold text-emerald-400">₹{dealer?.default_rate || 0}/day</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Active Job Sites:</span>
                        <span className="font-mono text-zinc-300">{sites.filter(s => s.dealer_id === dealer?.id).length} Sites Registered</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-850">
                        <span className="text-zinc-500">Subledger ID:</span>
                        <span className="font-mono text-zinc-400">{dealer?.id}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <Link
            href={`/reports?type=${partyType.toLowerCase()}&id=${partyId}`}
            className="text-xs font-mono font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> View Ledger & Export Statement
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
