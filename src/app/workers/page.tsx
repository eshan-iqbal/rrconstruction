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
  Loader2,
  Download,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Building,
  MapPin,
  HeartPulse,
  Calendar,
  Eye,
  CheckCircle2,
  X,
  FileText,
  UserCheck,
  BadgeCheck
} from 'lucide-react';
import { useSqlStore, Worker } from '@/lib/storage/useSqlStore';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function WorkerPortalPage() {
  const { workers, allocations, payments, loading, addWorker, editWorker, deleteWorker, recordPayment } = useSqlStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingWorkerTab, setViewingWorkerTab] = useState<'WORK' | 'PAYMENTS' | 'KYC'>('WORK');

  // Active Tab inside Add/Edit Worker Modal ('BASIC' | 'KYC' | 'BANK' | 'PERSONAL')
  const [modalTab, setModalTab] = useState<'BASIC' | 'KYC' | 'BANK' | 'PERSONAL'>('BASIC');

  // Form State (Shared for Add & Edit)
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);

  // 1. Basic Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [skill, setSkill] = useState('');
  const [defaultWage, setDefaultWage] = useState<number | ''>('');
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().split('T')[0]);

  // 2. KYC Fields
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [voterId, setVoterId] = useState('');

  // 3. Bank & UPI Fields
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // 4. Personal & Emergency Contact Fields
  const [fatherName, setFatherName] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [localAddress, setLocalAddress] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodGroup, setBloodGroup] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [notes, setNotes] = useState('');

  // View KYC Profile Drawer/Modal
  const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);

  // Delete Confirmation State
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Advance / Payout Modal State
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [actionType, setActionType] = useState<'ADVANCE' | 'PAYOUT'>('ADVANCE');
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [note, setNote] = useState('');

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const dynamicSkillsList = Array.from(new Set(workers.map((w) => w.skill).filter(Boolean)));

  const filteredWorkers = workers.filter((w) => {
    if (skillFilter !== 'ALL' && w.skill !== skillFilter) return false;
    if (kycFilter === 'VERIFIED' && (!w.aadhaar_number && !w.pan_number && !w.bank_account_number)) return false;
    if (kycFilter === 'PENDING' && (w.aadhaar_number || w.pan_number || w.bank_account_number)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.skill.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q)) ||
        (w.aadhaar_number && w.aadhaar_number.includes(q)) ||
        (w.pan_number && w.pan_number.toLowerCase().includes(q)) ||
        (w.bank_account_number && w.bank_account_number.includes(q)) ||
        (w.permanent_address && w.permanent_address.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Reset form inputs
  const resetForm = () => {
    setEditingWorkerId(null);
    setModalTab('BASIC');
    setName('');
    setPhone('');
    setSkill('');
    setDefaultWage('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setAadhaarNumber('');
    setPanNumber('');
    setVoterId('');
    setBankName('');
    setBankAccountNumber('');
    setBankIfsc('');
    setUpiId('');
    setFatherName('');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setPermanentAddress('');
    setLocalAddress('');
    setGender('Male');
    setBloodGroup('');
    setDateOfBirth('');
    setNotes('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsWorkerModalOpen(true);
  };

  const handleOpenEditModal = (worker: Worker) => {
    setEditingWorkerId(worker.id);
    setModalTab('BASIC');
    setName(worker.name);
    setPhone(worker.phone || '');
    setSkill(worker.skill);
    setDefaultWage(worker.default_wage);
    setJoiningDate(worker.joining_date || new Date().toISOString().split('T')[0]);
    setAadhaarNumber(worker.aadhaar_number || '');
    setPanNumber(worker.pan_number || '');
    setVoterId(worker.voter_id || '');
    setBankName(worker.bank_name || '');
    setBankAccountNumber(worker.bank_account_number || '');
    setBankIfsc(worker.bank_ifsc || '');
    setUpiId(worker.upi_id || '');
    setFatherName(worker.father_name || '');
    setEmergencyContactName(worker.emergency_contact_name || '');
    setEmergencyContactPhone(worker.emergency_contact_phone || '');
    setPermanentAddress(worker.permanent_address || '');
    setLocalAddress(worker.local_address || '');
    setGender((worker.gender as any) || 'Male');
    setBloodGroup(worker.blood_group || '');
    setDateOfBirth(worker.date_of_birth || '');
    setNotes(worker.notes || '');
    setIsWorkerModalOpen(true);
  };

  const handleSubmitWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !joiningDate || !skill.trim() || defaultWage === '' || Number(defaultWage) <= 0) {
      toast.warning('Please fill in all required worker details (Name, Phone, Joining Date, Skill/Trade, and Daily Wage).', 'Validation Error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        skill: skill.trim() || 'General Labour',
        default_wage: Number(defaultWage),
        aadhaar_number: aadhaarNumber.trim() || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
        voter_id: voterId.trim() || undefined,
        bank_name: bankName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        bank_ifsc: bankIfsc.trim().toUpperCase() || undefined,
        upi_id: upiId.trim() || undefined,
        father_name: fatherName.trim() || undefined,
        emergency_contact_name: emergencyContactName.trim() || undefined,
        emergency_contact_phone: emergencyContactPhone.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,
        local_address: localAddress.trim() || undefined,
        gender: gender || undefined,
        blood_group: bloodGroup.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
        joining_date: joiningDate || undefined,
        notes: notes.trim() || undefined
      };

      if (editingWorkerId) {
        await editWorker({
          id: editingWorkerId,
          ...payload
        });
        toast.success(`Worker profile for "${name.trim()}" updated successfully!`, 'Worker Updated');
      } else {
        await addWorker(payload);
        toast.success(`Worker "${name.trim()}" registered with full KYC details!`, 'Worker Registered');
      }

      setIsWorkerModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save worker.', 'Error');
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
      toast.info(`Worker "${workerToDelete.name}" removed from database.`, 'Worker Deleted');
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

  // --------------------------------------------------------------------------
  // EXPORT ALL WORKERS TO CSV / EXCEL IN 1-CLICK
  // --------------------------------------------------------------------------
  const exportAllWorkersCSV = () => {
    if (workers.length === 0) {
      toast.warning('No worker records available to export.', 'Export Empty');
      return;
    }

    const headers = [
      'Worker Code',
      'Full Name',
      'Trade / Skill',
      'Default Daily Wage (₹)',
      'Phone Number',
      'Aadhaar Number',
      'PAN Card',
      'Voter ID',
      'Bank Name',
      'Account Number',
      'Bank IFSC',
      'UPI ID',
      'Father / Guardian Name',
      'Emergency Contact Name',
      'Emergency Contact Phone',
      'Permanent / Native Address',
      'Local / Site Address',
      'Gender',
      'Blood Group',
      'Date of Birth',
      'Joining Date',
      'Notes / Remarks',
      'Account Status'
    ];

    const rows = workers.map((w) => [
      `"${w.code || ''}"`,
      `"${(w.name || '').replace(/"/g, '""')}"`,
      `"${(w.skill || '').replace(/"/g, '""')}"`,
      w.default_wage || 0,
      `"${w.phone || ''}"`,
      `"${w.aadhaar_number || ''}"`,
      `"${w.pan_number || ''}"`,
      `"${w.voter_id || ''}"`,
      `"${(w.bank_name || '').replace(/"/g, '""')}"`,
      `"${w.bank_account_number || ''}"`,
      `"${w.bank_ifsc || ''}"`,
      `"${w.upi_id || ''}"`,
      `"${(w.father_name || '').replace(/"/g, '""')}"`,
      `"${(w.emergency_contact_name || '').replace(/"/g, '""')}"`,
      `"${w.emergency_contact_phone || ''}"`,
      `"${(w.permanent_address || '').replace(/"/g, '""')}"`,
      `"${(w.local_address || '').replace(/"/g, '""')}"`,
      `"${w.gender || 'Male'}"`,
      `"${w.blood_group || ''}"`,
      `"${w.date_of_birth || ''}"`,
      `"${w.joining_date || ''}"`,
      `"${(w.notes || '').replace(/"/g, '""')}"`,
      w.is_active ? '"ACTIVE"' : '"INACTIVE"'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RR_Construction_All_Workers_KYC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported complete KYC records for ${workers.length} workers to CSV!`, 'Export Complete');
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
              <span className="text-xs text-zinc-400 font-mono">
                Total {workers.length} Workers • Full KYC & Bank Register
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Worker Personnel & Master KYC</h1>
          <p className="text-xs text-zinc-400">
            Register personnel, manage Aadhaar/PAN/Bank KYC, track advances, and export master rosters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export All in a Go */}
          <button
            onClick={exportAllWorkersCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-emerald-400 hover:text-emerald-300 font-bold text-xs uppercase tracking-wide border border-zinc-800 hover:border-emerald-900/60 transition-all font-mono active:scale-95 shadow-sm"
            title="Download full worker KYC, bank, and wage spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export All (CSV)
          </button>

          {/* Register Worker Button */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 font-mono touch-press"
          >
            <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" /> Register Worker
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by worker name, code, skill, Aadhaar, PAN, Bank account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          {/* KYC Status Filter */}
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white"
          >
            <option value="ALL">All KYC Status</option>
            <option value="VERIFIED">KYC Details Added</option>
            <option value="PENDING">KYC Pending</option>
          </select>

          {/* Skill / Role Filter */}
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white font-sans"
          >
            <option value="ALL">All Trades ({workers.length})</option>
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
        <div className="p-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-3 font-mono">
          <Users className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-white">No Workers Registered Yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto font-sans">
            Click "Register Worker" to add workers with complete Aadhaar, PAN, Bank, and emergency contact details.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider font-mono hover:bg-zinc-200"
          >
            <PlusCircle className="w-4 h-4" /> Register First Worker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkers.map((w) => {
            const hasKyc = !!(w.aadhaar_number || w.pan_number || w.bank_account_number);

            return (
              <div
                key={w.id}
                className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between shadow-xl space-y-4 relative group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-800 flex items-center gap-1.5">
                        <HardHat className="w-3 h-3 text-sky-400" />
                        <span>{w.skill || 'Site Worker'}</span>
                      </span>
                      {hasKyc ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-900/60 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> KYC
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-500 border border-zinc-800">
                          KYC Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* View Full KYC Profile */}
                      <button
                        onClick={() => setViewingWorker(w)}
                        title="View Full Worker Profile & KYC"
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(w)}
                        title="Edit Worker Profile & KYC"
                        className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
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

                  {/* Name & Primary Attributes */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-zinc-100 transition-colors">
                        {w.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <HardHat className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-semibold text-zinc-300">{w.skill}</span>
                        {w.gender && <span className="text-zinc-500">• {w.gender}</span>}
                      </div>
                    </div>

                    {/* KYC Quick Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono pt-1">
                      {w.phone && (
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" /> {w.phone}
                        </span>
                      )}
                      {w.aadhaar_number && (
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-amber-400 font-bold" title="Aadhaar Number">
                          UID: •••• {w.aadhaar_number.slice(-4)}
                        </span>
                      )}
                      {w.pan_number && (
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-cyan-400 font-bold" title="PAN Card">
                          PAN: {w.pan_number}
                        </span>
                      )}
                      {w.bank_account_number && (
                        <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-emerald-400 font-bold" title="Bank Account">
                          A/C: •••• {w.bank_account_number.slice(-4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Wage & Actions Box */}
                <div className="pt-4 border-t border-zinc-800 space-y-2.5 font-mono">
                  <div className="flex items-center justify-between text-xs bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-400">Daily Base Wage:</span>
                    <span className="font-bold text-white text-sm">₹{w.default_wage} / day</span>
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

                  {/* Subledger Link */}
                  <Link
                    href={`/reports?partyType=WORKER&partyId=${w.id}`}
                    className="w-full py-2 px-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <span>View Worker Subledger</span>
                    <span className="text-zinc-500">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER / EDIT WORKER (COMPREHENSIVE MULTI-TAB KYC FORM)          */}
      {/* ========================================================================= */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white text-black font-bold font-mono flex items-center justify-center text-sm">
                  {editingWorkerId ? <Pencil className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">
                    {editingWorkerId ? `Edit Worker Profile: ${name}` : 'Register Worker Personnel & KYC'}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Aadhaar, PAN, Bank Accounts, Wage Rate, and Emergency Bio-data
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsWorkerModalOpen(false);
                  resetForm();
                }}
                className="text-zinc-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-950/60 px-4 gap-2 font-mono text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setModalTab('BASIC')}
                className={`py-3 px-3 border-b-2 font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  modalTab === 'BASIC'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HardHat className="w-3.5 h-3.5" /> 1. Profile & Wage
              </button>

              <button
                type="button"
                onClick={() => setModalTab('KYC')}
                className={`py-3 px-3 border-b-2 font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  modalTab === 'KYC'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> 2. Aadhaar & PAN KYC
              </button>

              <button
                type="button"
                onClick={() => setModalTab('BANK')}
                className={`py-3 px-3 border-b-2 font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  modalTab === 'BANK'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-emerald-400" /> 3. Bank & UPI
              </button>

              <button
                type="button"
                onClick={() => setModalTab('PERSONAL')}
                className={`py-3 px-3 border-b-2 font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  modalTab === 'PERSONAL'
                    ? 'border-white text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> 4. Address & Emergency
              </button>
            </div>

            <form onSubmit={handleSubmitWorker}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* ------------------------------------------------------------- */}
                {/* TAB 1: BASIC PROFILE & WAGE                                   */}
                {/* ------------------------------------------------------------- */}
                {modalTab === 'BASIC' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Worker Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Chauhan"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-sans"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Contact Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. +91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Joining Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={joiningDate}
                          onChange={(e) => setJoiningDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Worker Role / Skill / Trade *
                        </label>
                        <input
                          type="text"
                          required
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
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Default Daily Wage (₹ / Day) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="any"
                          placeholder="e.g. 600"
                          value={defaultWage}
                          onChange={(e) => setDefaultWage(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 2: GOV KYC & IDENTIFICATION                               */}
                {/* ------------------------------------------------------------- */}
                {modalTab === 'KYC' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Official Indian Identity & Compliance Records</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                        Aadhaar Card Number (12 Digits)
                      </label>
                      <input
                        type="text"
                        maxLength={14}
                        placeholder="e.g. 1234 5678 9012"
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-amber-400 font-mono font-bold placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          PAN Card Number (10 Characters)
                        </label>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="e.g. ABCDE1234F"
                          value={panNumber}
                          onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-cyan-400 font-mono font-bold uppercase placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          Voter ID / Driving License (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. DL-0420110012345"
                          value={voterId}
                          onChange={(e) => setVoterId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 3: BANK & UPI ACCOUNTS                                    */}
                {/* ------------------------------------------------------------- */}
                {modalTab === 'BANK' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Direct Benefit & Wage Disbursement Accounts</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Bank Name & Branch
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. State Bank of India, Noida"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          Bank IFSC Code
                        </label>
                        <input
                          type="text"
                          maxLength={11}
                          placeholder="e.g. SBIN0001234"
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono font-bold uppercase placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          Bank Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10002345678901"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-emerald-400 font-mono font-bold placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          UPI ID / VPA
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. worker@okhdfcbank"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* TAB 4: ADDRESS & EMERGENCY CONTACTS                           */}
                {/* ------------------------------------------------------------- */}
                {modalTab === 'PERSONAL' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Father / Guardian Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Shri Mahender Chauhan"
                          value={fatherName}
                          onChange={(e) => setFatherName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Gender
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Blood Group
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. B+, O+, AB+"
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white uppercase placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Emergency Contact Person
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Geeta Devi (Wife / Brother)"
                          value={emergencyContactName}
                          onChange={(e) => setEmergencyContactName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">
                          Emergency Contact Phone
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +91 98765 00000"
                          value={emergencyContactPhone}
                          onChange={(e) => setEmergencyContactPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Permanent / Native Address (Village / District / State)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vill- Rampur, Post- Sadar, Dist- Gorakhpur, UP - 273001"
                        value={permanentAddress}
                        onChange={(e) => setPermanentAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Local Address / Site Accommodation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Labour Camp, Sector 62 Site, Noida"
                        value={localAddress}
                        onChange={(e) => setLocalAddress(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  {modalTab !== 'BASIC' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalTab === 'KYC') setModalTab('BASIC');
                        if (modalTab === 'BANK') setModalTab('KYC');
                        if (modalTab === 'PERSONAL') setModalTab('BANK');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs font-semibold border border-zinc-800 transition-colors flex items-center gap-1.5"
                    >
                      ← Back
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkerModalOpen(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>

                  {modalTab === 'BASIC' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!name.trim() || !phone.trim() || !joiningDate || !skill.trim() || defaultWage === '' || Number(defaultWage) <= 0) {
                          toast.warning('Please complete all required fields in Step 1 before proceeding.', 'Validation Error');
                          return;
                        }
                        setModalTab('KYC');
                      }}
                      disabled={!name.trim() || !phone.trim() || !joiningDate || !skill.trim() || defaultWage === '' || Number(defaultWage) <= 0}
                      className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <span>Next: Aadhaar & KYC</span>
                      <span>→</span>
                    </button>
                  )}

                  {modalTab === 'KYC' && (
                    <button
                      type="button"
                      onClick={() => setModalTab('BANK')}
                      className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Next: Bank & UPI</span>
                      <span>→</span>
                    </button>
                  )}

                  {modalTab === 'BANK' && (
                    <button
                      type="button"
                      onClick={() => setModalTab('PERSONAL')}
                      className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Next: Address & Emergency</span>
                      <span>→</span>
                    </button>
                  )}

                  {modalTab === 'PERSONAL' && (
                    <button
                      type="submit"
                      disabled={!name.trim() || !phone.trim() || !joiningDate || !skill.trim() || defaultWage === '' || Number(defaultWage) <= 0 || isSubmitting}
                      className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>{editingWorkerId ? 'Update Worker Profile' : 'Save & Register Worker'}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW COMPLETE WORKER PROFILE, WORK SHIFT HISTORY & PAYMENTS         */}
      {/* ========================================================================= */}
      {viewingWorker && (() => {
        const worker = viewingWorker;
        const workerAllocations = allocations.filter((a) => a.worker_id === worker.id);
        const workerPayments = payments.filter(
          (p) => p.party_type === 'WORKER' && p.party_id === worker.id && !p.is_reversed
        );

        const totalWagesEarned = workerAllocations.reduce((sum, a) => sum + (a.wage_amount || 0), 0);
        const totalPayouts = workerPayments
          .filter((p) => p.kind === 'WORKER_PAYOUT')
          .reduce((sum, p) => sum + p.amount, 0);
        const totalAdvances = workerPayments
          .filter((p) => p.kind === 'WORKER_ADVANCE')
          .reduce((sum, p) => sum + p.amount, 0);
        const netPayable = totalWagesEarned - (totalPayouts + totalAdvances);

        const formatINR = (val: number) => {
          return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-slide-up font-sans">
              {/* Header */}
              <div className="p-5 border-b border-zinc-800 flex items-start justify-between bg-zinc-950">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-sky-400 shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-950 text-sky-300 border border-sky-800">
                        {worker.skill || 'General Labour'}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight mt-1">{worker.name}</h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-0.5 flex-wrap">
                      {worker.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-zinc-500" /> {worker.phone}
                        </span>
                      )}
                      <span className="text-zinc-300 font-bold">Daily Wage: ₹{worker.default_wage}/day</span>
                      {worker.joining_date && (
                        <span className="text-zinc-500">Joined: {worker.joining_date}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/reports?partyType=WORKER&partyId=${worker.id}`}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-mono font-semibold border border-zinc-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> Full Subledger
                  </Link>
                  <button
                    onClick={() => setViewingWorker(null)}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Financial Balance Summary Strip */}
              <div className="p-4 bg-zinc-950/60 border-b border-zinc-800 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Total Wages Earned</span>
                  <strong className="text-base font-black font-mono text-white block mt-0.5">{formatINR(totalWagesEarned)}</strong>
                  <span className="text-[10px] text-zinc-500 font-mono">{workerAllocations.length} Days Worked</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block">Payouts & Advances</span>
                  <strong className="text-base font-black font-mono text-rose-400 block mt-0.5">-{formatINR(totalPayouts + totalAdvances)}</strong>
                  <span className="text-[10px] text-zinc-500 font-mono">₹{totalPayouts.toLocaleString('en-IN')} Payouts + ₹{totalAdvances.toLocaleString('en-IN')} Adv.</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 block">Net Wages Payable</span>
                  <strong className={`text-base font-black font-mono block mt-0.5 ${netPayable > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {formatINR(netPayable)}
                  </strong>
                  <span className="text-[10px] text-zinc-500 font-mono">{netPayable > 0 ? 'Payable to Worker' : 'Fully Settled'}</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-zinc-800 bg-zinc-900 text-xs font-mono">
                <button
                  onClick={() => setViewingWorkerTab('WORK')}
                  className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    viewingWorkerTab === 'WORK'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <HardHat className="w-3.5 h-3.5" />
                  <span>Work & Attendance Days ({workerAllocations.length})</span>
                </button>
                <button
                  onClick={() => setViewingWorkerTab('PAYMENTS')}
                  className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    viewingWorkerTab === 'PAYMENTS'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Payouts & Advances ({workerPayments.length})</span>
                </button>
                <button
                  onClick={() => setViewingWorkerTab('KYC')}
                  className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    viewingWorkerTab === 'KYC'
                      ? 'border-white text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>KYC, Banking & Bio-Data</span>
                </button>
              </div>

              {/* Tab Content Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {viewingWorkerTab === 'WORK' && (
                  <div>
                    {workerAllocations.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400">
                        <HardHat className="w-9 h-9 mx-auto text-zinc-600 mb-2" />
                        <p className="text-sm font-semibold text-zinc-300">No work shifts recorded for this worker yet</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Allocate worker to dealer project sites from the Attendance page.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-950 text-zinc-400 font-mono font-semibold uppercase text-[10px]">
                            <tr className="border-b border-zinc-800">
                              <th className="p-3">Work Date</th>
                              <th className="p-3">Client Dealer & Project Site</th>
                              <th className="p-3">Shift</th>
                              <th className="p-3 text-right">Daily Wage Rate</th>
                              <th className="p-3 text-right">Wage Earned</th>
                              <th className="p-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-sans">
                            {workerAllocations.map((a) => (
                              <tr key={a.id} className="hover:bg-zinc-850/50 transition-colors">
                                <td className="p-3 font-mono text-zinc-300 font-bold">{a.work_date}</td>
                                <td className="p-3">
                                  <div className="font-bold text-white">{a.dealer_name || 'Dealer'}</div>
                                  <span className="text-[10px] text-zinc-400 font-mono block">{a.site_name || 'Main Site'}</span>
                                </td>
                                <td className="p-3 font-mono">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    a.attendance === 'FULL'
                                      ? 'bg-zinc-800 text-white'
                                      : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                  }`}>
                                    {a.attendance} ({a.units} Day)
                                  </span>
                                </td>
                                <td className="p-3 text-right font-mono text-zinc-300">₹{a.wage_rate}/day</td>
                                <td className="p-3 text-right font-mono font-bold text-white">₹{a.wage_amount}</td>
                                <td className="p-3 text-zinc-400 text-[11px] max-w-xs truncate">{a.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {viewingWorkerTab === 'PAYMENTS' && (
                  <div>
                    {workerPayments.length === 0 ? (
                      <div className="py-12 text-center text-zinc-400">
                        <IndianRupee className="w-9 h-9 mx-auto text-zinc-600 mb-2" />
                        <p className="text-sm font-semibold text-zinc-300">No wage payouts or advances recorded yet</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Use the "Pay" or "Advance" button on worker card to disburse payments.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-zinc-800 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-950 text-zinc-400 font-mono font-semibold uppercase text-[10px]">
                            <tr className="border-b border-zinc-800">
                              <th className="p-3">Payment Date</th>
                              <th className="p-3">Voucher #</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Mode & Ref</th>
                              <th className="p-3 text-right">Amount Disbursed</th>
                              <th className="p-3">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-sans">
                            {workerPayments.map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-850/50 transition-colors">
                                <td className="p-3 font-mono font-bold text-white">{p.payment_date}</td>
                                <td className="p-3 font-mono text-zinc-300">{p.receipt_number}</td>
                                <td className="p-3 font-mono">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.kind === 'WORKER_ADVANCE'
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                                  }`}>
                                    {p.kind.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-zinc-300">
                                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-bold">
                                    {p.method}
                                  </span>
                                  {p.reference && <span className="text-zinc-400 text-[10px] ml-1.5">Ref: {p.reference}</span>}
                                </td>
                                <td className="p-3 text-right font-mono font-black text-rose-400 text-sm">
                                  -{formatINR(p.amount)}
                                </td>
                                <td className="p-3 text-zinc-300 text-[11px] max-w-xs truncate">{p.note || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {viewingWorkerTab === 'KYC' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                        <Building className="w-3.5 h-3.5 text-emerald-400" /> Bank & Direct Transfer Account
                      </h4>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">Bank Name & Branch:</span>
                        <strong className="text-white">{worker.bank_name || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">Account Number:</span>
                        <strong className="text-white">{worker.bank_account_number || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">IFSC Code:</span>
                        <strong className="text-white">{worker.bank_ifsc || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-400">UPI ID:</span>
                        <strong className="text-white">{worker.upi_id || 'Not Provided'}</strong>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-zinc-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Government Identity & Bio-Data
                      </h4>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">Aadhaar Number:</span>
                        <strong className="text-white">{worker.aadhaar_number || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">PAN Number:</span>
                        <strong className="text-white">{worker.pan_number || 'Not Provided'}</strong>
                      </div>
                      {worker.voter_id && (
                        <div className="flex justify-between py-1 border-b border-zinc-900">
                          <span className="text-zinc-400">Voter ID:</span>
                          <strong className="text-white">{worker.voter_id}</strong>
                        </div>
                      )}
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">Father / Guardian:</span>
                        <strong className="text-white">{worker.father_name || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-900">
                        <span className="text-zinc-400">Emergency Contact:</span>
                        <strong className="text-white">
                          {worker.emergency_contact_name || 'N/A'} {worker.emergency_contact_phone ? `(${worker.emergency_contact_phone})` : ''}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-400">Permanent Address:</span>
                        <strong className="text-white font-sans text-right max-w-xs">{worker.permanent_address || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between font-mono">
                <Link
                  href={`/reports?partyType=WORKER&partyId=${worker.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white underline underline-offset-4"
                >
                  <FileText className="w-3.5 h-3.5" /> Open Complete Double-Entry Subledger Statement
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const target = worker;
                      setViewingWorker(null);
                      handleOpenEditModal(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setViewingWorker(null)}
                    className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: ISSUE CASH ADVANCE OR WAGE PAYOUT                                  */}
      {/* ========================================================================= */}
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
                  {selectedWorker.name} ({selectedWorker.skill || 'Site Worker'})
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
        warningMessage="Are you sure you want to delete this worker? This will permanently remove their profile, KYC records, attendance history, wage advances/payouts, and subledger transactions."
        confirmButtonText="Delete Worker"
        onConfirm={handleConfirmDeleteWorker}
        onClose={() => setWorkerToDelete(null)}
      />
    </div>
  );
}
