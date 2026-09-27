'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield
} from 'lucide-react';
import { signIn } from '@/lib/auth/auth-client';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.warning('Please enter both username and password.', 'Required Credentials');
      return;
    }

    try {
      setLoading(true);
      const res = await signIn.username({
        username: username.trim(),
        password,
      });

      if (res?.error) {
        const errorMsg = res.error.message || 'Invalid username or password. Please try again.';
        toast.error(errorMsg, 'Access Denied');
      } else {
        const welcomeMsg = 'Welcome back! Authentication successful. Redirecting...';
        toast.success(welcomeMsg, 'Access Granted');
        setTimeout(() => {
          window.location.href = '/';
        }, 300);
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Error signing in. Please check your credentials.';
      toast.error(errMsg, 'Login Error');
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

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} noValidate className="space-y-4">
            <div>
              <label className="block text-center text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
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
