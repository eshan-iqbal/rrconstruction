'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Printer,
  Download,
  Building2,
  Users,
  Search,
  IndianRupee,
  Calendar,
  Filter,
  Share2,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Layers,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Trash2,
  Sparkles,
  ExternalLink,
  BookOpen,
  PieChart,
  HelpCircle,
  Loader2,
  Check,
  X,
  BadgeCheck,
  ShieldCheck,
  Building,
  Phone,
  MapPin,
  Clock
} from 'lucide-react';
import { useSqlStore, Dealer, Worker, WorkAllocation, Payment } from '@/lib/storage/useSqlStore';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

function LedgerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    companyProfile,
    dealers,
    workers,
    sites,
    allocations,
    payments,
    editAllocation,
    deleteAllocation,
    editPayment,
    deletePayment,
    addLedgerAdjustment,
    editLedgerAdjustment,
    deleteLedgerEntry,
    refresh
  } = useSqlStore();

  // Navigation tab: 'STATEMENT' (Single Party Subledger) or 'SUMMARY' (All-Parties Master Ledger)
  const initialView = (searchParams.get('view') === 'summary' || searchParams.get('tab') === 'summary') ? 'SUMMARY' : 'STATEMENT';
  const [activeTab, setActiveTab] = useState<'STATEMENT' | 'SUMMARY'>(initialView);

  // Statement Filters
  const rawPartyType = searchParams.get('partyType') || searchParams.get('type') || searchParams.get('party_type');
  const initialPartyType = (rawPartyType && rawPartyType.toUpperCase() === 'WORKER') ? 'WORKER' : 'DEALER';
  const initialPartyId = searchParams.get('partyId') || searchParams.get('id') || searchParams.get('party_id') || '';

  const [partyType, setPartyType] = useState<'DEALER' | 'WORKER'>(initialPartyType);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId);

  // Date Presets Calculation Helper
  const getPresetDates = (preset: string) => {
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      const dStr = formatYMD(today);
      return { from: dStr, to: dStr };
    }
    if (preset === 'THIS_WEEK') {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return { from: formatYMD(monday), to: formatYMD(today) };
    }
    if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: formatYMD(firstDay), to: formatYMD(today) };
    }
    if (preset === 'LAST_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: formatYMD(firstDay), to: formatYMD(lastDay) };
    }
    if (preset === 'THIS_FY') {
      const curMonth = today.getMonth(); // 0-indexed (April is 3)
      const curYear = today.getFullYear();
      const fyStartYear = curMonth >= 3 ? curYear : curYear - 1;
      const firstDay = new Date(fyStartYear, 3, 1); // 1st April
      return { from: formatYMD(firstDay), to: formatYMD(today) };
    }
    if (preset === 'ALL') {
      return { from: '2020-01-01', to: formatYMD(today) };
    }
    return { from: '2020-01-01', to: formatYMD(today) };
  };

  const [activeDatePreset, setActiveDatePreset] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('2020-01-01');
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Table row filter & search
  const [tableSearch, setTableSearch] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');

  // Master summary tab states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySearch, setSummarySearch] = useState('');
  const [summaryFilter, setSummaryFilter] = useState<'ALL' | 'PENDING' | 'SETTLED'>('ALL');

  // Subledger statement data
  const [statementData, setStatementData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------------
  // MODAL STATES FOR EDITING AND DELETING TRANSACTIONS
  // -------------------------------------------------------------

  // 1. Add / Edit Manual Adjustment Modal
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [editingAdjustmentId, setEditingAdjustmentId] = useState<string | null>(null);
  const [adjustmentDate, setAdjustmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adjustmentType, setAdjustmentType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [adjustmentCategory, setAdjustmentCategory] = useState<string>('MANUAL_ADJUSTMENT');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number | ''>('');
  const [adjustmentDesc, setAdjustmentDesc] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // 2. Edit Work Allocation Modal
  const [isEditAllocationModalOpen, setIsEditAllocationModalOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<WorkAllocation | null>(null);
  const [editAllocWorkDate, setEditAllocWorkDate] = useState('');
  const [editAllocAttendance, setEditAllocAttendance] = useState<'FULL' | 'HALF' | 'ABSENT'>('FULL');
  const [editAllocSellingRate, setEditAllocSellingRate] = useState<number | ''>('');
  const [editAllocWageRate, setEditAllocWageRate] = useState<number | ''>('');
  const [editAllocSiteId, setEditAllocSiteId] = useState('');
  const [editAllocNotes, setEditAllocNotes] = useState('');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);

  // 3. Edit Payment Voucher Modal
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPayDate, setEditPayDate] = useState('');
  const [editPayAmount, setEditPayAmount] = useState<number | ''>('');
  const [editPayMethod, setEditPayMethod] = useState<'UPI' | 'CASH' | 'BANK'>('UPI');
  const [editPayRef, setEditPayRef] = useState('');
  const [editPayNote, setEditPayNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // 4. Universal Delete Confirmation Modal
  const [rowToDelete, setRowToDelete] = useState<any>(null);

  // Format INR Currency
  const formatINR = (val: number) => {
    return '₹' + Math.abs(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  // Format Display Date (e.g. 24 Sep 2026)
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  // Sync state if URL query params change
  useEffect(() => {
    const rawType = searchParams.get('partyType') || searchParams.get('type') || searchParams.get('party_type');
    if (rawType) {
      setPartyType(rawType.toUpperCase() === 'WORKER' ? 'WORKER' : 'DEALER');
    }
    const rawId = searchParams.get('partyId') || searchParams.get('id') || searchParams.get('party_id');
    if (rawId) {
      setSelectedPartyId(rawId);
    }
    const rawTab = searchParams.get('view') || searchParams.get('tab');
    if (rawTab === 'summary') {
      setActiveTab('SUMMARY');
    } else if (rawTab === 'statement') {
      setActiveTab('STATEMENT');
    }
  }, [searchParams]);

  // Auto-select first party when list loads or partyType changes if not selected
  useEffect(() => {
    if (!selectedPartyId || (partyType === 'DEALER' && !dealers.some((d) => d.id === selectedPartyId)) || (partyType === 'WORKER' && !workers.some((w) => w.id === selectedPartyId))) {
      if (partyType === 'DEALER' && dealers.length > 0) {
        setSelectedPartyId(dealers[0].id);
      } else if (partyType === 'WORKER' && workers.length > 0) {
        setSelectedPartyId(workers[0].id);
      }
    }
  }, [partyType, dealers, workers, selectedPartyId]);

  // Fetch individual party statement from API
  const fetchStatement = async () => {
    if (!selectedPartyId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/ledger?partyType=${partyType}&partyId=${selectedPartyId}&fromDate=${fromDate}&toDate=${toDate}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setStatementData(json.statement);
      } else {
        toast.error(json.error || 'Failed to fetch statement.', 'Error');
      }
    } catch (err: any) {
      console.error('Failed to load statement:', err);
      toast.error('Network error loading statement.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'STATEMENT' && selectedPartyId) {
      fetchStatement();
    }
  }, [partyType, selectedPartyId, fromDate, toDate, activeTab]);

  // Fetch All-Parties Master Summary from API
  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await fetch('/api/ledger?summary=true', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setSummaryData(json.summary);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'SUMMARY') {
      fetchSummary();
    }
  }, [activeTab]);

  // Quick Date Preset handler
  const handleSelectDatePreset = (presetKey: string) => {
    setActiveDatePreset(presetKey);
    const { from, to } = getPresetDates(presetKey);
    setFromDate(from);
    setToDate(to);
  };

  // Filter statement rows by search & entry type
  const filteredRows = useMemo(() => {
    if (!statementData?.rows) return [];
    return statementData.rows.filter((row: any) => {
      if (entryTypeFilter !== 'ALL' && row.entryType !== entryTypeFilter) return false;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        return (
          row.description.toLowerCase().includes(q) ||
          row.date.includes(q) ||
          row.entryType.toLowerCase().includes(q) ||
          String(row.debit).includes(q) ||
          String(row.credit).includes(q) ||
          String(row.runningBalance).includes(q)
        );
      }
      return true;
    });
  }, [statementData, entryTypeFilter, tableSearch]);

  // Export CSV
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
    const rows = (statementData.rows || []).map((r: any) => [
      sanitize(r.date),
      sanitize(r.description),
      sanitize(r.entryType),
      r.debit.toFixed(2),
      r.credit.toFixed(2),
      r.runningBalance.toFixed(2)
    ]);

    const isDealer = partyType === 'DEALER';
    const csvContent = [
      `"RR CONSTRUCTION - SUBLEDGER FINANCIAL STATEMENT"`,
      `"Account Name: ${statementData.partyName} (${statementData.partyCode})"`,
      `"Category: ${isDealer ? 'Client Dealer / Contractor' : 'Worker Wage Personnel'}"`,
      `"Period: ${fromDate} to ${toDate}"`,
      `"Opening Balance: ₹${statementData.openingBalance.toFixed(2)}"`,
      `"Total Debits: ₹${statementData.totalDebit.toFixed(2)}"`,
      `"Total Credits: ₹${statementData.totalCredit.toFixed(2)}"`,
      `"Closing Net Balance: ₹${statementData.closingBalance.toFixed(2)} (${statementData.closingBalance > 0 ? (isDealer ? 'Receivable Due' : 'Wage Payable') : statementData.closingBalance < 0 ? 'Advance Overpaid' : 'Settled'})"`,
      '',
      headers.join(','),
      ...rows.map((e: any) => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Subledger_${statementData.partyCode}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Statement exported successfully!', 'File Downloaded');
  };

  // WhatsApp Share Statement Summary
  const handleShareWhatsApp = () => {
    if (!statementData) return;
    const isDealer = partyType === 'DEALER';
    const balanceText = statementData.closingBalance > 0
      ? `*Net Balance Due: ₹${Math.abs(statementData.closingBalance).toLocaleString('en-IN')}* (${isDealer ? 'Pending Receivable' : 'Wage Payable'})`
      : statementData.closingBalance < 0
      ? `*Advance Balance: ₹${Math.abs(statementData.closingBalance).toLocaleString('en-IN')}* (Overpaid / Advance with Party)`
      : `*Balance: ₹0 (Fully Settled)*`;

    const message = [
      `🏢 *RR CONSTRUCTION - ACCOUNT STATEMENT*`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Account:* ${statementData.partyName} (${statementData.partyCode})`,
      `📂 *Type:* ${isDealer ? 'Client Dealer' : 'Worker Labour'}`,
      `📅 *Period:* ${fromDate} to ${toDate}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `🔹 *Opening Balance:* ₹${Math.abs(statementData.openingBalance).toLocaleString('en-IN')}`,
      `🔹 *Total ${isDealer ? 'Work Billed' : 'Wages Earned'}:* ₹${statementData.totalDebit.toLocaleString('en-IN')}`,
      `🔹 *Total ${isDealer ? 'Payments Received' : 'Payouts & Advances'}:* ₹${statementData.totalCredit.toLocaleString('en-IN')}`,
      `━━━━━━━━━━━━━━━━━━━━━`,
      balanceText,
      `━━━━━━━━━━━━━━━━━━━━━`,
      `_Generated on ${new Date().toLocaleDateString('en-IN')} via RR Construction System_`
    ].join('\n');

    const encoded = encodeURIComponent(message);
    const phone = statementData.partyPhone ? statementData.partyPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // -------------------------------------------------------------
  // EDIT ACTION ROUTER
  // -------------------------------------------------------------
  const handleOpenEditRow = (row: any) => {
    // 1. WORK ALLOCATION ROW (CHARGE / WAGE)
    if (row.sourceType === 'WORK' || row.entryType === 'CHARGE' || row.entryType === 'WAGE') {
      const alloc = allocations.find((a) => a.id === row.sourceId);
      if (alloc) {
        setEditingAllocation(alloc);
        setEditAllocWorkDate(alloc.work_date);
        setEditAllocAttendance(alloc.attendance);
        setEditAllocSellingRate(alloc.selling_rate);
        setEditAllocWageRate(alloc.wage_rate);
        setEditAllocSiteId(alloc.site_id || '');
        setEditAllocNotes(alloc.notes || '');
        setIsEditAllocationModalOpen(true);
        return;
      }
    }

    // 2. PAYMENT VOUCHER ROW (RECEIPT / PAYOUT / ADVANCE)
    if (row.sourceType === 'PAYMENT' || row.entryType === 'RECEIPT' || row.entryType === 'PAYOUT' || row.entryType === 'ADVANCE') {
      const p = payments.find((item) => item.id === row.sourceId);
      if (p) {
        setEditingPayment(p);
        setEditPayDate(p.payment_date);
        setEditPayAmount(p.amount);
        setEditPayMethod(p.method);
        setEditPayRef(p.reference || '');
        setEditPayNote(p.note || '');
        setIsEditPaymentModalOpen(true);
        return;
      }
    }

    // 3. MANUAL ADJUSTMENT ROW
    if (row.sourceType === 'ADJUSTMENT' || row.entryType === 'ADJUSTMENT') {
      setEditingAdjustmentId(row.id);
      setAdjustmentDate(row.date);
      setAdjustmentType(row.debit > 0 ? 'DEBIT' : 'CREDIT');
      setAdjustmentCategory(row.entryType || 'MANUAL_ADJUSTMENT');
      setAdjustmentAmount(row.debit > 0 ? row.debit : row.credit);
      setAdjustmentDesc(row.description.replace(/^\[Adjustment: [^\]]+\]\s*/, ''));
      setIsAdjustmentModalOpen(true);
      return;
    }

    toast.info('This historical transaction cannot be edited directly.', 'Info');
  };

  // -------------------------------------------------------------
  // SAVE HANDLERS FOR EDIT MODALS
  // -------------------------------------------------------------
  const handleSaveAllocEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;

    try {
      setIsSubmittingAlloc(true);
      await editAllocation({
        id: editingAllocation.id,
        work_date: editAllocWorkDate,
        attendance: editAllocAttendance,
        selling_rate: editAllocSellingRate !== '' ? Number(editAllocSellingRate) : 0,
        wage_rate: editAllocWageRate !== '' ? Number(editAllocWageRate) : 0,
        notes: editAllocNotes,
        site_id: editAllocSiteId || undefined
      });

      toast.success('Work allocation updated & subledgers synchronized!', 'Transaction Updated');
      setIsEditAllocationModalOpen(false);
      setEditingAllocation(null);
      await fetchStatement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update allocation.', 'Error');
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  const handleSavePaymentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || editPayAmount === '' || Number(editPayAmount) <= 0) {
      toast.warning('Please enter a valid amount.', 'Validation Error');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await editPayment({
        id: editingPayment.id,
        payment_date: editPayDate,
        amount: Number(editPayAmount),
        method: editPayMethod,
        reference: editPayRef.trim() || undefined,
        note: editPayNote.trim() || undefined
      });

      toast.success(`Payment voucher ${editingPayment.receipt_number} updated & subledgers updated!`, 'Voucher Updated');
      setIsEditPaymentModalOpen(false);
      setEditingPayment(null);
      await fetchStatement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update payment voucher.', 'Error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || adjustmentAmount === '' || Number(adjustmentAmount) <= 0 || !adjustmentDesc.trim()) {
      toast.warning('Please fill all required fields with a valid amount.', 'Validation Error');
      return;
    }

    try {
      setIsSubmittingAdjustment(true);
      const fullDesc = `[Adjustment: ${adjustmentCategory.replace(/_/g, ' ')}] ${adjustmentDesc.trim()}`;

      if (editingAdjustmentId) {
        await editLedgerAdjustment({
          id: editingAdjustmentId,
          entry_date: adjustmentDate,
          entry_type: adjustmentCategory,
          adjustment_type: adjustmentType,
          amount: Number(adjustmentAmount),
          description: fullDesc
        });
        toast.success('Adjustment entry updated!', 'Changes Saved');
      } else {
        await addLedgerAdjustment({
          party_type: partyType,
          party_id: selectedPartyId,
          entry_date: adjustmentDate,
          entry_type: adjustmentCategory,
          adjustment_type: adjustmentType,
          amount: Number(adjustmentAmount),
          description: fullDesc
        });
        toast.success(`Ledger adjustment of ₹${Number(adjustmentAmount).toLocaleString('en-IN')} posted!`, 'Adjustment Recorded');
      }

      setIsAdjustmentModalOpen(false);
      setEditingAdjustmentId(null);
      setAdjustmentAmount('');
      setAdjustmentDesc('');
      await fetchStatement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save adjustment entry.', 'Error');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleConfirmDeleteRow = async () => {
    if (!rowToDelete) return;
    try {
      if (rowToDelete.sourceType === 'WORK' || rowToDelete.entryType === 'CHARGE' || rowToDelete.entryType === 'WAGE') {
        await deleteAllocation(rowToDelete.sourceId);
        toast.success('Work allocation deleted & subledgers reversed.', 'Transaction Deleted');
      } else if (rowToDelete.sourceType === 'PAYMENT' || rowToDelete.entryType === 'RECEIPT' || rowToDelete.entryType === 'PAYOUT' || rowToDelete.entryType === 'ADVANCE') {
        await deletePayment(rowToDelete.sourceId);
        toast.success('Payment voucher deleted & subledgers reversed.', 'Voucher Deleted');
      } else {
        await deleteLedgerEntry(rowToDelete.id);
        toast.success('Adjustment entry removed from ledger.', 'Entry Deleted');
      }

      setRowToDelete(null);
      await fetchStatement();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete transaction.', 'Error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header Navigation & Mode Switcher (Hidden in Print) */}
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
              Pillar 3
            </span>
            <span className="text-xs text-zinc-400 font-mono">Double-Entry Financial System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ledgers & Financial Statements
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Real-time subledger statements, edit/delete transactions, running balance audits, and full portfolio trial balance.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 font-mono flex-wrap">
          <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab('STATEMENT')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'STATEMENT' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Subledger Statement
            </button>
            <button
              onClick={() => setActiveTab('SUMMARY')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'SUMMARY' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" /> Trial Balance Summary
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: INDIVIDUAL SUBLEDGER STATEMENT                                    */}
      {/* ========================================================================= */}
      {activeTab === 'STATEMENT' && (
        <div className="space-y-6">
          {/* Controls Bar (Hidden in Print) */}
          <div className="no-print p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg space-y-4">
            {/* Top row: Dealer vs Worker + Party Dropdown + Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap flex-1">
                {/* Dealer vs Worker Switch */}
                <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 font-mono shrink-0">
                  <button
                    onClick={() => {
                      setPartyType('DEALER');
                      if (dealers.length > 0) setSelectedPartyId(dealers[0].id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      partyType === 'DEALER' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Dealer Accounts
                  </button>
                  <button
                    onClick={() => {
                      setPartyType('WORKER');
                      if (workers.length > 0) setSelectedPartyId(workers[0].id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      partyType === 'WORKER' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Worker Accounts
                  </button>
                </div>

                {/* Party Selector Dropdown */}
                <div className="flex-1 min-w-[240px]">
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
                  >
                    {partyType === 'DEALER'
                      ? dealers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code}) — ₹{d.default_rate}/day
                          </option>
                        ))
                      : workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.code} - {w.skill}) — ₹{w.default_wage}/day
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons: Add Adjustment + Print + CSV + WhatsApp */}
              <div className="flex items-center gap-2 font-mono flex-wrap">
                <button
                  onClick={() => {
                    setEditingAdjustmentId(null);
                    setAdjustmentDate(new Date().toISOString().split('T')[0]);
                    setAdjustmentType('DEBIT');
                    setAdjustmentCategory('MANUAL_ADJUSTMENT');
                    setAdjustmentAmount('');
                    setAdjustmentDesc('');
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-all shadow-sm active:scale-95"
                  title="Add direct manual debit/credit adjustment"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Adjust Ledger</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-emerald-400 text-xs font-semibold border border-zinc-800 hover:border-emerald-500/30 transition-all shadow-sm active:scale-95"
                  title="Share formatted ledger statement to WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-200 text-xs font-semibold border border-zinc-800 transition-all shadow-sm active:scale-95"
                  title="Print official subledger statement"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>Print Statement</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase tracking-wide transition-all shadow-sm active:scale-95"
                  title="Export spreadsheet CSV"
                >
                  <Download className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Bottom row: Date Presets & Custom Pickers */}
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-500 text-[11px] mr-1">Period:</span>
                {[
                  { key: 'ALL', label: 'All Time' },
                  { key: 'THIS_MONTH', label: 'This Month' },
                  { key: 'LAST_MONTH', label: 'Last Month' },
                  { key: 'THIS_FY', label: 'FY 25-26' },
                  { key: 'THIS_WEEK', label: 'This Week' },
                  { key: 'TODAY', label: 'Today' }
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectDatePreset(p.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      activeDatePreset === p.key
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">From:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setActiveDatePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 text-[10px]">To:</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setActiveDatePreset('CUSTOM');
                    }}
                    className="bg-transparent text-xs text-white focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => fetchStatement()}
                  className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800"
                  title="Reload Statement"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Statement Container */}
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-12 rounded-xl bg-zinc-950" />
                ))}
              </div>
            </div>
          ) : !statementData ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 space-y-3 font-mono">
              <FileText className="w-12 h-12 mx-auto text-zinc-600" />
              <div className="text-base font-bold text-white">No Statement Selected</div>
              <p className="text-xs text-zinc-500">Please choose a Dealer or Worker from the menu above to generate statement.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden card-print">
              {/* Top Accent Stripe */}
              <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-zinc-400" />

              <div className="p-6 md:p-8 space-y-6">
                {/* ------------------------------------------------------------- */}
                {/* CORPORATE EXECUTIVE LETTERHEAD HEADER                         */}
                {/* ------------------------------------------------------------- */}
                <div className="border-b border-zinc-800 pb-5 space-y-4">
                  {/* Top Banner: Company Brand on Left, Document Badge on Right */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white text-black font-black font-mono flex items-center justify-center text-base shadow-sm ring-1 ring-zinc-700/50">
                          {companyProfile?.short_name || 'RR'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h1 className="font-black text-xl sm:text-2xl text-white tracking-tight uppercase">
                              {companyProfile?.name || 'RR CONSTRUCTION'}
                            </h1>
                            {companyProfile?.est_year && (
                              <span className="no-print text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {companyProfile.est_year}
                              </span>
                            )}
                          </div>
                          {companyProfile?.tagline && (
                            <p className="text-xs text-zinc-400 font-medium">
                              {companyProfile.tagline}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 flex-wrap pt-0.5">
                        {companyProfile?.gstin && (
                          <span>GSTIN / Reg: <strong className="text-zinc-200">{companyProfile.gstin}</strong></span>
                        )}
                        {companyProfile?.phone && (
                          <>
                            <span>•</span>
                            <span>Phone: <strong className="text-zinc-200">{companyProfile.phone}</strong></span>
                          </>
                        )}
                        {companyProfile?.email && (
                          <>
                            <span>•</span>
                            <span>Email: <strong className="text-zinc-200">{companyProfile.email}</strong></span>
                          </>
                        )}
                      </div>
                      {companyProfile?.address && (
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Head Office: {companyProfile.address}
                        </div>
                      )}
                    </div>

                    <div className="sm:text-right font-mono shrink-0 space-y-1">
                      <div className="inline-block px-3.5 py-1.5 rounded-lg bg-zinc-950 text-white border border-zinc-750 text-xs font-bold uppercase tracking-wider badge-print shadow-sm">
                        {companyProfile?.statement_title || 'STATEMENT OF SUBLEDGER ACCOUNT'}
                      </div>
                      <div className="text-xs font-semibold text-zinc-300">
                        Ref: <span className="font-mono text-white">STMT-{statementData.partyCode}-{fromDate.replace(/-/g, '')}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Date of Issue: <span className="text-zinc-200">{formatDisplayDate(new Date().toISOString().split('T')[0])}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center sm:justify-end gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {companyProfile?.statement_subtitle || 'Double-Entry Verified & Reconciled'}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Party & Statement Metadata Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono">
                    {/* Left Column: Billed Party Details */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        {partyType === 'DEALER' ? 'BILLED TO (CLIENT CONTRACTOR / DEALER)' : 'PERSONNEL ACCOUNT (SITE WORKER)'}
                      </div>
                      <div className="font-bold text-base text-white font-sans tracking-tight">
                        {statementData.partyName}
                      </div>
                      <div className="text-zinc-300 text-[11px] flex items-center gap-2 flex-wrap">
                        <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-amber-400 font-bold font-mono">
                          ACC CODE: {statementData.partyCode}
                        </span>
                        {statementData.partySkill && (
                          <span className="text-zinc-400">• Role: <strong className="text-zinc-200">{statementData.partySkill}</strong></span>
                        )}
                        {statementData.partyPhone && (
                          <span className="text-zinc-400">• Ph: <strong className="text-zinc-200">{statementData.partyPhone}</strong></span>
                        )}
                      </div>
                      {statementData.partyAddress && (
                        <div className="text-[11px] text-zinc-400 font-sans truncate pt-0.5">
                          Address / Site Location: <span className="text-zinc-300">{statementData.partyAddress}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Statement Scope & Verification */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-1.5">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        STATEMENT WINDOW & SPECIFICATIONS
                      </div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{formatDisplayDate(fromDate)}</span>
                        <span className="text-zinc-500 font-normal">to</span>
                        <span>{formatDisplayDate(toDate)}</span>
                      </div>
                      <div className="text-zinc-400 text-[11px] flex items-center gap-2 flex-wrap">
                        <span>Base Currency: <strong className="text-white">INR (₹)</strong></span>
                        <span>•</span>
                        <span>Accounting Basis: <strong className="text-zinc-200">Accrual Subledger</strong></span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        Audit Checksum: 0x{statementData.partyCode?.toLowerCase() || '00'}-{fromDate.slice(5).replace('-', '')}-{toDate.slice(5).replace('-', '')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* EXECUTIVE 4-COLUMN FINANCIAL SUMMARY BAR                      */}
                {/* ------------------------------------------------------------- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                  {/* 1. Opening Balance */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      1. Opening Balance (B/F)
                    </span>
                    <div className="text-lg font-bold text-zinc-200 mt-1.5">
                      {formatINR(statementData.openingBalance)}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Prior to {formatDisplayDate(fromDate)}
                    </div>
                  </div>

                  {/* 2. Total Debits */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      2. {partyType === 'DEALER' ? 'Total Work Billed (+)' : 'Total Wages Earned (+)'}
                    </span>
                    <div className="text-lg font-bold text-white mt-1.5">
                      {formatINR(statementData.totalDebit)}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Period Additions (Dr)
                    </div>
                  </div>

                  {/* 3. Total Credits */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                      3. {partyType === 'DEALER' ? 'Payments Received (-)' : 'Payouts & Advances (-)'}
                    </span>
                    <div className="text-lg font-bold text-white mt-1.5">
                      {formatINR(statementData.totalCredit)}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Period Deductions (Cr)
                    </div>
                  </div>

                  {/* 4. Closing Balance with High Visibility Status Badge */}
                  <div className="p-4 rounded-xl bg-zinc-950 border-2 border-zinc-700 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                      4. Net Closing Balance
                    </span>
                    <div className="text-xl font-black text-white mt-1.5">
                      {formatINR(statementData.closingBalance)}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400 mt-1">
                      {statementData.closingBalance > 0
                        ? (partyType === 'DEALER' ? '[ NET RECEIVABLE DUE (DR) ]' : '[ NET WAGE PAYABLE (DR) ]')
                        : statementData.closingBalance < 0
                        ? '[ ADVANCE OVERPAID (CR) ]'
                        : '[ ZERO BALANCE (SETTLED) ]'}
                    </div>
                  </div>
                </div>

                {/* Table Filter Toolbar (Hidden in Print) */}
                <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search entries in statement..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                    />
                    {tableSearch && (
                      <button
                        onClick={() => setTableSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-zinc-500 text-[11px]">Filter:</span>
                    <select
                      value={entryTypeFilter}
                      onChange={(e) => setEntryTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
                    >
                      <option value="ALL">All Entries ({statementData.rows?.length || 0})</option>
                      <option value="CHARGE">Work / Billed (CHARGE)</option>
                      <option value="WAGE">Worker Wages (WAGE)</option>
                      <option value="RECEIPT">Payment Receipts (RECEIPT)</option>
                      <option value="PAYOUT">Wage Payouts (PAYOUT)</option>
                      <option value="ADVANCE">Cash Advances (ADVANCE)</option>
                      <option value="ADJUSTMENT">Adjustments (ADJUSTMENT)</option>
                    </select>
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ITEMIZED SUBLEDGER STATEMENT AUDIT TABLE                      */}
                {/* ------------------------------------------------------------- */}
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono font-bold uppercase tracking-wider text-[11px]">
                        <th className="p-3 w-28">Date</th>
                        <th className="p-3">Particulars & Description</th>
                        <th className="p-3 w-24 text-center">Type</th>
                        <th className="p-3 text-right w-28">Debit (+)</th>
                        <th className="p-3 text-right w-28">Credit (-)</th>
                        <th className="p-3 text-right w-32">Balance (₹)</th>
                        <th className="no-print p-3 text-center w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70 font-mono">
                      {/* Opening Balance Row */}
                      <tr className="bg-zinc-950/80 text-zinc-400 font-sans italic">
                        <td className="p-3 font-mono font-semibold">{formatDisplayDate(fromDate)}</td>
                        <td className="p-3" colSpan={2}>
                          <div className="font-semibold text-zinc-200">
                            [Opening Balance B/F as of {formatDisplayDate(fromDate)}]
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono not-italic">
                            Cumulative verified balance prior to statement window
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-400">-</td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-400">-</td>
                        <td className="p-3 text-right font-mono font-black text-white">
                          {formatINR(statementData.openingBalance)}
                        </td>
                        <td className="no-print p-3 text-center text-zinc-600">-</td>
                      </tr>

                      {/* Transaction Rows */}
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans">
                            {tableSearch || entryTypeFilter !== 'ALL'
                              ? 'No entries match the active filters.'
                              : 'No ledger transactions recorded in this date range.'}
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row: any) => {
                          return (
                            <tr key={row.id} className="hover:bg-zinc-850/60 transition-colors">
                              <td className="p-3 text-zinc-300 whitespace-nowrap font-mono">
                                {formatDisplayDate(row.date)}
                              </td>
                              <td className="p-3 font-sans text-white text-xs max-w-md">
                                <div className="font-medium text-zinc-100">{row.description}</div>
                                {row.sourceType === 'ADJUSTMENT' && (
                                  <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
                                    Manual Audit Adjustment
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold inline-block border ${
                                    row.entryType === 'CHARGE' || row.entryType === 'WAGE'
                                      ? 'bg-zinc-800 text-white border-zinc-700'
                                      : row.entryType === 'RECEIPT' || row.entryType === 'PAYOUT'
                                      ? 'bg-white text-black border-white font-black'
                                      : row.entryType === 'ADVANCE'
                                      ? 'bg-zinc-950 text-amber-400 border-amber-900/60'
                                      : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                                  }`}
                                >
                                  {row.entryType}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-white font-mono">
                                {row.debit > 0 ? formatINR(row.debit) : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-zinc-300 font-mono">
                                {row.credit > 0 ? formatINR(row.credit) : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-white font-mono">
                                {formatINR(row.runningBalance)}
                              </td>
                              {/* Action Buttons: Edit & Delete for Every Row */}
                              <td className="no-print p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditRow(row)}
                                    className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                                    title="Edit Transaction Record"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRowToDelete(row)}
                                    className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-900 transition-colors"
                                    title="Delete & Reverse Transaction"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Closing Subtotals Row (Standard Accounting Convention) */}
                      <tr className="bg-zinc-950 font-mono font-bold text-white border-t-2 border-zinc-700">
                        <td className="p-3 uppercase text-[11px]" colSpan={3}>
                          Statement Period Totals & Closing Balance
                        </td>
                        <td className="p-3 text-right text-white font-mono">
                          {formatINR(statementData.totalDebit)}
                        </td>
                        <td className="p-3 text-right text-zinc-300 font-mono">
                          {formatINR(statementData.totalCredit)}
                        </td>
                        <td className="p-3 text-right font-black text-base text-white border-b-2 border-white font-mono">
                          {formatINR(statementData.closingBalance)}
                        </td>
                        <td className="no-print p-3 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Declaration Note */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    {companyProfile?.terms_notes || (
                      <>
                        Certified official subledger statement issued by <strong>{companyProfile?.name || 'RR Construction'}</strong>. Verified under double-entry accounting rules.
                      </>
                    )}
                  </div>
                  <div className="text-zinc-500 shrink-0">
                    Page 1 of 1 • Official Certified Copy
                  </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* PRINT & SCREEN AUDIT SIGNATURE / STAMP SECTION                */}
                {/* ------------------------------------------------------------- */}
                <div className="pt-8 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-6 sm:gap-12 font-mono text-xs">
                    {/* Authorized Signatory Box */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between h-36">
                      <div>
                        <div className="font-bold text-white uppercase text-[11px] tracking-wide">
                          {companyProfile?.authorized_signatory || `FOR ${companyProfile?.name || 'RR CONSTRUCTION'}`}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Authorized Signatory & Seal</div>
                      </div>
                      <div className="border-t border-zinc-700/80 pt-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Authorized Signatory</span>
                        <span>Date: ____________</span>
                      </div>
                    </div>

                    {/* Party Acknowledgment Box */}
                    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 flex flex-col justify-between h-36 text-right">
                      <div>
                        <div className="font-bold text-white uppercase text-[11px] tracking-wide">PARTY ACKNOWLEDGEMENT</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 font-bold">{statementData.partyName}</div>
                      </div>
                      <div className="border-t border-zinc-700/80 pt-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Confirmed & Accepted</span>
                        <span>Date: ____________</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: TRIAL BALANCE & MASTER SUMMARY OF ALL PARTIES                     */}
      {/* ========================================================================= */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-6">
          {/* Top KPI Deck of Entire Portfolio */}
          {summaryLoading || !summaryData ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
                  <Skeleton className="w-32 h-7 rounded bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Total Receivables (Dealers)
                </span>
                <div className="text-2xl font-black text-white mt-1">
                  {formatINR(summaryData.totalDealerReceivable)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Billed: {formatINR(summaryData.totalDealerBilled)} • Paid: {formatINR(summaryData.totalDealerPaid)}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Total Wages Payable (Workers)
                </span>
                <div className="text-2xl font-black text-zinc-200 mt-1">
                  {formatINR(summaryData.totalWorkerPayable)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Earned: {formatINR(summaryData.totalWorkerWages)} • Paid: {formatINR(summaryData.totalWorkerPayouts)}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  Outstanding Worker Advances
                </span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {formatINR(summaryData.totalWorkerAdvances)}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Recoverable from future shifts
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white text-black shadow-lg flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-600">
                  Net Portfolio Position
                </span>
                <div className="text-2xl font-black mt-1 text-black">
                  {formatINR(summaryData.totalDealerReceivable - summaryData.totalWorkerPayable)}
                </div>
                <div className="text-[11px] font-bold text-zinc-700 mt-1 uppercase">
                  {(summaryData.totalDealerReceivable - summaryData.totalWorkerPayable) >= 0 ? 'Net Positive Asset' : 'Net Liability'}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search parties by name or code..."
                value={summarySearch}
                onChange={(e) => setSummarySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                <button
                  onClick={() => setSummaryFilter('ALL')}
                  className={`px-3 py-1 rounded text-[11px] font-bold ${
                    summaryFilter === 'ALL' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Parties
                </button>
                <button
                  onClick={() => setSummaryFilter('PENDING')}
                  className={`px-3 py-1 rounded text-[11px] font-bold ${
                    summaryFilter === 'PENDING' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pending Balances
                </button>
                <button
                  onClick={() => setSummaryFilter('SETTLED')}
                  className={`px-3 py-1 rounded text-[11px] font-bold ${
                    summaryFilter === 'SETTLED' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Settled (₹0)
                </button>
              </div>
            </div>
          </div>

          {/* 1. Client Dealers Master Ledger */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-white">
                <Building2 className="w-4 h-4 text-white" />
                <span>Client Dealer Accounts ({summaryData?.dealers?.length || 0})</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">Receivable Subledgers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Dealer Code</th>
                    <th className="p-3.5">Dealer Name & Contact</th>
                    <th className="p-3.5 text-right">Daily Rate</th>
                    <th className="p-3.5 text-right">Total Billed</th>
                    <th className="p-3.5 text-right">Total Paid</th>
                    <th className="p-3.5 text-right">Net Balance Due</th>
                    <th className="p-3.5 text-center">Last Active</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 font-mono">
                  {summaryLoading || !summaryData ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3.5"><Skeleton className="w-16 h-4 rounded bg-zinc-800" /></td>
                        <td className="p-3.5"><Skeleton className="w-36 h-4 rounded bg-zinc-800" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-14 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-20 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-center"><Skeleton className="w-16 h-4 rounded bg-zinc-800 mx-auto" /></td>
                        <td className="p-3.5 text-center"><Skeleton className="w-16 h-6 rounded bg-zinc-800 mx-auto" /></td>
                      </tr>
                    ))
                  ) : summaryData.dealers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-zinc-500 font-sans">
                        No client dealers registered yet.
                      </td>
                    </tr>
                  ) : (
                    summaryData.dealers
                      .filter((d: any) => {
                        if (summaryFilter === 'PENDING' && d.balanceDue === 0) return false;
                        if (summaryFilter === 'SETTLED' && d.balanceDue !== 0) return false;
                        if (summarySearch.trim()) {
                          const q = summarySearch.toLowerCase();
                          return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.phone && d.phone.includes(q));
                        }
                        return true;
                      })
                      .map((d: any) => (
                        <tr key={d.id} className="hover:bg-zinc-850/60 transition-colors">
                          <td className="p-3.5 font-bold text-white">{d.code}</td>
                          <td className="p-3.5 font-sans">
                            <div className="font-bold text-white text-xs">{d.name}</div>
                            {d.phone && <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{d.phone}</div>}
                          </td>
                          <td className="p-3.5 text-right text-zinc-300">₹{d.defaultRate}/day</td>
                          <td className="p-3.5 text-right text-zinc-300">{formatINR(d.totalBilled)}</td>
                          <td className="p-3.5 text-right text-zinc-300">{formatINR(d.totalPaid)}</td>
                          <td className="p-3.5 text-right font-bold text-sm">
                            {d.balanceDue > 0 ? (
                              <span className="text-white">{formatINR(d.balanceDue)}</span>
                            ) : d.balanceDue < 0 ? (
                              <span className="text-zinc-400">{formatINR(d.balanceDue)} (Adv)</span>
                            ) : (
                              <span className="text-zinc-600 font-normal">₹0 (Nil)</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center text-[11px] text-zinc-400">{d.lastActivity}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setPartyType('DEALER');
                                setSelectedPartyId(d.id);
                                setActiveTab('STATEMENT');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <span>Statement</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Worker Personnel Master Ledger */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono font-bold text-sm text-white">
                <Users className="w-4 h-4 text-white" />
                <span>Worker Wage Accounts ({summaryData?.workers?.length || 0})</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">Payable & Advance Subledgers</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5">Worker Code</th>
                    <th className="p-3.5">Worker Name & Trade</th>
                    <th className="p-3.5 text-right">Base Wage</th>
                    <th className="p-3.5 text-right">Total Wages Earned</th>
                    <th className="p-3.5 text-right">Payouts & Advances</th>
                    <th className="p-3.5 text-right">Net Payable / Advance</th>
                    <th className="p-3.5 text-center">Last Active</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 font-mono">
                  {summaryLoading || !summaryData ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-3.5"><Skeleton className="w-16 h-4 rounded bg-zinc-800" /></td>
                        <td className="p-3.5"><Skeleton className="w-36 h-4 rounded bg-zinc-800" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-14 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-right"><Skeleton className="w-20 h-4 rounded bg-zinc-800 ml-auto" /></td>
                        <td className="p-3.5 text-center"><Skeleton className="w-16 h-4 rounded bg-zinc-800 mx-auto" /></td>
                        <td className="p-3.5 text-center"><Skeleton className="w-16 h-6 rounded bg-zinc-800 mx-auto" /></td>
                      </tr>
                    ))
                  ) : summaryData.workers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-zinc-500 font-sans">
                        No worker personnel registered yet.
                      </td>
                    </tr>
                  ) : (
                    summaryData.workers
                      .filter((w: any) => {
                        if (summaryFilter === 'PENDING' && w.netPayable === 0) return false;
                        if (summaryFilter === 'SETTLED' && w.netPayable !== 0) return false;
                        if (summarySearch.trim()) {
                          const q = summarySearch.toLowerCase();
                          return w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q) || (w.skill && w.skill.toLowerCase().includes(q));
                        }
                        return true;
                      })
                      .map((w: any) => (
                        <tr key={w.id} className="hover:bg-zinc-850/60 transition-colors">
                          <td className="p-3.5 font-bold text-white">{w.code}</td>
                          <td className="p-3.5 font-sans">
                            <div className="font-bold text-white text-xs">{w.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{w.skill}</div>
                          </td>
                          <td className="p-3.5 text-right text-zinc-300">₹{w.defaultWage}/day</td>
                          <td className="p-3.5 text-right text-zinc-300">{formatINR(w.totalWages)}</td>
                          <td className="p-3.5 text-right text-zinc-300">{formatINR(w.totalPayouts)}</td>
                          <td className="p-3.5 text-right font-bold text-sm">
                            {w.netPayable > 0 ? (
                              <span className="text-zinc-200">{formatINR(w.netPayable)} (Due)</span>
                            ) : w.netPayable < 0 ? (
                              <span className="text-amber-400">{formatINR(w.netPayable)} (Adv)</span>
                            ) : (
                              <span className="text-zinc-600 font-normal">₹0 (Nil)</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center text-[11px] text-zinc-400">{w.lastActivity}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setPartyType('WORKER');
                                setSelectedPartyId(w.id);
                                setActiveTab('STATEMENT');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                            >
                              <span>Statement</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT MANUAL LEDGER ADJUSTMENT                              */}
      {/* ========================================================================= */}
      {isAdjustmentModalOpen && statementData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">
                    {editingAdjustmentId ? 'Edit Ledger Adjustment' : 'Add Direct Ledger Adjustment'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Account: {statementData.partyName} ({statementData.partyCode})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdjustmentModalOpen(false);
                  setEditingAdjustmentId(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-6 space-y-4 font-mono">
              {/* Adjustment Effect: Debit vs Credit */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
                  1. Ledger Effect *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('DEBIT')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                      adjustmentType === 'DEBIT'
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <div className="font-mono font-black">+ DEBIT</div>
                    <div className="text-[10px] font-sans mt-0.5 opacity-80">
                      {partyType === 'DEALER' ? 'Increases Amount Due' : 'Increases Wage Payable'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType('CREDIT')}
                    className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left ${
                      adjustmentType === 'CREDIT'
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    <div className="font-mono font-black">- CREDIT</div>
                    <div className="text-[10px] font-sans mt-0.5 opacity-80">
                      {partyType === 'DEALER' ? 'Discount / Reduces Due' : 'Penalty / Deduction'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Adjustment Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-sans">
                  2. Adjustment Reason Category
                </label>
                <select
                  value={adjustmentCategory}
                  onChange={(e) => setAdjustmentCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <option value="OPENING">Opening Balance Migration</option>
                  <option value="DISCOUNT">Settlement Discount / Waiver</option>
                  <option value="PENALTY">Penalty / Deduction / Damage</option>
                  <option value="BONUS">Bonus / Overtime / Extra Allowance</option>
                  <option value="EXPENSE">Expense Reimbursement / Travel</option>
                  <option value="MANUAL_ADJUSTMENT">General Manual Adjustment</option>
                </select>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">
                    Adjustment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 2500"
                    required
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={adjustmentDate}
                    onChange={(e) => setAdjustmentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Audit Memo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">
                  Audit Memo / Explanation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prior balance brought forward from old ledger, discount agreed upon..."
                  value={adjustmentDesc}
                  onChange={(e) => setAdjustmentDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustmentModalOpen(false);
                    setEditingAdjustmentId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adjustmentAmount || Number(adjustmentAmount) <= 0 || !adjustmentDate || !adjustmentDesc.trim() || isSubmittingAdjustment}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSubmittingAdjustment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingAdjustment ? 'Saving...' : editingAdjustmentId ? 'Save Changes' : 'Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT WORK ALLOCATION DIRECTLY FROM LEDGER                        */}
      {/* ========================================================================= */}
      {isEditAllocationModalOpen && editingAllocation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Edit Work Record / Attendance
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    {editingAllocation.worker_name} → {editingAllocation.dealer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditAllocationModalOpen(false);
                  setEditingAllocation(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAllocEdit} className="p-6 space-y-4 font-mono">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Work Date *</label>
                <input
                  type="date"
                  required
                  value={editAllocWorkDate}
                  onChange={(e) => setEditAllocWorkDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Project Work Site</label>
                <select
                  value={editAllocSiteId}
                  onChange={(e) => setEditAllocSiteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                >
                  <option value="">General Site</option>
                  {sites
                    .filter((s) => s.dealer_id === editingAllocation.dealer_id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Attendance Shift</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAllocAttendance('FULL')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editAllocAttendance === 'FULL'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    FULL DAY (1.0x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAllocAttendance('HALF')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editAllocAttendance === 'HALF'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    HALF DAY (0.5x)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Dealer Billed Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editAllocSellingRate}
                    onChange={(e) => setEditAllocSellingRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Worker Wage Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editAllocWageRate}
                    onChange={(e) => setEditAllocWageRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Work Memo / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Overtime, specific task..."
                  value={editAllocNotes}
                  onChange={(e) => setEditAllocNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditAllocationModalOpen(false);
                    setEditingAllocation(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAlloc}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingAlloc && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingAlloc ? 'Updating...' : 'Update & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PAYMENT VOUCHER DIRECTLY FROM LEDGER                        */}
      {/* ========================================================================= */}
      {isEditPaymentModalOpen && editingPayment && (
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
                  setIsEditPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="p-6 space-y-4 font-mono">
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
                    value={editPayAmount}
                    onChange={(e) => setEditPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">Voucher Date *</label>
                  <input
                    type="date"
                    required
                    value={editPayDate}
                    onChange={(e) => setEditPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              {/* Method & Reference */}
              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Mode</label>
                  <select
                    value={editPayMethod}
                    onChange={(e) => setEditPayMethod(e.target.value as any)}
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
                    value={editPayRef}
                    onChange={(e) => setEditPayRef(e.target.value)}
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
                  value={editPayNote}
                  onChange={(e) => setEditPayNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPaymentModalOpen(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingPayment ? 'Updating...' : 'Update Voucher & Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNIVERSAL DELETE CONFIRMATION MODAL                                       */}
      {/* ========================================================================= */}
      <ConfirmDeleteModal
        isOpen={!!rowToDelete}
        title="Permanently Delete & Reverse Transaction?"
        itemType={
          rowToDelete?.sourceType === 'WORK'
            ? 'Work Allocation Entry'
            : rowToDelete?.sourceType === 'PAYMENT'
            ? 'Payment Voucher'
            : 'Manual Adjustment Entry'
        }
        itemName={rowToDelete?.description}
        itemCode={rowToDelete ? `${rowToDelete.date} • ${rowToDelete.debit > 0 ? `Debit ₹${rowToDelete.debit}` : `Credit ₹${rowToDelete.credit}`}` : ''}
        warningMessage="Are you sure you want to delete this transaction? This will reverse the effect and immediately recalculate the running subledger balance across all accounts."
        confirmButtonText="Delete & Recalculate"
        onConfirm={handleConfirmDeleteRow}
        onClose={() => setRowToDelete(null)}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400 font-mono">Loading subledger system...</div>}>
      <LedgerContent />
    </Suspense>
  );
}
