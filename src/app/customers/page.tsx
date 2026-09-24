'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  PlusCircle,
  Search,
  Phone,
  MapPin,
  FileText,
  IndianRupee,
  Layers,
  Send,
  CheckCircle2,
  Users,
  HardHat,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Sparkles,
  CheckSquare,
  Square,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import { useSqlStore, Dealer, Worker, MultiWorkerItem } from '@/lib/storage/useSqlStore';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

interface WorkerRowState {
  worker_id: string;
  selected: boolean;
  attendance: 'FULL' | 'HALF';
  selling_rate: number;
  wage_rate: number;
}

export default function DealersPage() {
  const {
    dealers,
    sites,
    workers,
    allocations,
    payments,
    metrics,
    loading,
    addDealer,
    editDealer,
    deleteDealer,
    addSite,
    sendMultiWorkers,
    recordPayment
  } = useSqlStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [searchQuery, setSearchQuery] = useState('');

  // Add Dealer Modal State
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [defaultRate, setDefaultRate] = useState<number | ''>('');

  // Edit Dealer Modal State
  const [isEditDealerModalOpen, setIsEditDealerModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [editDealerName, setEditDealerName] = useState('');
  const [editDealerPhone, setEditDealerPhone] = useState('');
  const [editDealerAddress, setEditDealerAddress] = useState('');
  const [editDealerRate, setEditDealerRate] = useState<number | ''>('');

  // Delete Confirmation State
  const [dealerToDelete, setDealerToDelete] = useState<Dealer | null>(null);

  // Add Site Modal State
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [targetDealerId, setTargetDealerId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  // Send Multi-Workers to Dealer Modal State
  const [isSendWorkerOpen, setIsSendWorkerOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [workDate, setWorkDate] = useState(getTodayDate);
  const [modalWorkerSearch, setModalWorkerSearch] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [workerRows, setWorkerRows] = useState<Record<string, WorkerRowState>>({});

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');

  const [feedback, setFeedback] = useState<string | null>(null);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const filteredDealers = dealers.filter((d) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.address && d.address.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q))
      );
    }
    return true;
  });

  const handleSaveDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Please provide a dealer or company name.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDealer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        default_rate: defaultRate !== '' ? Number(defaultRate) : 0
      });

      setIsDealerModalOpen(false);
      setName('');
      setPhone('');
      setAddress('');
      setDefaultRate('');
      toast.success(`Client dealer "${name.trim()}" registered successfully!`, 'Dealer Created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save dealer.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditDealer = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setEditDealerName(dealer.name);
    setEditDealerPhone(dealer.phone || '');
    setEditDealerAddress(dealer.address || '');
    setEditDealerRate(dealer.default_rate);
    setIsEditDealerModalOpen(true);
  };

  const handleSaveEditDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDealer || !editDealerName.trim()) {
      toast.warning('Dealer name cannot be blank.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      await editDealer({
        id: editingDealer.id,
        name: editDealerName.trim(),
        phone: editDealerPhone.trim() || undefined,
        address: editDealerAddress.trim() || undefined,
        default_rate: editDealerRate !== '' ? Number(editDealerRate) : 0
      });

      setIsEditDealerModalOpen(false);
      setEditingDealer(null);
      toast.success(`Dealer "${editDealerName}" updated successfully!`, 'Changes Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update dealer.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDealer = (dealer: Dealer) => {
    setDealerToDelete(dealer);
  };

  const handleConfirmDeleteDealer = async () => {
    if (!dealerToDelete) return;
    try {
      await deleteDealer(dealerToDelete.id);
      toast.success(`Dealer "${dealerToDelete.name}" and associated records deleted.`, 'Dealer Removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete dealer.', 'Error');
    } finally {
      setDealerToDelete(null);
    }
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDealerId || !siteName.trim()) {
      toast.warning('Please provide a valid site name.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSite({
        dealer_id: targetDealerId,
        name: siteName.trim(),
        address: siteAddress.trim() || undefined
      });

      setIsSiteModalOpen(false);
      setSiteName('');
      setSiteAddress('');
      toast.success(`Project site "${siteName.trim()}" linked to dealer!`, 'Site Registered');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save project site.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Multi-Worker Send Modal
  const handleOpenSendWorkers = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setWorkDate(getTodayDate());
    setModalWorkerSearch('');

    const dealerSites = sites.filter((s) => s.dealer_id === dealer.id);
    setSelectedSiteId(dealerSites.length > 0 ? dealerSites[0].id : '');

    // Initialize worker rows state
    const initialRows: Record<string, WorkerRowState> = {};
    workers.forEach((w) => {
      initialRows[w.id] = {
        worker_id: w.id,
        selected: false,
        attendance: 'FULL',
        selling_rate: 0,
        wage_rate: 0
      };
    });
    setWorkerRows(initialRows);
    setIsSendWorkerOpen(true);
  };

  // Toggle single worker selection
  const toggleWorkerSelection = (workerId: string) => {
    setWorkerRows((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        selected: !prev[workerId]?.selected
      }
    }));
  };

  const filteredModalWorkers = workers.filter((w) => {
    if (!modalWorkerSearch.trim()) return true;
    const q = modalWorkerSearch.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      (w.skill && w.skill.toLowerCase().includes(q)) ||
      (w.phone && w.phone.includes(q))
    );
  });

  // Select / Deselect All
  const handleToggleSelectAll = () => {
    const allFilteredSelected = filteredModalWorkers.length > 0 && filteredModalWorkers.every((w) => workerRows[w.id]?.selected);
    const updated: Record<string, WorkerRowState> = { ...workerRows };
    filteredModalWorkers.forEach((w) => {
      const existing = workerRows[w.id];
      updated[w.id] = {
        worker_id: w.id,
        selected: !allFilteredSelected,
        attendance: existing?.attendance || 'FULL',
        selling_rate: existing?.selling_rate || 0,
        wage_rate: existing?.wage_rate || 0
      };
    });
    setWorkerRows(updated);
  };

  // Update specific worker row
  const updateWorkerRow = (workerId: string, updates: Partial<WorkerRowState>) => {
    setWorkerRows((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        ...updates
      }
    }));
  };

  // Calculate Batch Summary
  const selectedRows = Object.values(workerRows).filter((r) => r.selected);
  const totalWages = selectedRows.reduce(
    (acc, r) => acc + (r.attendance === 'FULL' ? r.wage_rate : r.wage_rate * 0.5),
    0
  );

  const handleExecuteSendMultiWorkers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer) return;

    if (selectedRows.length === 0) {
      toast.warning('Please select at least 1 worker to send.', 'No Workers Selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadWorkers: MultiWorkerItem[] = selectedRows.map((r) => ({
        worker_id: r.worker_id,
        attendance: r.attendance,
        selling_rate: Number(r.wage_rate) || 0,
        wage_rate: Number(r.wage_rate) || 0,
        notes: workNotes
      }));

      await sendMultiWorkers({
        work_date: workDate,
        dealer_id: selectedDealer.id,
        site_id: selectedSiteId || undefined,
        notes: workNotes,
        workers: payloadWorkers
      });

      setIsSendWorkerOpen(false);
      setWorkNotes('');
      toast.success(
        `Successfully dispatched ${payloadWorkers.length} workers to ${selectedDealer.name}! Subledger balance updated.`,
        'Crew Dispatched'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch worker crew.', 'Dispatch Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenPayment = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setPaymentAmount('');
    setPaymentRef('');
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealer || paymentAmount === '' || Number(paymentAmount) <= 0) {
      toast.warning('Please enter a valid payment amount greater than 0.', 'Invalid Amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        party_type: 'DEALER',
        party_id: selectedDealer.id,
        kind: 'DEALER_RECEIPT',
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentRef || undefined,
        note: `Receipt from ${selectedDealer.name}`
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
      toast.success(
        `Payment receipt of ₹${Number(paymentAmount).toLocaleString('en-IN')} recorded for ${selectedDealer.name}!`,
        'Payment Recorded'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment receipt.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
                Pillar 1
              </span>
              <span className="text-xs text-zinc-400 font-mono">Client Supply & Billing</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Dealers & Project Sites
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Register client contractors, configure daily supply billing rates, dispatch worker rosters to sites, and record payment receipts.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap font-mono">
            <button
              onClick={() => {
                setName('');
                setPhone('');
                setAddress('');
                setDefaultRate('');
                setIsDealerModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md active:scale-95"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add New Dealer</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Deck */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Total Dealers</div>
            {loading ? (
              <Skeleton className="w-16 h-7 mt-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-2xl font-mono font-black text-white mt-1">{dealers.length}</div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-800">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Active Work Sites</div>
            {loading ? (
              <Skeleton className="w-16 h-7 mt-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-2xl font-mono font-black text-zinc-200 mt-1">{sites.length}</div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-800">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Total Receivables Due</div>
            {loading ? (
              <Skeleton className="w-24 h-7 mt-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-2xl font-mono font-black text-white mt-1">{formatINR(metrics.totalReceivable)}</div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 text-white border border-zinc-800">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono font-bold tracking-wider text-zinc-400">Worker Pool Size</div>
            {loading ? (
              <Skeleton className="w-24 h-7 mt-1 rounded bg-zinc-800" />
            ) : (
              <div className="text-2xl font-mono font-black text-zinc-300 mt-1">{workers.length} Workers</div>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 text-zinc-300 border border-zinc-800">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notification */}
      {feedback && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search dealer by name, code, phone, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <span>Showing <strong className="text-white">{loading ? '...' : filteredDealers.length}</strong> of {loading ? '...' : dealers.length} Dealers</span>
        </div>
      </div>

      {/* Dealers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="w-36 h-5 rounded bg-zinc-800" />
                  <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
                </div>
                <Skeleton className="w-16 h-5 rounded-full bg-zinc-800" />
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <Skeleton className="w-full h-3 rounded bg-zinc-800" />
                <Skeleton className="w-3/4 h-3 rounded bg-zinc-800" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <Skeleton className="w-1/2 h-8 rounded-xl bg-zinc-800" />
                <Skeleton className="w-1/2 h-8 rounded-xl bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : dealers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-white">No Dealers Registered Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Click "+ Add New Dealer" to register your client contractors or developers to whom you supply labour.
          </p>
          <button
            onClick={() => {
              setName('');
              setPhone('');
              setAddress('');
              setDefaultRate(900);
              setIsDealerModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider font-mono hover:bg-zinc-200"
          >
            <PlusCircle className="w-4 h-4" /> Add First Dealer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredDealers.map((dealer) => {
            const dealerSites = sites.filter((s) => s.dealer_id === dealer.id);
            const dealerAllocations = allocations.filter((a) => a.dealer_id === dealer.id);
            const dealerPayments = payments.filter(
              (p) => p.party_type === 'DEALER' && p.party_id === dealer.id && !p.is_reversed
            );

            const totalBilledAmount = dealerAllocations.reduce((sum, a) => sum + (a.charge_amount || 0), 0);
            const totalReceivedAmount = dealerPayments.reduce(
              (sum, p) => sum + (p.kind === 'DEALER_RECEIPT' ? p.amount : -p.amount),
              0
            );
            const balanceDue = totalBilledAmount - totalReceivedAmount;

            return (
              <div
                key={dealer.id}
                className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-650 transition-all flex flex-col justify-between shadow-xl space-y-5 group"
              >
                <div className="space-y-4">
                  {/* Card Header: Code & Rate & Actions */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                        {dealer.code}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Client" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">
                        Rate: <strong className="text-white font-bold">₹{dealer.default_rate}/day</strong>
                      </span>
                      {/* Edit & Delete Action Buttons */}
                      <button
                        onClick={() => handleOpenEditDealer(dealer)}
                        title="Edit Dealer Details"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-750 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDealer(dealer)}
                        title="Delete Dealer"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-750 hover:border-rose-900 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dealer Name & Contact */}
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight group-hover:text-zinc-100 transition-colors">
                      {dealer.name}
                    </h3>
                    <div className="mt-2 space-y-1.5 text-xs text-zinc-400 font-mono">
                      {dealer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="text-zinc-300">{dealer.phone}</span>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="text-zinc-300 truncate">{dealer.address || 'Standard / Local Site'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Status Matrix */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 font-mono space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Net Balance Due:</span>
                      <span className="font-bold text-sm text-white">
                        {balanceDue > 0 ? (
                          <span className="text-white">{formatINR(balanceDue)}</span>
                        ) : balanceDue < 0 ? (
                          <span className="text-zinc-400">{formatINR(balanceDue)} (Advance)</span>
                        ) : (
                          <span className="text-zinc-500">₹0 (Settled)</span>
                        )}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Billed: ₹{totalBilledAmount.toLocaleString('en-IN')}</span>
                      <span>Paid: ₹{totalReceivedAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Work Sites Subsection */}
                  <div>
                    <div className="flex items-center justify-between mb-2 font-mono">
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-zinc-500" />
                        Sites ({dealerSites.length})
                      </span>
                      <button
                        onClick={() => {
                          setTargetDealerId(dealer.id);
                          setSiteName('');
                          setSiteAddress('');
                          setIsSiteModalOpen(true);
                        }}
                        className="text-[11px] text-zinc-300 hover:text-white font-semibold flex items-center gap-1 hover:underline"
                      >
                        + Add Site
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {dealerSites.length === 0 ? (
                        <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-850 text-[11px] text-zinc-500 font-mono">
                          Main account site only. Click + Add Site to register projects.
                        </div>
                      ) : (
                        dealerSites.map((s) => (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                          >
                            <span className="font-semibold text-zinc-200 truncate">{s.name}</span>
                            <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">
                              {s.address || 'Active'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Action Toolbar */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center gap-2 font-mono">
                  <button
                    onClick={() => handleOpenSendWorkers(dealer)}
                    className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 touch-press"
                  >
                    <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Send Workers</span>
                  </button>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => handleOpenPayment(dealer)}
                      className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-semibold text-xs flex items-center justify-center gap-1 border border-zinc-700 transition-colors active:scale-95 touch-press"
                      title="Receive Payment from Dealer"
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>

                    <Link
                      href={`/reports?partyId=${dealer.id}&partyType=DEALER`}
                      className="flex-1 sm:flex-initial py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 flex items-center justify-center gap-1 transition-colors active:scale-95 touch-press"
                      title="View Double-Entry Ledger Statement"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ledger</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Dealer */}
      {isDealerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Register New Dealer</h3>
              </div>
              <button onClick={() => setIsDealerModalOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDealer} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Dealer / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Builders, Metro Projects, Rajesh Kumar..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Phone / Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Office / Base Location</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 62, Gurgaon, South City..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                  Default Billing Rate (₹ / Worker / Day)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 900"
                  value={defaultRate}
                  onChange={(e) => setDefaultRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsDealerModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Dealer */}
      {isEditDealerModalOpen && editingDealer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Edit Dealer: {editingDealer.code}</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditDealerModalOpen(false);
                  setEditingDealer(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditDealer} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Dealer / Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Builders, Metro Projects, Rajesh Kumar..."
                  value={editDealerName}
                  onChange={(e) => setEditDealerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Phone / Mobile Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={editDealerPhone}
                  onChange={(e) => setEditDealerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Office / Base Location</label>
                <input
                  type="text"
                  placeholder="e.g. Sector 62, Gurgaon, South City..."
                  value={editDealerAddress}
                  onChange={(e) => setEditDealerAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                  Default Billing Rate (₹ / Worker / Day)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 900"
                  value={editDealerRate}
                  onChange={(e) => setEditDealerRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDealerModalOpen(false);
                    setEditingDealer(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Updating...' : 'Update Dealer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Project Site */}
      {isSiteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Add Project Work Site</h3>
              </div>
              <button onClick={() => setIsSiteModalOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSite} className="p-6 space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Site / Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower B - 5th Floor, Villa 104, Metro Station Pier 12..."
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Site Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Near Gate 3, Sector 18..."
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Saving...' : 'Save Project Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send Multiple Workers Roster */}
      {isSendWorkerOpen && selectedDealer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] sm:max-h-[88vh] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">
                    Dispatch Workers to {selectedDealer.name}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">Dealer Code: {selectedDealer.code} • Atomic Subledger Posting</p>
                </div>
              </div>
              <button onClick={() => setIsSendWorkerOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleExecuteSendMultiWorkers} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Batch Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Work Date *</label>
                  <input
                    type="date"
                    required
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Project Work Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  >
                    <option value="">-- Main Dealer Account --</option>
                    {sites
                      .filter((s) => s.dealer_id === selectedDealer.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Workers Multi-Select Table with Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-300 font-mono flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    Select Workers to Send ({selectedRows.length} of {workers.length} selected)
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs text-zinc-400 hover:text-white font-mono underline self-end sm:self-auto"
                  >
                    {filteredModalWorkers.length > 0 && filteredModalWorkers.every((w) => workerRows[w.id]?.selected) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Worker Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search workers by name, ID, or trade/skill..."
                    value={modalWorkerSearch}
                    onChange={(e) => setModalWorkerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                  />
                  {modalWorkerSearch && (
                    <button
                      type="button"
                      onClick={() => setModalWorkerSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {workers.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-xs font-mono">
                    No workers registered in Worker Portal yet. Please add workers first.
                  </div>
                ) : filteredModalWorkers.length === 0 ? (
                  <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 text-center text-zinc-500 text-xs font-mono">
                    No workers match "{modalWorkerSearch}".
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800/80 bg-zinc-950">
                      {filteredModalWorkers.map((w) => {
                        const row = workerRows[w.id] || {
                          worker_id: w.id,
                          selected: false,
                          attendance: 'FULL',
                          selling_rate: 0,
                          wage_rate: 0
                        };

                        return (
                          <div
                            key={w.id}
                            className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              row.selected ? 'bg-zinc-900/90' : 'hover:bg-zinc-900/40'
                            }`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => toggleWorkerSelection(w.id)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="font-bold text-xs text-white">{w.name}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">
                                  {w.code} • {w.skill}
                                </div>
                              </div>
                            </label>

                            {row.selected && (
                              <div className="flex items-center gap-2.5 font-mono text-xs pl-7 sm:pl-0 flex-wrap">
                                <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                                  <button
                                    type="button"
                                    onClick={() => updateWorkerRow(w.id, { attendance: 'FULL' })}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      row.attendance === 'FULL' ? 'bg-white text-black' : 'text-zinc-400'
                                    }`}
                                  >
                                    FULL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateWorkerRow(w.id, { attendance: 'HALF' })}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      row.attendance === 'HALF' ? 'bg-zinc-200 text-black' : 'text-zinc-400'
                                    }`}
                                  >
                                    HALF
                                  </button>
                                </div>

                                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px]">
                                  <span className="text-zinc-400 font-semibold">Wage ₹:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="Enter wage"
                                    value={row.wage_rate || ''}
                                    onChange={(e) =>
                                      updateWorkerRow(w.id, {
                                        wage_rate: e.target.value === '' ? 0 : Number(e.target.value)
                                      })
                                    }
                                    className="w-24 bg-transparent font-bold text-white text-right focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Memo Note */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Work Note / Batch Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Night shift casting, Tower A foundation..."
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              {/* Bottom Summary & Actions */}
              <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-zinc-400">Selected Crew:</span>{' '}
                    <strong className="text-white text-sm">{selectedRows.length} Workers</strong>
                  </div>
                  <div>
                    <span className="text-zinc-400">Total Wage Cost:</span>{' '}
                    <strong className="text-white text-sm">{formatINR(totalWages)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSendWorkerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedRows.length === 0 || isSubmitting}
                    className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm disabled:opacity-40 flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {isSubmitting ? 'Dispatching...' : `Confirm Dispatch (${selectedRows.length})`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive Payment */}
      {isPaymentModalOpen && selectedDealer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Receive Payment from Dealer</h3>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="p-6 space-y-4 font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                <span className="text-zinc-400">Client Dealer:</span>
                <div className="font-bold text-white text-sm mt-0.5">{selectedDealer.name}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter amount (₹) e.g. 5000"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <option value="UPI">UPI / QR Transfer</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="BANK">Bank NEFT / RTGS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-99881122"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Recording...' : 'Record Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dealer Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!dealerToDelete}
        title="Permanently Delete Dealer?"
        itemType="Client Dealer Account"
        itemName={dealerToDelete?.name}
        itemCode={dealerToDelete?.code}
        warningMessage="This will permanently delete this client dealer, along with all associated project work sites, worker allocations, payment receipts, and double-entry subledger history."
        confirmButtonText="Delete Dealer"
        onConfirm={handleConfirmDeleteDealer}
        onClose={() => setDealerToDelete(null)}
      />
    </div>
  );
}
