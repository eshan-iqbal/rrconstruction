'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Building2,
  HardHat,
  CheckCircle2,
  PlusCircle,
  Send,
  ArrowRight,
  Search,
  Filter,
  CheckSquare,
  Square,
  Pencil,
  Trash2,
  Loader2,
  Eye
} from 'lucide-react';
import { useSqlStore, MultiWorkerItem, WorkAllocation } from '@/lib/storage/useSqlStore';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import PartyHistoryModal from '@/components/ui/PartyHistoryModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

interface WorkerRowState {
  worker_id: string;
  selected: boolean;
  attendance: 'FULL' | 'HALF';
  selling_rate: number;
  wage_rate: number;
}

export default function AttendancePage() {
  const { dealers, sites, workers, allocations, loading, sendMultiWorkers, editAllocation, deleteAllocation } = useSqlStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [isSendWorkerOpen, setIsSendWorkerOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [modalWorkerSearch, setModalWorkerSearch] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [workerRows, setWorkerRows] = useState<Record<string, WorkerRowState>>({});

  // Edit Allocation Modal State
  const [isEditAllocationOpen, setIsEditAllocationOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<WorkAllocation | null>(null);
  const [editWorkDate, setEditWorkDate] = useState('');
  const [editAttendance, setEditAttendance] = useState<'FULL' | 'HALF' | 'ABSENT'>('FULL');
  const [editSellingRate, setEditSellingRate] = useState<number | ''>('');
  const [editWageRate, setEditWageRate] = useState<number | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [editSiteId, setEditSiteId] = useState('');

  // Delete Confirmation State
  const [allocationToDelete, setAllocationToDelete] = useState<WorkAllocation | null>(null);
  const [selectedPartyModal, setSelectedPartyModal] = useState<{ type: 'DEALER' | 'WORKER'; id: string } | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const dateAllocations = allocations.filter((a) => a.work_date === selectedDate);

  const handleOpenDispatch = () => {
    const defaultDealer = dealers.length > 0 ? dealers[0] : null;
    const dId = defaultDealer ? defaultDealer.id : '';
    setSelectedDealerId(dId);
    setSelectedDate(getTodayDate());
    setModalWorkerSearch('');

    const dealerSites = sites.filter((s) => s.dealer_id === dId);
    setSelectedSiteId(dealerSites.length > 0 ? dealerSites[0].id : '');

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

  const handleDealerChange = (dealerId: string) => {
    setSelectedDealerId(dealerId);
    const dealerSites = sites.filter((s) => s.dealer_id === dealerId);
    setSelectedSiteId(dealerSites.length > 0 ? dealerSites[0].id : '');
  };

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

  const updateWorkerRow = (workerId: string, updates: Partial<WorkerRowState>) => {
    setWorkerRows((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        ...updates
      }
    }));
  };

  const selectedRows = Object.values(workerRows).filter((r) => r.selected);
  const totalWages = selectedRows.reduce((acc, r) => acc + (r.attendance === 'FULL' ? r.wage_rate : r.wage_rate * 0.5), 0);

  const handleExecuteSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealerId) {
      toast.warning('Please select a target dealer.', 'Validation Error');
      return;
    }
    if (selectedRows.length === 0) {
      toast.warning('Please select at least 1 worker to dispatch.', 'No Workers Selected');
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
        work_date: selectedDate,
        dealer_id: selectedDealerId,
        site_id: selectedSiteId || undefined,
        notes: workNotes,
        workers: payloadWorkers
      });

      setIsSendWorkerOpen(false);
      setWorkNotes('');
      toast.success(
        `Dispatched ${payloadWorkers.length} workers for ${selectedDate}! Subledgers updated.`,
        'Dispatch Successful'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch workers.', 'Dispatch Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditAllocation = (alloc: WorkAllocation) => {
    setEditingAllocation(alloc);
    setEditWorkDate(alloc.work_date);
    setEditAttendance(alloc.attendance);
    setEditSellingRate(alloc.selling_rate);
    setEditWageRate(alloc.wage_rate);
    setEditNotes(alloc.notes || '');
    setEditSiteId(alloc.site_id || '');
    setIsEditAllocationOpen(true);
  };

  const handleSaveEditAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAllocation) return;

    setIsSubmitting(true);
    try {
      await editAllocation({
        id: editingAllocation.id,
        work_date: editWorkDate,
        attendance: editAttendance,
        selling_rate: editSellingRate !== '' ? Number(editSellingRate) : 0,
        wage_rate: editWageRate !== '' ? Number(editWageRate) : 0,
        notes: editNotes,
        site_id: editSiteId || undefined
      });

      setIsEditAllocationOpen(false);
      setEditingAllocation(null);
      toast.success('Allocation updated and subledger entries recalculated!', 'Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update allocation.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllocation = (alloc: WorkAllocation) => {
    setAllocationToDelete(alloc);
  };

  const handleConfirmDeleteAllocation = async () => {
    if (!allocationToDelete) return;
    try {
      await deleteAllocation(allocationToDelete.id);
      toast.success('Allocation removed and subledger entries reversed.', 'Allocation Deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete allocation.', 'Error');
    } finally {
      setAllocationToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
              Dispatch
            </span>
            <span className="text-xs text-zinc-400 font-mono">Date: {selectedDate}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Daily Worker Splitting & Attendance</h1>
          <p className="text-xs text-zinc-400">
            Dispatch single or multiple workers across client dealer project sites.
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
          />
          <button
            onClick={handleOpenDispatch}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" /> Send Multi-Workers
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Allocations Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 font-mono font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Worker Name</th>
                <th className="p-3.5">Assigned Client Dealer</th>
                <th className="p-3.5">Project Site</th>
                <th className="p-3.5">Attendance</th>
                <th className="p-3.5 text-right">Selling Rate</th>
                <th className="p-3.5 text-right">Wage Rate</th>
                <th className="p-3.5 text-right">Billed Amount</th>
                <th className="p-3.5 text-right">Wage Cost</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70 font-sans">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-3.5"><Skeleton className="w-32 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-28 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-24 h-4 rounded bg-zinc-800" /></td>
                    <td className="p-3.5"><Skeleton className="w-16 h-5 rounded bg-zinc-800" /></td>
                    <td className="p-3.5 text-right"><Skeleton className="w-14 h-4 rounded bg-zinc-800 ml-auto" /></td>
                    <td className="p-3.5 text-right"><Skeleton className="w-14 h-4 rounded bg-zinc-800 ml-auto" /></td>
                    <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                    <td className="p-3.5 text-right"><Skeleton className="w-16 h-4 rounded bg-zinc-800 ml-auto" /></td>
                    <td className="p-3.5 text-center"><Skeleton className="w-12 h-6 rounded bg-zinc-800 mx-auto" /></td>
                  </tr>
                ))
              ) : dateAllocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-zinc-400">
                    <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2.5" />
                    <p className="text-sm font-semibold text-zinc-300">No workers dispatched on {selectedDate}</p>
                    <p className="text-xs text-zinc-500 mt-1">Click "Send Multi-Workers" to dispatch personnel to a dealer site.</p>
                  </td>
                </tr>
              ) : (
                dateAllocations.map((a) => {
                  return (
                    <tr key={a.id} className="hover:bg-zinc-850/60 transition-colors">
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPartyModal({ type: 'WORKER', id: a.worker_id })}
                          className="font-bold text-white hover:text-sky-400 transition-colors flex items-center gap-1.5 group text-left cursor-pointer"
                          title="Click to view worker history and profile"
                        >
                          <Users className="w-3.5 h-3.5 text-zinc-400 group-hover:text-sky-400" />
                          <span className="underline decoration-zinc-700 group-hover:decoration-sky-400 underline-offset-2">
                            {a.worker_name}
                          </span>
                          <Eye className="w-3 h-3 text-zinc-500 group-hover:text-sky-400 opacity-60 group-hover:opacity-100" />
                        </button>
                        <span className="text-[10px] text-zinc-400 font-mono block font-normal mt-0.5">{a.worker_skill || 'Worker'}</span>
                      </td>
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPartyModal({ type: 'DEALER', id: a.dealer_id })}
                          className="font-semibold text-zinc-200 hover:text-emerald-400 transition-colors flex items-center gap-1.5 group text-left cursor-pointer"
                          title="Click to view dealer history and balance"
                        >
                          <Building2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400" />
                          <span className="underline decoration-zinc-700 group-hover:decoration-emerald-400 underline-offset-2">
                            {a.dealer_name}
                          </span>
                          <Eye className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 opacity-60 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="p-3.5 text-zinc-400">{a.site_name || 'General Site'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-white text-black font-mono font-bold text-[10px]">
                          {a.attendance} ({a.units}x)
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-zinc-300">{formatINR(a.selling_rate)}</td>
                      <td className="p-3.5 text-right font-mono text-zinc-300">{formatINR(a.wage_rate)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-white">{formatINR(a.charge_amount)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-zinc-300">{formatINR(a.wage_amount)}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-mono">
                          <button
                            onClick={() => handleOpenEditAllocation(a)}
                            title="Edit Allocation"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAllocation(a)}
                            title="Delete Allocation"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-900 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Modal: Send Multi-Workers */}
      {isSendWorkerOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Send Multi-Workers to Dealer</h3>
              </div>
              <button onClick={() => setIsSendWorkerOpen(false)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteSend} className="p-6 space-y-4">
              {/* Dealer & Site */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Client Dealer *</label>
                  <select
                    required
                    value={selectedDealerId}
                    onChange={(e) => handleDealerChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="">-- Choose Dealer --</option>
                    {dealers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Work Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="">General Site</option>
                    {sites
                      .filter((s) => s.dealer_id === selectedDealerId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Workers Multi-Select List with Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    Select Crew ({selectedRows.length} of {workers.length} workers)
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1 font-semibold self-end sm:self-auto"
                  >
                    {filteredModalWorkers.length > 0 && filteredModalWorkers.every((w) => workerRows[w.id]?.selected) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
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

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-850">
                  {filteredModalWorkers.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 font-mono">
                      No workers found matching "{modalWorkerSearch}".
                    </div>
                  ) : (
                    filteredModalWorkers.map((w) => {
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
                          className={`p-3 rounded-xl border transition-all pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            row.selected ? 'bg-zinc-950 border-zinc-700' : 'bg-zinc-950/40 border-zinc-850 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleWorkerSelection(w.id)}
                              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-white cursor-pointer"
                            />
                            <div>
                              <div className="text-xs font-bold text-white">{w.name}</div>
                              <div className="text-[10px] text-zinc-400 font-mono">
                                {w.code} • {w.skill}
                              </div>
                            </div>
                          </div>

                          {row.selected ? (
                            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
                              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
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

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-zinc-400 font-semibold">Wage ₹:</span>
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
                                  className="w-24 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-bold text-white text-right focus:outline-none focus:ring-1 focus:ring-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-500 font-mono italic">Not selected</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Batch Summary */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">SELECTED CREW</span>
                    <strong className="text-white text-sm">{selectedRows.length} Workers</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px]">TOTAL WAGE COST</span>
                    <strong className="text-white text-sm">{formatINR(totalWages)}</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
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
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Posting...' : `Confirm & Post (${selectedRows.length}) Allocations`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Allocation */}
      {isEditAllocationOpen && editingAllocation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">
                  Edit Work Allocation
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditAllocationOpen(false);
                  setEditingAllocation(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAllocation} className="p-6 space-y-4 font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1">
                <div>
                  <span className="text-zinc-400">Worker:</span>{' '}
                  <strong className="text-white">{editingAllocation.worker_name}</strong> ({editingAllocation.worker_skill})
                </div>
                <div>
                  <span className="text-zinc-400">Dealer:</span>{' '}
                  <strong className="text-white">{editingAllocation.dealer_name}</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Work Date *</label>
                <input
                  type="date"
                  required
                  value={editWorkDate}
                  onChange={(e) => setEditWorkDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Project Work Site</label>
                <select
                  value={editSiteId}
                  onChange={(e) => setEditSiteId(e.target.value)}
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
                    onClick={() => setEditAttendance('FULL')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editAttendance === 'FULL'
                        ? 'bg-white text-black border-white'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    FULL DAY (1.0x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAttendance('HALF')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      editAttendance === 'HALF'
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
                    value={editSellingRate}
                    onChange={(e) => setEditSellingRate(e.target.value === '' ? '' : Number(e.target.value))}
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
                    value={editWageRate}
                    onChange={(e) => setEditWageRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Work Memo / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Overtime, specific task..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditAllocationOpen(false);
                    setEditingAllocation(null);
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
                  {isSubmitting ? 'Updating...' : 'Update & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Allocation Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!allocationToDelete}
        title="Permanently Delete Allocation?"
        itemType="Work Attendance Allocation"
        itemName={`${allocationToDelete?.worker_name} → ${allocationToDelete?.dealer_name}`}
        itemCode={allocationToDelete?.work_date}
        warningMessage="Are you sure you want to delete this allocation? This will completely reverse and remove both the Dealer's Billed Charge and Worker's Wage Earned subledger entries."
        confirmButtonText="Delete Allocation"
        onConfirm={handleConfirmDeleteAllocation}
        onClose={() => setAllocationToDelete(null)}
      />

      {/* Party Details & History Modal */}
      {selectedPartyModal && (
        <PartyHistoryModal
          partyType={selectedPartyModal.type}
          partyId={selectedPartyModal.id}
          onClose={() => setSelectedPartyModal(null)}
        />
      )}
    </div>
  );
}
