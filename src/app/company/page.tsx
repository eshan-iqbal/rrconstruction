'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  RefreshCw,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Eye,
  Building,
  Upload,
  RotateCcw,
  Sparkles,
  FileText,
  BadgeCheck,
  Calendar,
  PenTool,
  Image as ImageIcon
} from 'lucide-react';
import { useSqlStore, CompanyProfile, DEFAULT_COMPANY_PROFILE } from '@/lib/storage/useSqlStore';

export default function CompanySettingsPage() {
  const { companyProfile, updateCompanyProfile, loading } = useSqlStore();

  const [formData, setFormData] = useState<CompanyProfile>(companyProfile || DEFAULT_COMPANY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewTheme, setPreviewTheme] = useState<'paper' | 'dark'>('paper');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyProfile) {
      setFormData(companyProfile);
    }
  }, [companyProfile]);

  const handleChange = (field: keyof CompanyProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Logo image must be smaller than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData((prev) => ({
          ...prev,
          logo_url: base64
        }));
        setSaveSuccess('Logo uploaded! Click "Save Profile" to apply changes.');
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = () => {
    if (confirm('Reset company details back to official default settings?')) {
      setFormData(DEFAULT_COMPANY_PROFILE);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      setSaveError('Company Name is required');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      await updateCompanyProfile({
        ...formData,
        name: formData.name.trim(),
        short_name: formData.short_name?.trim() || formData.name.slice(0, 2).toUpperCase(),
        tagline: formData.tagline?.trim() || '',
        est_year: formData.est_year?.trim() || '',
        phone: formData.phone?.trim() || '',
        email: formData.email?.trim() || '',
        website: formData.website?.trim() || '',
        gstin: formData.gstin?.trim().toUpperCase() || '',
        address: formData.address?.trim() || '',
        authorized_signatory: formData.authorized_signatory?.trim() || `FOR ${formData.name.trim()}`,
        statement_title: formData.statement_title?.trim() || 'STATEMENT OF SUBLEDGER ACCOUNT',
        statement_subtitle: formData.statement_subtitle?.trim() || 'Double-Entry Verified & Reconciled',
        terms_notes: formData.terms_notes?.trim() || '',
        logo_url: formData.logo_url || '/logo.png'
      });

      setSaveSuccess('Company profile saved and synced across all statements & vouchers!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update company profile';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Building className="w-3.5 h-3.5 text-amber-400" />
            <span>Settings</span>
            <span>/</span>
            <span className="text-white font-bold">Company Profile</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            Company Profile & Branding
          </h1>
          <p className="text-xs text-zinc-400">
            Configure your official contractor identity, logo emblem, contact details, and statement letterhead.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-mono font-semibold transition-all active:scale-95"
            title="Reset to default company configuration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || loading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Save className="w-4 h-4 text-black" />
            )}
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-3 animate-in fade-in duration-200 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-semibold">{saveSuccess}</div>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-3 animate-in fade-in duration-200 shadow-md">
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <div className="flex-1 font-semibold">{saveError}</div>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprehensive Settings Form */}
        <form onSubmit={handleSave} className="xl:col-span-6 space-y-5">
          {/* Card 1: Official Logo & Monogram */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Official Brand Emblem & Logo
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Letterhead Ready</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              {/* Logo Preview Square */}
              <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-300 overflow-hidden flex items-center justify-center p-1.5 shadow-md shrink-0 relative group">
                <img
                  src={formData.logo_url || '/logo.png'}
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo.png';
                  }}
                />
              </div>

              {/* Upload & Logo Options */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-750 text-xs font-mono font-semibold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload New Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange('logo_url', '/logo.png')}
                    className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-mono transition-colors"
                  >
                    Reset Official Logo
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Supported formats: PNG, JPG, or SVG (Transparent or White background recommended).
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Legal Entity & Registration */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Legal Entity & Identity
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold block">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. RR CONSTRUCTION"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm font-bold focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold block">
                  Monogram Badge *
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.short_name || ''}
                  onChange={(e) => handleChange('short_name', e.target.value.toUpperCase())}
                  placeholder="e.g. RR"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm font-mono font-black uppercase text-center focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold block">
                  Tagline / Scope of Services
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  placeholder="e.g. Labour Suppliers & Civil Infrastructure Contractors"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  <span>Est. Year</span>
                </label>
                <input
                  type="text"
                  value={formData.est_year || ''}
                  onChange={(e) => handleChange('est_year', e.target.value)}
                  placeholder="e.g. EST. 2018"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono text-center focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>GSTIN / Tax Registration</span>
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="e.g. 07AABCR8892F1Z4"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono uppercase font-bold focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Card 3: Contact & Address */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Phone className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Contact & Registered Office
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Accounts Email</span>
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="e.g. accounts@rrconstruction.in"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Head Office / Billing Address</span>
              </label>
              <textarea
                rows={2}
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Civil Lines, Sector 62, Noida, Delhi NCR - 201301"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-white transition-colors resize-none"
              />
            </div>
          </div>

          {/* Card 4: Statement Subledger & Signatory Defaults */}
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <PenTool className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Statement Subledger & Signatures
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold block">
                  Document Header Badge
                </label>
                <input
                  type="text"
                  value={formData.statement_title || ''}
                  onChange={(e) => handleChange('statement_title', e.target.value)}
                  placeholder="STATEMENT OF SUBLEDGER ACCOUNT"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono uppercase focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-zinc-300 font-semibold block">
                  Authorized Signatory Header
                </label>
                <input
                  type="text"
                  value={formData.authorized_signatory || ''}
                  onChange={(e) => handleChange('authorized_signatory', e.target.value)}
                  placeholder="FOR RR CONSTRUCTION"
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono uppercase focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <button
            type="submit"
            disabled={saving || loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Save className="w-4 h-4 text-black" />
            )}
            <span>{saving ? 'Updating Company Profile...' : 'Save & Sync Company Profile'}</span>
          </button>
        </form>

        {/* Right Column: Real-Time Live Statement Letterhead Preview */}
        <div className="xl:col-span-6 space-y-3 sticky top-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Statement Letterhead Live Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setPreviewTheme('paper')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    previewTheme === 'paper' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Paper White
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('dark')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    previewTheme === 'dark' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Dark UI
                </button>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
          </div>

          {/* Interactive Document Preview Box */}
          <div
            className={`rounded-2xl border transition-all shadow-2xl overflow-hidden font-sans ${
              previewTheme === 'paper'
                ? 'bg-white text-zinc-900 border-zinc-300'
                : 'bg-zinc-950 text-white border-zinc-800'
            }`}
          >
            {/* Top Amber Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-zinc-400" />

            <div className="p-5 sm:p-6 space-y-4">
              {/* Header Letterhead */}
              <div className={`pb-4 border-b ${previewTheme === 'paper' ? 'border-zinc-300' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Logo & Details */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center p-1 shrink-0 ${
                          previewTheme === 'paper'
                            ? 'bg-white border border-zinc-300 shadow-sm'
                            : 'bg-white border border-zinc-700 shadow-sm'
                        }`}
                      >
                        <img
                          src={formData.logo_url || '/logo.png'}
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-black text-base sm:text-lg tracking-tight uppercase truncate ${
                              previewTheme === 'paper' ? 'text-black' : 'text-white'
                            }`}
                          >
                            {formData.name || 'RR CONSTRUCTION'}
                          </h3>
                          {formData.est_year && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              {formData.est_year}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] font-medium truncate ${
                            previewTheme === 'paper' ? 'text-zinc-600' : 'text-zinc-400'
                          }`}
                        >
                          {formData.tagline || 'Labour Suppliers & Civil Infrastructure Contractors'}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`text-[10px] font-mono flex items-center gap-2 flex-wrap pt-0.5 ${
                        previewTheme === 'paper' ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      {formData.gstin && (
                        <span>
                          GSTIN: <strong>{formData.gstin}</strong> •
                        </span>
                      )}
                      <span>
                        Phone: <strong>{formData.phone || '+91 98765 43210'}</strong>
                      </span>
                      <span>|</span>
                      <span>
                        Email: <strong>{formData.email || 'accounts@rrconstruction.in'}</strong>
                      </span>
                    </div>

                    {formData.address && (
                      <div
                        className={`text-[9.5px] font-mono truncate ${
                          previewTheme === 'paper' ? 'text-zinc-500' : 'text-zinc-500'
                        }`}
                      >
                        Head Office: {formData.address}
                      </div>
                    )}
                  </div>

                  {/* Right: Statement Badge */}
                  <div className="text-right font-mono shrink-0 space-y-1">
                    <div
                      className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        previewTheme === 'paper'
                          ? 'bg-zinc-100 text-black border border-zinc-300'
                          : 'bg-zinc-900 text-white border border-zinc-700'
                      }`}
                    >
                      {formData.statement_title || 'STATEMENT OF SUBLEDGER ACCOUNT'}
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500">
                      Ref: <span className={previewTheme === 'paper' ? 'text-zinc-800' : 'text-zinc-200'}>STMT-ESHANCO-20260927</span>
                    </div>
                    <div className="text-[9.5px] text-zinc-500">
                      Date of Issue: 27 Sept 2026
                    </div>
                    <div className="text-[9.5px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{formData.statement_subtitle || 'Double-Entry Verified & Reconciled'}</span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Metadata Boxes */}
                <div className="grid grid-cols-2 gap-3 pt-3 text-[10px] font-mono">
                  <div
                    className={`p-3 rounded-xl border space-y-1 ${
                      previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                      BILLED TO (CLIENT CONTRACTOR / DEALER)
                    </div>
                    <div className={`font-bold text-xs font-sans ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>
                      Eshan & co
                    </div>
                    <div className="text-zinc-500">Phone: 34567890</div>
                    <div className="text-zinc-500">Address: Civil Lines Site</div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border space-y-1 ${
                      previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                      STATEMENT WINDOW & SPECIFICATIONS
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Period:</span>
                      <strong className={previewTheme === 'paper' ? 'text-black' : 'text-white'}>All Records to 27 Sept 2026</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Basis:</span>
                      <strong>Accrual Subledger</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Status:</span>
                      <strong className="text-emerald-500">Verified & Reconciled</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Financial Metric Cards */}
              <div className="grid grid-cols-4 gap-2 font-mono text-[9.5px]">
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <span className="text-zinc-500 font-bold uppercase text-[8.5px]">1. OPENING BAL</span>
                  <strong className={`text-xs mt-1 ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>₹0</strong>
                  <span className="text-[8px] text-zinc-400">Prior to window</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <span className="text-zinc-500 font-bold uppercase text-[8.5px]">2. WORK BILLED (+)</span>
                  <strong className={`text-xs mt-1 ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>₹0</strong>
                  <span className="text-[8px] text-zinc-400">Additions (Dr)</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <span className="text-zinc-500 font-bold uppercase text-[8.5px]">3. PAYMENTS (-)</span>
                  <strong className={`text-xs mt-1 ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>₹6,000</strong>
                  <span className="text-[8px] text-zinc-400">Deductions (Cr)</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg border-2 flex flex-col justify-between ${
                    previewTheme === 'paper' ? 'bg-zinc-100 border-zinc-400' : 'bg-zinc-900 border-zinc-700'
                  }`}
                >
                  <span className="text-zinc-500 font-bold uppercase text-[8.5px]">4. NET BALANCE</span>
                  <strong className={`text-xs mt-1 ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>₹6,000</strong>
                  <span className="text-[7.5px] font-bold text-amber-500 uppercase">[ ADVANCE (CR) ]</span>
                </div>
              </div>

              {/* Sample Table */}
              <div className={`rounded-lg border overflow-hidden text-[10px] font-mono ${
                previewTheme === 'paper' ? 'border-zinc-200' : 'border-zinc-800'
              }`}>
                <table className="w-full text-left">
                  <thead className={previewTheme === 'paper' ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-900 text-zinc-400'}>
                    <tr className="border-b">
                      <th className="p-2 w-20">Date</th>
                      <th className="p-2">Particulars</th>
                      <th className="p-2 text-center w-14">Type</th>
                      <th className="p-2 text-right w-16">Debit</th>
                      <th className="p-2 text-right w-16">Credit</th>
                      <th className="p-2 text-right w-16">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800">
                    <tr>
                      <td className="p-2 text-zinc-500">27 Sep 2026</td>
                      <td className={`p-2 font-sans font-medium ${previewTheme === 'paper' ? 'text-zinc-800' : 'text-zinc-200'}`}>
                        Payment Received via UPI
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[8.5px] font-bold">
                          RECEIPT
                        </span>
                      </td>
                      <td className="p-2 text-right text-zinc-400">-</td>
                      <td className={`p-2 text-right font-bold ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>
                        ₹6,000
                      </td>
                      <td className={`p-2 text-right font-bold ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>
                        ₹6,000
                      </td>
                    </tr>
                    <tr className={`font-bold border-t-2 ${
                      previewTheme === 'paper' ? 'bg-zinc-50 text-black border-zinc-400' : 'bg-zinc-900 text-white border-zinc-700'
                    }`}>
                      <td colSpan={3} className="p-2 uppercase text-[9px]">TOTALS & CLOSING BALANCE</td>
                      <td className="p-2 text-right">₹0</td>
                      <td className="p-2 text-right">₹6,000</td>
                      <td className="p-2 text-right">₹6,000</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Declaration Note */}
              <div
                className={`p-2.5 rounded-lg border text-[9px] font-mono flex items-center justify-between ${
                  previewTheme === 'paper' ? 'bg-zinc-50 text-zinc-600 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                <div>
                  Certified official subledger statement issued by <strong>{formData.name || 'RR Construction'}</strong>. Verified under double-entry accounting rules.
                </div>
                <div className="text-zinc-400 shrink-0">Page 1 of 1</div>
              </div>

              {/* Dual Signature Boxes */}
              <div className="grid grid-cols-2 gap-3 font-mono text-[9px] pt-1">
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between h-20 ${
                    previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div>
                    <div className={`font-bold uppercase ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>
                      {formData.authorized_signatory || `FOR ${formData.name || 'RR CONSTRUCTION'}`}
                    </div>
                    <div className="text-[8px] text-zinc-400">Authorized Signatory & Seal</div>
                  </div>
                  <div className="border-t border-zinc-300 dark:border-zinc-700 pt-1 flex justify-between text-[8px] text-zinc-400">
                    <span>Authorized Signatory</span>
                    <span>Date: ______</span>
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between h-20 text-right ${
                    previewTheme === 'paper' ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div>
                    <div className={`font-bold uppercase ${previewTheme === 'paper' ? 'text-black' : 'text-white'}`}>
                      PARTY ACKNOWLEDGEMENT
                    </div>
                    <div className="text-[8px] text-zinc-400 font-bold">Eshan & co</div>
                  </div>
                  <div className="border-t border-zinc-300 dark:border-zinc-700 pt-1 flex justify-between text-[8px] text-zinc-400">
                    <span>Confirmed & Accepted</span>
                    <span>Date: ______</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
