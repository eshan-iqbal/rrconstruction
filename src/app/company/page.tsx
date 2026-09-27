'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  CheckCircle2,
  RefreshCw,
  Phone,
  MapPin,
  ShieldCheck,
  Eye,
  Building
} from 'lucide-react';
import { useSqlStore, CompanyProfile, DEFAULT_COMPANY_PROFILE } from '@/lib/storage/useSqlStore';

export default function CompanySettingsPage() {
  const { companyProfile, updateCompanyProfile, loading } = useSqlStore();

  const [formData, setFormData] = useState<CompanyProfile>(companyProfile || DEFAULT_COMPANY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        phone: formData.phone?.trim() || '',
        gstin: formData.gstin?.trim().toUpperCase() || '',
        address: formData.address?.trim() || ''
      });

      setSaveSuccess('Company details saved and synced across all statements!');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update company profile';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Building className="w-3.5 h-3.5 text-white" />
            <span>Settings</span>
            <span>/</span>
            <span className="text-white font-bold">Company Profile</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
            Company Details
          </h1>
          <p className="text-xs text-zinc-400">
            Update your company name, logo badge, phone number, address, and GST for invoices and statements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving || loading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
          ) : (
            <Save className="w-4 h-4 text-black" />
          )}
          <span>{saving ? 'Saving...' : 'Save Details'}</span>
        </button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-mono flex items-center gap-3 animate-in fade-in duration-200 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 font-semibold">{saveSuccess}</div>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono flex items-center gap-3 animate-in fade-in duration-200 shadow-md">
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <div className="flex-1 font-semibold">{saveError}</div>
        </div>
      )}

      {/* 2-Column Responsive Layout: Simple Form on Left, Real-Time Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Clean & Simple Form (5 fields only) */}
        <form onSubmit={handleSave} className="lg:col-span-6 space-y-4">
          <div className="p-5 md:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Basic Business Info
              </h2>
            </div>

            {/* 1. Company Name & Logo Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. RR CONSTRUCTION"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm font-bold focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold block">
                  Logo / Badge *
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.short_name || ''}
                  onChange={(e) => handleChange('short_name', e.target.value.toUpperCase())}
                  placeholder="e.g. RR"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm font-mono font-black uppercase text-center focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* 2. Phone Number & GSTIN (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>GST Number (Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                  placeholder="e.g. 07AABCR8892F1Z4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono uppercase font-bold focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* 3. Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-300 font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Office Address</span>
              </label>
              <textarea
                rows={3}
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Civil Lines, Sector 62, Noida, Delhi NCR - 201301"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-xs font-mono focus:outline-none focus:border-white transition-colors resize-none"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Save className="w-4 h-4 text-black" />
                )}
                <span>{saving ? 'Updating...' : 'Save & Update Details'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Real-Time Live Letterhead Preview */}
        <div className="lg:col-span-6 space-y-3 sticky top-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Real-Time Statement Preview</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Preview
            </span>
          </div>

          {/* Statement Letterhead Simulation Box */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-2xl">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-zinc-400" />

            <div className="p-6 space-y-5">
              {/* Header Letterhead */}
              <div className="border-b border-zinc-800 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-black font-black font-mono flex items-center justify-center text-base shadow-sm ring-1 ring-zinc-700/50 shrink-0">
                        {formData.short_name || 'RR'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-lg text-white tracking-tight uppercase truncate">
                          {formData.name || 'RR CONSTRUCTION'}
                        </h3>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2 flex-wrap pt-1">
                      {formData.gstin ? (
                        <span>GSTIN: <strong className="text-zinc-200">{formData.gstin}</strong></span>
                      ) : (
                        <span className="text-zinc-500">GSTIN: Not Specified</span>
                      )}
                      {formData.phone && (
                        <>
                          <span>•</span>
                          <span>Phone: <strong className="text-zinc-200">{formData.phone}</strong></span>
                        </>
                      )}
                    </div>

                    {formData.address && (
                      <div className="text-[10px] text-zinc-400 font-mono pt-0.5">
                        Address: {formData.address}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-mono shrink-0 space-y-1">
                    <div className="inline-block px-2.5 py-1 rounded bg-zinc-950 text-white border border-zinc-700 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      STATEMENT OF ACCOUNT
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      <span>Verified & Reconciled</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Statement Snippet */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden text-[11px] font-mono">
                <div className="grid grid-cols-4 bg-zinc-950 p-2 text-zinc-400 font-bold border-b border-zinc-800">
                  <span>DATE</span>
                  <span>DESCRIPTION</span>
                  <span className="text-right">DEBIT</span>
                  <span className="text-right">CREDIT</span>
                </div>
                <div className="p-2.5 space-y-1.5 text-zinc-300 text-[10px]">
                  <div className="grid grid-cols-4 items-center">
                    <span className="text-zinc-400">27/09/2026</span>
                    <span className="truncate text-white">Daily Site Labour Shift</span>
                    <span className="text-right font-bold text-white">₹7,200</span>
                    <span className="text-right text-zinc-500">-</span>
                  </div>
                  <div className="grid grid-cols-4 items-center">
                    <span className="text-zinc-400">27/09/2026</span>
                    <span className="truncate text-white">Bank Payment Receipt</span>
                    <span className="text-right text-zinc-500">-</span>
                    <span className="text-right font-bold text-zinc-200">₹6,000</span>
                  </div>
                </div>
              </div>

              {/* Signatory Box */}
              <div className="border-t border-zinc-800 pt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <div>
                  <div className="font-bold text-white uppercase text-[10px]">
                    FOR {formData.name || 'RR CONSTRUCTION'}
                  </div>
                  <div className="text-zinc-500 text-[9px]">Authorized Signatory</div>
                </div>
                <div className="text-right text-zinc-500">
                  Official Statement Copy
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
