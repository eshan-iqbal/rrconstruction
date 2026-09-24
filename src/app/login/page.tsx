'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Shield
} from 'lucide-react';
import { signIn } from '@/lib/auth/auth-client';

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const identifier = username.trim();
      let res: any;

      if (identifier.includes('@')) {
        res = await (signIn as any).email({
          email: identifier.toLowerCase(),
          password,
        });
      } else {
        res = await signIn.username({
          username: identifier.toLowerCase(),
          password,
        });

        // Fallback check if user entered username as email prefix
        if (res?.error) {
          const emailRes = await (signIn as any).email({
            email: `${identifier.toLowerCase()}@rrconstruction.app`,
            password,
          });
          if (!emailRes?.error) {
            res = emailRes;
          }
        }
      }

      if (res?.error) {
        setErrorMessage(res.error.message || 'Invalid username or password.');
      } else {
        setSuccessMessage('Authentication successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error signing in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#09090b] text-zinc-100 font-sans selection:bg-white selection:text-black relative overflow-hidden bg-grid-pattern">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-white/[0.025] rounded-full blur-3xl pointer-events-none" />

      {/* Main Auth Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Centered Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center font-black shadow-xl">
            <span className="text-base font-mono font-black tracking-tight">RR</span>
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-wider uppercase text-white">
              RR Construction
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Labour Contractor System</p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Card Title - Centered */}
          <div className="text-center">
            <h2 className="text-xl font-black text-white tracking-tight">
              Sign In to Portal
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              Enter your contractor username and password to access operations.
            </p>
          </div>

          {/* Error Message Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-900/50 flex items-start justify-center gap-3 text-xs text-rose-200 animate-in fade-in text-center">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message Notice */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-900/50 flex items-start justify-center gap-3 text-xs text-emerald-200 animate-in fade-in font-mono text-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-center text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. rrconstruction"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white transition-all text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-center text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white transition-all text-center"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 touch-press"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Note */}
        <div className="text-center">
          <p className="text-[11px] text-zinc-400 font-mono flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span>Authorized Personnel Only • Secure Portal</span>
          </p>
        </div>
      </div>
    </div>
  );
}
