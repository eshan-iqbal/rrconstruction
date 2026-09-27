'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Receipt,
  Calendar,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  FileText,
  Clock,
  Sparkles,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  MapPin,
  Phone,
  HardHat,
  Landmark,
  QrCode,
  X,
  ChevronRight,
  ExternalLink,
  History,
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { useSqlStore, Payment } from '@/lib/storage/useSqlStore';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import PartyHistoryModal from '@/components/ui/PartyHistoryModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function PaymentsPage() {
  const { dealers, sites, workers, allocations, payments, recordPayment, editPayment, deletePayment, loading } = useSqlStore();
  const { toast } = useToast();

  const [filterPartyType, setFilterPartyType] = useState<'ALL' | 'DEALER' | 'WORKER'>('ALL');
  const [filterKind, setFilterKind] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Party Details Modal State (When clicking on any Dealer or Worker)
  const [selectedDetailParty, setSelectedDetailParty] = useState<{ type: 'DEALER' | 'WORKER'; id: string } | null>(null);
  const [partyDetailTab, setPartyDetailTab] = useState<'WORK' | 'PAYMENTS' | 'KYC'>('WORK');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partyType, setPartyType] = useState<'DEALER' | 'WORKER'>('DEALER');
  const [transactionKind, setTransactionKind] = useState<'DEALER_RECEIPT' | 'DEALER_REFUND' | 'WORKER_PAYOUT' | 'WORKER_ADVANCE'>('DEALER_RECEIPT');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'UPI' | 'CASH' | 'BANK'>('UPI');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Payment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editMethod, setEditMethod] = useState<'UPI' | 'CASH' | 'BANK'>('UPI');
  const [editReference, setEditReference] = useState('');
  const [editNote, setEditNote] = useState('');

  // Delete Confirmation State
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const filteredPayments = payments.filter((p) => {
    if (filterPartyType !== 'ALL' && p.party_type !== filterPartyType) return false;
    if (filterKind !== 'ALL' && p.kind !== filterKind) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (p.party_name && p.party_name.toLowerCase().includes(q)) ||
        (p.receipt_number && p.receipt_number.toLowerCase().includes(q)) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.note && p.note.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenModal = (pType: 'DEALER' | 'WORKER', defaultKind: 'DEALER_RECEIPT' | 'DEALER_REFUND' | 'WORKER_PAYOUT' | 'WORKER_ADVANCE') => {
    setPartyType(pType);
    setTransactionKind(defaultKind);
    setSelectedPartyId('');
    setAmount('');
    setReference('');
    setNote('');
    setIsModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || amount === '' || Number(amount) <= 0) {
      toast.warning('Please select a valid party and enter an amount greater than 0.', 'Validation Error');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordPayment({
        party_type: partyType,
        party_id: selectedPartyId,
        kind: transactionKind,
        payment_date: paymentDate,
        amount: Number(amount),
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined
      });

      toast.success(
        `Payment voucher for ₹${Number(amount).toLocaleString('en-IN')} posted to subledger successfully!`,
        'Payment Voucher Recorded'
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error recording payment';
      toast.error(errorMsg, 'Payment Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPaymentDate(payment.payment_date);
    setEditAmount(payment.amount);
    setEditMethod(payment.method);
    setEditReference(payment.reference || '');
    setEditNote(payment.note || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || editAmount === '' || Number(editAmount) <= 0) {
      toast.warning('Please enter a valid amount greater than 0.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      await editPayment({
        id: editingPayment.id,
        payment_date: editPaymentDate,
        amount: Number(editAmount),
        method: editMethod,
        reference: editReference.trim() || undefined,
        note: editNote.trim() || undefined
      });

      setIsEditModalOpen(false);
      setEditingPayment(null);
      toast.success(`Voucher ${editingPayment.receipt_number} updated and subledger synchronized!`, 'Voucher Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment voucher.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = (payment: Payment) => {
    setPaymentToDelete(payment);
  };

  const handleConfirmDeletePayment = async () => {
    if (!paymentToDelete) return;
    try {
      await deletePayment(paymentToDelete.id);
      toast.success(`Payment voucher ${paymentToDelete.receipt_number} deleted and ledger reversed.`, 'Voucher Removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment voucher.', 'Error');
    } finally {
      setPaymentToDelete(null);
    }
  };

  // Financial Cashflow Computations
  const nonReversedPayments = payments.filter((p) => !p.is_reversed);

  // Inflow (Money In): Dealer Receipts
  const totalInflow = nonReversedPayments
    .filter((p) => p.kind === 'DEALER_RECEIPT')
    .reduce((sum, p) => sum + p.amount, 0);

  const inflowCount = nonReversedPayments.filter((p) => p.kind === 'DEALER_RECEIPT').length;

  // Outflows (Money Out / Spent):
  const totalWagesPaid = nonReversedPayments
    .filter((p) => p.kind === 'WORKER_PAYOUT')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAdvancesPaid = nonReversedPayments
    .filter((p) => p.kind === 'WORKER_ADVANCE')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefundsPaid = nonReversedPayments
    .filter((p) => p.kind === 'DEALER_REFUND')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOutflow = totalWagesPaid + totalAdvancesPaid + totalRefundsPaid;
  const outflowCount = nonReversedPayments.filter((p) => p.kind !== 'DEALER_RECEIPT').length;

  const netCashflow = totalInflow - totalOutflow;

  // Mode breakdown
  const cashIn = nonReversedPayments.filter((p) => p.kind === 'DEALER_RECEIPT' && p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
  const cashOut = nonReversedPayments.filter((p) => p.kind !== 'DEALER_RECEIPT' && p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
  const netCash = cashIn - cashOut;

  const upiIn = nonReversedPayments.filter((p) => p.kind === 'DEALER_RECEIPT' && p.method === 'UPI').reduce((s, p) => s + p.amount, 0);
  const upiOut = nonReversedPayments.filter((p) => p.kind !== 'DEALER_RECEIPT' && p.method === 'UPI').reduce((s, p) => s + p.amount, 0);
  const netUpi = upiIn - upiOut;

  const bankIn = nonReversedPayments.filter((p) => p.kind === 'DEALER_RECEIPT' && p.method === 'BANK').reduce((s, p) => s + p.amount, 0);
  const bankOut = nonReversedPayments.filter((p) => p.kind !== 'DEALER_RECEIPT' && p.method === 'BANK').reduce((s, p) => s + p.amount, 0);
  const netBank = bankIn - bankOut;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
              Cashbook & Vouchers
            </span>
            {loading ? (
              <Skeleton className="w-28 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="text-xs text-zinc-400 font-mono">Neon Cloud • {payments.length} Vouchers</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Payments & Cashflow Tracker</h1>
          <p className="text-xs text-zinc-400">
            Real-time breakdown of where money came from (Dealer Receipts) and where money was spent (Worker Wages & Advances).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap font-mono">
          <button
            onClick={() => handleOpenModal('DEALER', 'DEALER_RECEIPT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95"
          >
            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" /> + Receive Dealer Payment
          </button>
          <button
            onClick={() => handleOpenModal('WORKER', 'WORKER_PAYOUT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-wide border border-zinc-700 transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" /> Pay Worker Wage
          </button>
          <button
            onClick={() => handleOpenModal('WORKER', 'WORKER_ADVANCE')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wide border border-zinc-800 transition-all active:scale-95"
          >
            <CreditCard className="w-4 h-4" /> Cash Advance
          </button>
        </div>
      </div>

      {/* 4 Primary Cash Flow & Money Movement Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Money Received (Inflow) */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Money In (Received)
            </span>
            {loading ? (
              <Skeleton className="w-16 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
                {inflowCount} Receipts
              </span>
            )}
          </div>
          <div>
            {loading ? (
              <div className="space-y-1.5 my-1">
                <Skeleton className="w-32 h-8 rounded bg-zinc-800" />
                <Skeleton className="w-44 h-3 rounded bg-zinc-800" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  +{formatINR(totalInflow)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                  Total collected from Client Dealers
                </p>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            {loading ? (
              <Skeleton className="w-full h-3 rounded bg-zinc-800" />
            ) : (
              <>
                <span>UPI: ₹{upiIn.toLocaleString('en-IN')}</span>
                <span>Cash: ₹{cashIn.toLocaleString('en-IN')}</span>
                <span>Bank: ₹{bankIn.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Total Money Spent (Outflow) */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Money Out (Spent)
            </span>
            {loading ? (
              <Skeleton className="w-16 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 border border-rose-800/60 text-rose-300">
                {outflowCount} Vouchers
              </span>
            )}
          </div>
          <div>
            {loading ? (
              <div className="space-y-1.5 my-1">
                <Skeleton className="w-32 h-8 rounded bg-zinc-800" />
                <Skeleton className="w-44 h-3 rounded bg-zinc-800" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black font-mono text-rose-400 tracking-tight">
                  -{formatINR(totalOutflow)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                  Wages Paid & Cash Advances
                </p>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
            {loading ? (
              <Skeleton className="w-full h-3 rounded bg-zinc-800" />
            ) : (
              <>
                <span>Wages: ₹{totalWagesPaid.toLocaleString('en-IN')}</span>
                <span>Advances: ₹{totalAdvancesPaid.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Net Cash Balance */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-white" />
              Net Retained Cash
            </span>
            {loading ? (
              <Skeleton className="w-14 h-4 rounded bg-zinc-800" />
            ) : (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                netCashflow >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {netCashflow >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            )}
          </div>
          <div>
            {loading ? (
              <div className="space-y-1.5 my-1">
                <Skeleton className="w-28 h-8 rounded bg-zinc-800" />
                <Skeleton className="w-44 h-3 rounded bg-zinc-800" />
              </div>
            ) : (
              <>
                <div className={`text-2xl font-black font-mono tracking-tight ${
                  netCashflow >= 0 ? 'text-white' : 'text-rose-400'
                }`}>
                  {netCashflow >= 0 ? '+' : '-'}{formatINR(netCashflow)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                  (Total Money In − Total Money Out)
                </p>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400">
            {loading ? (
              <Skeleton className="w-36 h-3 rounded bg-zinc-800" />
            ) : (
              'Operating Net Cashflow Margin'
            )}
          </div>
        </div>

        {/* Card 4: Payment Channels Balance */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-300">
              Payment Channels
            </span>
            {loading ? (
              <Skeleton className="w-16 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                Live Splits
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2 py-1 font-mono text-xs">
              <Skeleton className="w-full h-3.5 rounded bg-zinc-800" />
              <Skeleton className="w-full h-3.5 rounded bg-zinc-800" />
              <Skeleton className="w-full h-3.5 rounded bg-zinc-800" />
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-200">
                <span className="text-zinc-400 text-[11px]">💵 Cash In Hand:</span>
                <strong className={netCash >= 0 ? 'text-white' : 'text-rose-400'}>
                  {netCash >= 0 ? '+' : '-'}{formatINR(netCash)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-zinc-200">
                <span className="text-zinc-400 text-[11px]">📱 UPI / QR:</span>
                <strong className={netUpi >= 0 ? 'text-white' : 'text-rose-400'}>
                  {netUpi >= 0 ? '+' : '-'}{formatINR(netUpi)}
                </strong>
              </div>
              <div className="flex items-center justify-between text-zinc-200">
                <span className="text-zinc-400 text-[11px]">🏦 Bank Wire:</span>
                <strong className={netBank >= 0 ? 'text-white' : 'text-rose-400'}>
                  {netBank >= 0 ? '+' : '-'}{formatINR(netBank)}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by party, receipt #, reference, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Party Filter */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setFilterPartyType('ALL')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                filterPartyType === 'ALL' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Parties
            </button>
            <button
              onClick={() => setFilterPartyType('DEALER')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                filterPartyType === 'DEALER' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Dealers (Inflow)
            </button>
            <button
              onClick={() => setFilterPartyType('WORKER')}
              className={`px-3 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                filterPartyType === 'WORKER' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Workers (Outflow)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white font-sans"
            >
              <option value="ALL">All Transaction Types</option>
              <option value="DEALER_RECEIPT">Dealer Receipt (Inflow +)</option>
              <option value="WORKER_PAYOUT">Worker Wage Payout (Outflow −)</option>
              <option value="WORKER_ADVANCE">Worker Cash Advance (Outflow −)</option>
              <option value="DEALER_REFUND">Dealer Refund (Outflow −)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Date & Voucher #</th>
                <th className="p-3.5">Source / Destination (From / To)</th>
                <th className="p-3.5">Flow Direction & Type</th>
                <th className="p-3.5">Payment Channel</th>
                <th className="p-3.5 text-right">Amount (INR)</th>
                <th className="p-3.5">Notes / Purpose</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 font-sans">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3.5"><Skeleton className="w-28 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-36 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-24 h-5 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-20 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5 text-right"><Skeleton className="w-20 h-4 rounded bg-zinc-800 ml-auto" /></td>
                    <td className="p-3.5"><Skeleton className="w-28 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5 text-center"><Skeleton className="w-12 h-6 rounded bg-zinc-800 mx-auto" /></td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-zinc-400">
                    <Receipt className="w-10 h-10 mx-auto text-zinc-600 mb-2.5" />
                    <p className="text-sm font-semibold text-zinc-300">No payment vouchers recorded</p>
                    <p className="text-xs text-zinc-500 mt-1">Use the buttons above to record receipts or wage disbursements.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isIncoming = p.kind === 'DEALER_RECEIPT';

                  return (
                    <tr key={p.id} className="hover:bg-zinc-850/60 transition-colors">
                      {/* Date & Receipt */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-white text-xs">{p.payment_date}</div>
                        <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{p.receipt_number}</span>
                      </td>

                      {/* Party - From / To */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                            {isIncoming ? 'FROM' : 'TO'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailParty({ type: p.party_type, id: p.party_id })}
                            className="font-bold text-white text-sm flex items-center gap-1.5 hover:text-emerald-400 transition-colors text-left group cursor-pointer"
                            title="Click to view full work shift & payment history"
                          >
                            {p.party_type === 'DEALER' ? (
                              <Building2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
                            )}
                            <span className="underline decoration-zinc-700 group-hover:decoration-emerald-400 underline-offset-2">
                              {p.party_name || 'Party'}
                            </span>
                            <Eye className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                          {p.party_code ? `${p.party_code} • ` : ''}{p.party_type} SUBLEDGER
                        </span>
                      </td>

                      {/* Flow Direction & Type */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg ${
                            isIncoming
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                              : p.kind === 'WORKER_ADVANCE'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                          }`}
                        >
                          {isIncoming ? (
                            <>
                              <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>INFLOW • RECEIPT</span>
                            </>
                          ) : p.kind === 'WORKER_ADVANCE' ? (
                            <>
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>OUTFLOW • ADVANCE</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>OUTFLOW • WAGE PAYOUT</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Method & Ref */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            p.method === 'CASH'
                              ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                              : p.method === 'UPI'
                              ? 'bg-purple-950/40 border-purple-800/50 text-purple-300'
                              : 'bg-blue-950/40 border-blue-800/50 text-blue-300'
                          }`}>
                            {p.method}
                          </span>
                        </div>
                        {p.reference && (
                          <div className="text-[10px] text-zinc-400 mt-1 truncate max-w-[150px]">
                            Ref: <span className="text-zinc-200">{p.reference}</span>
                          </div>
                        )}
                      </td>

                      {/* Amount with Color Coding */}
                      <td className="p-3.5 text-right font-mono font-black text-sm">
                        <span className={isIncoming ? 'text-emerald-400' : 'text-rose-400'}>
                          {isIncoming ? '+' : '−'}
                          {formatINR(p.amount)}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="p-3.5 text-zinc-300 text-[11px] max-w-xs truncate">
                        {p.note || (isIncoming ? `Receipt from ${p.party_name}` : `Disbursement to ${p.party_name}`)}
                      </td>

                      {/* Action -> View Details / Edit / Delete / Ledger */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailParty({ type: p.party_type, id: p.party_id })}
                            title="View Full Work & Payment History"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-950/80 text-zinc-300 hover:text-emerald-400 border border-zinc-700 hover:border-emerald-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditPayment(p)}
                            title="Edit Voucher"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            title="Delete Voucher"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-900 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/reports?type=${p.party_type.toLowerCase()}&id=${p.party_id}`}
                            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] transition-colors inline-flex items-center"
                            title="View Double-Entry Ledger"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">Record Financial Voucher</h3>
                  <p className="text-xs text-zinc-400">Posts atomic credit/debit directly to party subledger</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4">
              {/* Account Category Switcher */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                  1. Choose Account Subledger
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPartyType('DEALER');
                      setTransactionKind('DEALER_RECEIPT');
                      setSelectedPartyId('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      partyType === 'DEALER'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Dealer Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPartyType('WORKER');
                      setTransactionKind('WORKER_PAYOUT');
                      setSelectedPartyId('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      partyType === 'WORKER'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Worker Account
                  </button>
                </div>
              </div>

              {/* Transaction Kind Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                  2. Voucher Transaction Type *
                </label>
                <select
                  value={transactionKind}
                  onChange={(e) => setTransactionKind(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  {partyType === 'DEALER' ? (
                    <>
                      <option value="DEALER_RECEIPT">Dealer Payment Receipt (Reduces Amount Due)</option>
                      <option value="DEALER_REFUND">Dealer Refund Issued (Increases Amount Due)</option>
                    </>
                  ) : (
                    <>
                      <option value="WORKER_PAYOUT">Worker Wage Payout (Settles accrued wage balance)</option>
                      <option value="WORKER_ADVANCE">Worker Cash Advance (Pre-paid advance)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Party Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                  3. Select {partyType === 'DEALER' ? 'Dealer' : 'Worker'} *
                </label>
                <select
                  required
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <option value="">-- Choose {partyType === 'DEALER' ? 'Dealer' : 'Worker'} --</option>
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

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter amount (₹)"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Method & Reference */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Mode</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK">NEFT / RTGS / Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">UTR / Ref Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-987654"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Ledger Memo / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly settlement, advance for medical, on-account..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedPartyId || amount === '' || Number(amount) <= 0 || !paymentDate || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Posting...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Payment Voucher */}
      {isEditModalOpen && editingPayment && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-750">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Edit Voucher: {editingPayment.receipt_number}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Party: {editingPayment.party_name || editingPayment.party_id} ({editingPayment.party_type})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPayment(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditPayment} className="p-6 space-y-4">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono">
                <span className="text-zinc-400">Transaction Kind:</span>{' '}
                <strong className="text-white">{editingPayment.kind.replace(/_/g, ' ')}</strong>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Enter amount (₹)"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={editPaymentDate}
                    onChange={(e) => setEditPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Method & Reference */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Mode</label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK">NEFT / RTGS / Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">UTR / Ref Number</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-987654"
                    value={editReference}
                    onChange={(e) => setEditReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Ledger Memo / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly settlement, advance for medical, on-account..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingPayment || editAmount === '' || Number(editAmount) <= 0 || !editPaymentDate || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Updating...' : 'Update Voucher & Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Voucher Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!paymentToDelete}
        title="Permanently Delete Payment Voucher?"
        itemType="Financial Voucher"
        itemName={paymentToDelete ? `${paymentToDelete.kind.replace(/_/g, ' ')} • ₹${paymentToDelete.amount}` : ''}
        itemCode={paymentToDelete?.receipt_number}
        warningMessage="Are you sure you want to delete this payment voucher? This will reverse the transaction and immediately remove it from the double-entry subledger history."
        confirmButtonText="Delete Voucher"
        onConfirm={handleConfirmDeletePayment}
        onClose={() => setPaymentToDelete(null)}
      />

      {/* Party Details & History Modal (When clicking on any Dealer or Worker) */}
      {selectedDetailParty && (
        <PartyHistoryModal
          partyType={selectedDetailParty.type}
          partyId={selectedDetailParty.id}
          onClose={() => setSelectedDetailParty(null)}
        />
      )}
    </div>
  );
}
