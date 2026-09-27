'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  FileText,
  LayoutDashboard,
  Menu,
  X,
  IndianRupee,
  CalendarCheck,
  SendHorizontal,
  Receipt,
  Search,
  Sun,
  Moon,
  LogOut,
  UserCheck,
  KeyRound,
  Building
} from 'lucide-react';
import { useSqlStore, MultiWorkerItem } from '@/lib/storage/useSqlStore';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useSession, signOut } from '@/lib/auth/auth-client';
import ChangePasswordModal from '@/components/ui/ChangePasswordModal';

const DESKTOP_NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: 'Home' },
  { href: '/customers', label: '1. Dealers & Sites', icon: Building2, badge: 'Dealers' },
  { href: '/workers', label: '2. Worker Portal', icon: Users, badge: 'Workers' },
  { href: '/attendance', label: 'Daily Attendance', icon: CalendarCheck, badge: 'Daily' },
  { href: '/payments', label: 'Cashbook & Vouchers', icon: Receipt, badge: 'Vouchers' },
  { href: '/reports', label: '3. Ledgers & Statements', icon: FileText, badge: 'Ledgers' }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQuickDispatchOpen, setIsQuickDispatchOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // If on login page, render without shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const { companyProfile, dealers, sites, workers, metrics, sendMultiWorkers } = useSqlStore();

  // Quick Dispatch Form State
  const [dispatchDate, setDispatchDate] = useState(getTodayDate);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [modalWorkerSearch, setModalWorkerSearch] = useState('');
  const [selectedWorkersList, setSelectedWorkersList] = useState<MultiWorkerItem[]>([]);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const formatINR = (val: number) => {
    return '₹' + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const dealerSites = sites.filter((s) => s.dealer_id === selectedDealerId);
  const currentDealer = dealers.find((d) => d.id === selectedDealerId);

  const filteredQuickWorkers = workers.filter((w) => {
    if (!modalWorkerSearch.trim()) return true;
    const q = modalWorkerSearch.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      (w.skill && w.skill.toLowerCase().includes(q)) ||
      (w.phone && w.phone.includes(q))
    );
  });

  // Toggle worker in quick dispatch
  const handleToggleWorker = (wId: string) => {
    const exists = selectedWorkersList.find((w) => w.worker_id === wId);
    if (exists) {
      setSelectedWorkersList((prev) => prev.filter((w) => w.worker_id !== wId));
    } else {
      const wObj = workers.find((w) => w.id === wId);
      const wageRate = wObj?.default_wage || 0;
      setSelectedWorkersList((prev) => [
        ...prev,
        {
          worker_id: wId,
          attendance: 'FULL',
          selling_rate: wageRate,
          wage_rate: wageRate
        }
      ]);
    }
  };

  const handleUpdateWorkerRow = (
    wId: string,
    field: 'attendance' | 'selling_rate' | 'wage_rate' | 'notes',
    value: any
  ) => {
    setSelectedWorkersList((prev) =>
      prev.map((item) => (item.worker_id === wId ? { ...item, [field]: value } : item))
    );
  };

  const handleSelectAllWorkers = () => {
    const allFilteredSelected =
      filteredQuickWorkers.length > 0 &&
      filteredQuickWorkers.every((w) => selectedWorkersList.some((item) => item.worker_id === w.id));

    if (allFilteredSelected) {
      const filteredIds = new Set(filteredQuickWorkers.map((w) => w.id));
      setSelectedWorkersList((prev) => prev.filter((item) => !filteredIds.has(item.worker_id)));
    } else {
      const existingMap = new Map(selectedWorkersList.map((item) => [item.worker_id, item]));
      filteredQuickWorkers.forEach((w) => {
        if (!existingMap.has(w.id)) {
          existingMap.set(w.id, {
            worker_id: w.id,
            attendance: 'FULL',
            selling_rate: w.default_wage || 0,
            wage_rate: w.default_wage || 0
          });
        }
      });
      setSelectedWorkersList(Array.from(existingMap.values()));
    }
  };

  const handleSubmitQuickDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealerId) {
      alert('Please select a dealer');
      return;
    }
    if (selectedWorkersList.length === 0) {
      alert('Please select at least one worker to send');
      return;
    }

    try {
      setIsDispatching(true);
      await sendMultiWorkers({
        work_date: dispatchDate,
        dealer_id: selectedDealerId,
        site_id: selectedSiteId || undefined,
        notes: dispatchNotes.trim() || undefined,
        workers: selectedWorkersList
      });

      setDispatchSuccess(
        `Dispatched ${selectedWorkersList.length} workers to ${currentDealer?.name || 'Dealer'}! Debited to ledger.`
      );
      setTimeout(() => {
        setDispatchSuccess(null);
        setIsQuickDispatchOpen(false);
        setSelectedWorkersList([]);
      }, 1500);
    } catch (err: unknown) {
      const errM = err instanceof Error ? err.message : 'Error sending workers';
      alert(errM);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#09090b] text-zinc-100 antialiased font-sans selection:bg-white selection:text-black">
      {/* Mobile Native App Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-3.5 py-2.5 bg-[#09090b]/95 backdrop-blur-xl border-b border-zinc-800/80 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/" className="w-8 h-8 rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center font-black shadow-sm touch-press shrink-0 p-0.5">
            <img src={companyProfile?.logo_url || '/logo.png'} alt="Logo" className="w-full h-full object-contain" />
          </Link>
          <div className="min-w-0">
            <div className="font-bold text-xs tracking-tight text-white truncate">
              {companyProfile?.name || 'RR CONSTRUCTION'}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{formatINR(metrics.totalReceivable)} Due</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 touch-press transition-colors"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
          <button
            onClick={() => {
              setDispatchDate(getTodayDate());
              setIsQuickDispatchOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-black font-bold text-[11px] font-mono tracking-wide shadow-sm touch-press"
          >
            <SendHorizontal className="w-3 h-3 stroke-[2.5]" />
            <span>Send</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 touch-press"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop & Slide-in Drawer for Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#09090b] border-r border-zinc-850 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          {/* Brand Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center font-black shadow-md shrink-0 p-0.5">
                <img src={companyProfile?.logo_url || '/logo.png'} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="font-extrabold text-sm tracking-wider uppercase text-white truncate max-w-[150px]">
                  {companyProfile?.name || 'RR Construction'}
                </h1>
                <p className="text-[11px] text-zinc-400 font-medium truncate max-w-[150px]">
                  {companyProfile?.tagline || 'Labour Supplier'}
                </p>
              </div>
            </div>
            {/* Mobile close drawer button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded-lg text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Dispatch CTA Button */}
          <div className="p-4 pb-2 shrink-0">
            <button
              onClick={() => {
                setDispatchDate(getTodayDate());
                setMobileMenuOpen(false);
                setIsQuickDispatchOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
            >
              <SendHorizontal className="w-4 h-4 stroke-[2.5]" />
              <span>Send Multi Workers</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 pt-1 space-y-1">
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold mb-1">
              Navigation Menu
            </div>
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group border ${
                    isActive
                      ? 'bg-white text-black shadow-sm font-bold border-transparent'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-850 border-transparent hover:border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-black stroke-[2.2]' : 'text-zinc-400 group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-black text-white'
                          : 'bg-zinc-850 text-zinc-400 border border-zinc-800 group-hover:text-zinc-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Theme Toggle (Top) & User Profile with Actions (Bottom) */}
        <div className="p-4 border-t border-zinc-800/80 space-y-2 shrink-0">
          {/* Theme Toggle (Above) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-xs font-mono transition-all group touch-press"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-amber-700 group-hover:-rotate-12 transition-transform" />
              )}
              <span className="font-semibold text-zinc-300 group-hover:text-white text-[11px]">
                {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wide">
              {theme}
            </span>
          </button>

          {/* User Profile Card (Below) with Company Profile, Change Password & Logout */}
          {session?.user && (
            <div className="p-2.5 rounded-2xl bg-zinc-950/80 border border-zinc-850 flex items-center justify-between gap-2">
              <Link
                href="/company"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity group cursor-pointer"
                title="Open Company Profile & Letterhead"
              >
                <div className="w-8 h-8 rounded-xl bg-zinc-850 border border-zinc-700/80 flex items-center justify-center font-bold text-xs font-mono text-white shrink-0 group-hover:border-amber-500/60 group-hover:text-amber-400 transition-colors">
                  {companyProfile?.short_name ? companyProfile.short_name.charAt(0).toUpperCase() : (session.user.name?.charAt(0).toUpperCase() || 'R')}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                    {companyProfile?.name || session.user.name || 'RR Construction'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate">
                    @{(session.user as any).username || 'rrconstruction'} • {(session.user as any).role || 'OWNER'}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href="/company"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    pathname === '/company'
                      ? 'text-white bg-zinc-800 border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                  }`}
                  title="Company Profile & Letterhead"
                  aria-label="Company Profile"
                >
                  <Building className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-950/30 transition-colors"
                  title="Change Password"
                  aria-label="Change Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Sign out from your account?')) {
                      await signOut();
                      window.location.href = '/login';
                    }
                  }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-grid-pattern pb-24 lg:pb-8">
        <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">{children}</div>
      </main>

      {/* Mobile App Fixed Bottom Navigation Bar (iOS / Android Native Style) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl bottom-safe">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-press ${
            pathname === '/' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === '/' ? 'bg-zinc-800 text-white' : ''}`}>
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono mt-0.5">Home</span>
        </Link>

        {/* Dealers */}
        <Link
          href="/customers"
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-press ${
            pathname === '/customers' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === '/customers' ? 'bg-zinc-800 text-white' : ''}`}>
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono mt-0.5">Dealers</span>
        </Link>

        {/* Center Quick Action (+ Dispatch) */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-5">
          <button
            onClick={() => {
              setDispatchDate(getTodayDate());
              setIsQuickDispatchOpen(true);
            }}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg shadow-white/10 border-2 border-zinc-950 font-black touch-press transition-transform active:scale-90"
            aria-label="Send Multi Workers"
          >
            <SendHorizontal className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider mt-1">Send</span>
        </div>

        {/* Workers */}
        <Link
          href="/workers"
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-press ${
            pathname === '/workers' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === '/workers' ? 'bg-zinc-800 text-white' : ''}`}>
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono mt-0.5">Workers</span>
        </Link>

        {/* Ledgers */}
        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-press ${
            pathname === '/reports' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <div className={`p-1 rounded-lg ${pathname === '/reports' ? 'bg-zinc-800 text-white' : ''}`}>
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono mt-0.5">Ledger</span>
        </Link>
      </nav>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Global Quick Multi-Worker Dispatch Modal (Bottom-Sheet on mobile, Centered Modal on desktop) */}
      {isQuickDispatchOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] shadow-2xl overflow-hidden flex flex-col animate-slide-up">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 text-white border border-zinc-700">
                  <SendHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                    Quick Dispatch Multiple Workers
                  </h3>
                  <p className="text-[11px] text-zinc-400">Direct billing to Dealer & wage allocations to Workers</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickDispatchOpen(false)}
                className="text-zinc-400 hover:text-white font-bold p-1 text-base touch-press"
              >
                ✕
              </button>
            </div>

            {/* Notification */}
            {dispatchSuccess && (
              <div className="p-3 bg-white text-black text-xs font-mono font-bold text-center">
                ✓ {dispatchSuccess}
              </div>
            )}

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmitQuickDispatch} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Destination Dealer & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">1. Work Date *</label>
                  <input
                    type="date"
                    required
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">2. Select Dealer *</label>
                  <select
                    required
                    value={selectedDealerId}
                    onChange={(e) => {
                      setSelectedDealerId(e.target.value);
                      setSelectedSiteId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-white"
                  >
                    <option value="">-- Choose Dealer --</option>
                    {dealers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — ₹{d.default_rate}/day
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">3. Specific Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    disabled={!selectedDealerId}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-40"
                  >
                    <option value="">-- Main Dealer Account --</option>
                    {dealerSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 2: Worker Checklist Roster with Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-zinc-300 font-mono flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-400" />
                    Check Workers to Send ({selectedWorkersList.length}/{workers.length} selected) *
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllWorkers}
                    className="text-[11px] font-mono text-zinc-300 hover:text-white underline self-end sm:self-auto"
                  >
                    {filteredQuickWorkers.length > 0 && filteredQuickWorkers.every((w) => selectedWorkersList.some((item) => item.worker_id === w.id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search workers by name or trade/skill..."
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

                {workers.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-mono">
                    No workers registered yet. Please add workers in the Worker Portal first.
                  </div>
                ) : filteredQuickWorkers.length === 0 ? (
                  <div className="p-4 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 text-xs font-mono">
                    No workers match "{modalWorkerSearch}".
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {filteredQuickWorkers.map((w) => {
                      const selectedItem = selectedWorkersList.find((item) => item.worker_id === w.id);
                      const isSelected = !!selectedItem;

                      return (
                        <div
                          key={w.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-zinc-850/90 border-white/40 shadow-sm'
                              : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Worker Info & Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleWorker(w.id)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 cursor-pointer"
                              />
                              <div>
                                <div className="font-bold text-xs text-white">{w.name}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">
                                  {w.skill || 'Site Worker'}
                                </div>
                              </div>
                            </label>

                            {/* Rates if selected */}
                            {isSelected && (
                              <div className="flex items-center gap-2 font-mono text-xs pl-7 sm:pl-0 flex-wrap">
                                {/* Shift */}
                                <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateWorkerRow(w.id, 'attendance', 'FULL')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      selectedItem.attendance === 'FULL' ? 'bg-white text-black' : 'text-zinc-400'
                                    }`}
                                  >
                                    FULL
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateWorkerRow(w.id, 'attendance', 'HALF')}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      selectedItem.attendance === 'HALF' ? 'bg-zinc-200 text-black' : 'text-zinc-400'
                                    }`}
                                  >
                                    HALF
                                  </button>
                                </div>

                                {/* Wage Rate */}
                                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 text-[11px]">
                                  <span className="text-zinc-400 font-semibold">Wage ₹:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="Enter wage"
                                    value={selectedItem.wage_rate || ''}
                                    onChange={(e) =>
                                      handleUpdateWorkerRow(
                                        w.id,
                                        'wage_rate',
                                        e.target.value === '' ? 0 : Number(e.target.value)
                                      )
                                    }
                                    className="w-24 bg-transparent font-bold text-white text-right focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Note / Memo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 font-mono">5. Memo / Site Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Concrete casting shift, overtime included..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-zinc-800 font-mono">
                <div className="text-xs text-zinc-400">
                  {selectedWorkersList.length} workers ready to dispatch
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickDispatchOpen(false)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-xs font-semibold text-zinc-300 border border-zinc-800 touch-press"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDispatching || selectedWorkersList.length === 0 || !selectedDealerId}
                    className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-sm disabled:opacity-40 touch-press"
                  >
                    {isDispatching ? 'Processing...' : `Send & Bill (₹${selectedWorkersList.reduce((sum, i) => sum + i.selling_rate * (i.attendance === 'HALF' ? 0.5 : 1), 0)})`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
