'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  HardHat,
  IndianRupee,
  CreditCard,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import { useSqlStore, Worker } from '@/lib/storage/useSqlStore';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function WorkerPortalPage() {
  const { workers, loading, addWorker, editWorker, deleteWorker, recordPayment } = useSqlStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Worker Modal State
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState('');
  const [defaultWage, setDefaultWage] = useState<number | ''>('');

  // Edit Worker Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSkill, setEditSkill] = useState('');
  const [editDefaultWage, setEditDefaultWage] = useState<number | ''>('');

  // Delete Confirmation State
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Advance / Payout Modal State
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [actionType, setActionType] = useState<'ADVANCE' | 'PAYOUT'>('ADVANCE');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [note, setNote] = useState('');

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const dynamicSkillsList = Array.from(new Set(workers.map((w) => w.skill).filter(Boolean)));

  const filteredWorkers = workers.filter((w) => {
    if (skillFilter !== 'ALL' && w.skill !== skillFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.skill.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q))
      );
    }
    return true;
  });

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await addWorker({
        name: name.trim(),
        phone: phone.trim() || undefined,
        skill: skill.trim() || 'General Labour',
        default_wage: defaultWage !== '' ? Number(defaultWage) : 0
      });

      toast.success(`Worker "${name.trim()}" registered successfully!`, 'Worker Created');
      setIsWorkerModalOpen(false);
      setName('');
      setPhone('');
      setSkill('');
      setDefaultWage('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register worker.', 'Registration Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setEditName(worker.name);
    setEditPhone(worker.phone || '');
    setEditSkill(worker.skill);
    setEditDefaultWage(worker.default_wage);
    setIsEditModalOpen(true);
  };

  const handleSaveEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !editName.trim()) return;

    try {
      setIsSubmitting(true);
      await editWorker({
        id: editingWorker.id,
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        skill: editSkill.trim() || 'General Labour',
        default_wage: editDefaultWage !== '' ? Number(editDefaultWage) : 0
      });

      toast.success(`Worker "${editName.trim()}" updated successfully!`, 'Profile Updated');
      setIsEditModalOpen(false);
      setEditingWorker(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update worker.', 'Update Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorker = (worker: Worker) => {
    setWorkerToDelete(worker);
  };

  const handleConfirmDeleteWorker = async () => {
    if (!workerToDelete) return;
    try {
      await deleteWorker(workerToDelete.id);
      toast.info(`Worker "${workerToDelete.name}" and records removed.`, 'Worker Deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete worker.', 'Delete Error');
    } finally {
      setWorkerToDelete(null);
    }
  };

  const handleOpenMoneyAction = (worker: Worker, type: 'ADVANCE' | 'PAYOUT') => {
    setSelectedWorker(worker);
    setActionType(type);
    setAmount('');
    setNote('');
  };

  const handleExecuteMoneyAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker || amount === '' || Number(amount) <= 0) {
      toast.warning('Please enter a valid amount greater than zero.', 'Invalid Amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await recordPayment({
        party_type: 'WORKER',
        party_id: selectedWorker.id,
        kind: actionType === 'ADVANCE' ? 'WORKER_ADVANCE' : 'WORKER_PAYOUT',
        amount: Number(amount),
        method,
        note: note || (actionType === 'ADVANCE' ? 'Advance Cash' : 'Wage Payout')
      });

      toast.success(
        `${actionType === 'ADVANCE' ? 'Cash advance of' : 'Wage payout of'} ₹${amount} recorded for ${selectedWorker.name}!`,
        'Voucher Recorded'
      );
      setSelectedWorker(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record voucher.', 'Voucher Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold bg-white text-black">
              Pillar 2
            </span>
            {loading ? (
              <Skeleton className="w-28 h-4 rounded bg-zinc-800" />
            ) : (
              <span className="text-xs text-zinc-400 font-mono">Total {workers.length} Registered Workers</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Worker Portal & Advances</h1>
          <p className="text-xs text-zinc-400">
            Register personnel, set daily wage baselines, log cash advances, and issue payouts.
          </p>
        </div>

        <button
          onClick={() => setIsWorkerModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 font-mono touch-press"
        >
          <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" /> + Register Worker
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker name, code, trade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          >
            <option value="ALL">All Roles / Trades</option>
            {dynamicSkillsList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Workers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl space-y-4 animate-pulse">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <Skeleton className="w-16 h-5 rounded bg-zinc-800" />
                <Skeleton className="w-20 h-4 rounded bg-zinc-800" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-2xl bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="w-32 h-5 rounded bg-zinc-800" />
                  <Skeleton className="w-24 h-3 rounded bg-zinc-800" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <Skeleton className="h-8 rounded-xl bg-zinc-800" />
                <Skeleton className="h-8 rounded-xl bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : workers.length === 0 ? (
        <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
          <Users className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-white">No Workers Registered Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Click "+ Register Worker" to add masons, beldars, saria workers, or carpenters to your labour supply roster.
          </p>
          <button
            onClick={() => setIsWorkerModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider font-mono hover:bg-zinc-200"
          >
            <PlusCircle className="w-4 h-4" /> Register First Worker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkers.map((w) => {
            return (
              <div
                key={w.id}
                className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between shadow-xl space-y-4 relative group"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <span className="text-xs font-mono font-bold text-white bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                      {w.code}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditWorker(w)}
                        title="Edit Worker Profile"
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorker(w)}
                        title="Delete Worker"
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-900 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Name & Details */}
                  <div className="mt-3 space-y-1.5">
                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-zinc-100 transition-colors">
                      {w.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <HardHat className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-semibold text-zinc-300">{w.skill}</span>
                    </div>
                    {w.phone && (
                      <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{w.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Wage & Actions Box */}
                <div className="pt-4 border-t border-zinc-800 space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400">Daily Base Wage:</span>
                    <span className="font-bold text-white">₹{w.default_wage} / day</span>
                  </div>

                  {/* Money Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => handleOpenMoneyAction(w, 'ADVANCE')}
                      className="w-full py-2 px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-amber-400 border border-zinc-800 hover:border-amber-900/50 font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Advance
                    </button>
                    <button
                      onClick={() => handleOpenMoneyAction(w, 'PAYOUT')}
                      className="w-full py-2 px-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <IndianRupee className="w-3.5 h-3.5 stroke-[2.5]" /> Wage Payout
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Worker */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">Register Worker Personnel</h3>
              </div>
              <button
                onClick={() => setIsWorkerModalOpen(false)}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Worker Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chauhan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Worker Role / Skill / Custom Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mason, Helper, Beldar, Carpenter, Plumber, Supervisor..."
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  list="worker-skills-datalist"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
                {dynamicSkillsList.length > 0 && (
                  <datalist id="worker-skills-datalist">
                    {dynamicSkillsList.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Daily Wage (₹ / Day)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 600"
                  value={defaultWage}
                  onChange={(e) => setDefaultWage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Register Worker</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Worker */}
      {isEditModalOpen && editingWorker && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">
                  Edit Worker: {editingWorker.code}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingWorker(null);
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditWorker} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Worker Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chauhan"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Role / Skill</label>
                <input
                  type="text"
                  placeholder="e.g. Mason, Helper..."
                  value={editSkill}
                  onChange={(e) => setEditSkill(e.target.value)}
                  list="edit-worker-skills-datalist"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-sans"
                />
                {dynamicSkillsList.length > 0 && (
                  <datalist id="edit-worker-skills-datalist">
                    {dynamicSkillsList.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Default Daily Wage (₹ / Day)</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 600"
                  value={editDefaultWage}
                  onChange={(e) => setEditDefaultWage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingWorker(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Worker Advance or Wage Payout */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-white" />
                <h3 className="font-bold text-base text-white tracking-tight">
                  {actionType === 'ADVANCE' ? 'Issue Cash Advance' : 'Pay Worker Wages'}
                </h3>
              </div>
              <button onClick={() => setSelectedWorker(null)} className="text-zinc-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMoneyAction} className="p-6 space-y-4 font-mono">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                <span className="text-zinc-400">Worker:</span>
                <div className="font-bold text-white text-sm mt-0.5">
                  {selectedWorker.name} ({selectedWorker.code} - {selectedWorker.skill})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="Enter amount (₹) e.g. 1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-base font-bold text-white focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Payment Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="BANK">Bank Account Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-sans">Note / Audit Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Festival advance, Weekly wage payout..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedWorker(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <span>Confirm & Record Voucher</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!workerToDelete}
        title="Permanently Delete Worker?"
        itemType="Worker Personnel"
        itemName={workerToDelete?.name}
        itemCode={workerToDelete?.code}
        warningMessage="Are you sure you want to delete this worker? This will permanently remove their profile, attendance history, wage advances/payouts, and subledger transactions."
        confirmButtonText="Delete Worker"
        onConfirm={handleConfirmDeleteWorker}
        onClose={() => setWorkerToDelete(null)}
      />
    </div>
  );
}
