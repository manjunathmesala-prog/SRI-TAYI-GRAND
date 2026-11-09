'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE AUTHENTICATION PORTAL
 * Supports Super Admin, Hotel Manager, and Front Desk Staff Sign-In
 * ==============================================================================
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const PRESET_ACCOUNTS = [
  {
    roleId: 'SUPER_ADMIN',
    roleLabel: 'Super Admin',
    name: 'Sri Tayi Grand Admin',
    email: 'admin@sritayigrand.com',
    password: 'SuperAdmin@TayiGrand2026!',
    icon: Crown,
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    scope: 'Full Unrestricted Access • Settings • Audit Logs • P&L',
  },
  {
    roleId: 'MANAGER',
    roleLabel: 'Hotel Manager',
    name: 'G. Mohan Kumar',
    email: 'manager@sritayigrand.com',
    password: 'Manager@TayiGrand2026!',
    icon: Briefcase,
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    scope: 'Operations • Reservations • Housekeeping • Staff • Reports',
  },
  {
    roleId: 'STAFF',
    roleLabel: 'Front Desk Staff',
    name: 'Sri Tayi Grand Staff',
    email: 'staff@sritayigrand.com',
    password: 'Staff@TayiGrand2026!',
    icon: Users,
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    scope: 'Reception • Check-In / Walk-In • Room Board • RFID Keycards',
  },
];

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';

  const [email, setEmail] = useState('admin@sritayigrand.com');
  const [password, setPassword] = useState('SuperAdmin@TayiGrand2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('SUPER_ADMIN');
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (staffEmail: string, staffPass: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, password: staffPass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      // Persist authenticated session claims to localStorage for UI rendering
      if (data.session) {
        localStorage.setItem('stg_token', data.session.token);
        localStorage.setItem('stg_role', data.session.role);
        localStorage.setItem('stg_user_name', data.session.name);
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const selectPreset = (preset: typeof PRESET_ACCOUNTS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.roleId);
    setError(null);
  };

  const fastLoginAs = (preset: typeof PRESET_ACCOUNTS[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.roleId);
    performLogin(preset.email, preset.password);
  };

  return (
    <div className="min-h-screen bg-[#21180F] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#D8AD56]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-gradient from-[#382216]/60 via-[#21180F]/90 to-[#140D08] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 my-8">
        {/* Brand Card Header with Official Emblem */}
        <div className="text-center mb-6">
          <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <Image
              src="/images/hotel/tayi-grand-logo.png"
              alt="Sri Tayi Grand Official Logo"
              fill
              sizes="80px"
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
            SRI TAYI GRAND
          </h1>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#D8AD56] font-semibold mt-1">
            HOTEL MANAGEMENT &bull; ENTERPRISE RBAC PORTAL
          </p>
        </div>

        {/* Credentials Selector Pills (Super Admin, Manager, Staff) */}
        <div className="bg-[#2A1D15] border border-[#D8AD56]/30 rounded-2xl p-3 sm:p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-[#D8AD56] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Select Role Profile (One-Tap Fast Login)</span>
            </div>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
              3 Roles Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_ACCOUNTS.map((preset) => {
              const isSelected = activePreset === preset.roleId;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.roleId}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#43001F] border-[#D8AD56] shadow-md ring-1 ring-[#D8AD56]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#D8AD56]' : 'text-white/60'}`} />
                      <span className="text-xs font-bold text-white tracking-tight">
                        {preset.roleLabel}
                      </span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-[#D8AD56]" />}
                  </div>

                  <p className="text-[10px] text-white/60 truncate font-mono">
                    {preset.email}
                  </p>

                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9px] uppercase font-bold text-[#D8AD56]">
                      Tap to fill
                    </span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        fastLoginAs(preset);
                      }}
                      className="text-[9px] px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold transition-all cursor-pointer"
                    >
                      Instant Enter &rarr;
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Sign-In Card */}
        <div className="bg-white rounded-3xl border border-[#D8AD56]/40 p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#241912] leading-tight">
                Staff Authentication
              </h2>
              <p className="text-xs text-[#786B61] mt-0.5">
                Role-Based Access Control verified by Edge security middleware.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              RBAC Protected
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#241912] uppercase tracking-wider">
                  Staff Email Address
                </label>
                <span className="text-[10px] text-[#786B61] font-mono">
                  {email === 'admin@sritayigrand.com'
                    ? 'Super Admin Account'
                    : email === 'manager@sritayigrand.com'
                    ? 'Manager Account'
                    : 'Staff Account'}
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff@sritayigrand.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56] text-sm text-[#241912] outline-none transition-all placeholder:text-[#8C7A6B]/50 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#241912] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#43001F] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56] text-sm text-[#241912] outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Quick credentials reference table */}
            <div className="p-3 bg-[#F8F3E9] rounded-xl border border-[#E6D9C5] text-[11px] text-[#786B61] space-y-1">
              <div className="font-semibold text-[#43001F] flex items-center justify-between">
                <span>Verified Credentials Reference</span>
                <span className="text-[10px] text-[#B18A4A] font-normal">Constant-time HMAC validated</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div className="bg-white p-1.5 rounded border border-[#E6D9C5]/60">
                  <span className="text-[#43001F] font-bold block">Super Admin:</span>
                  <span className="text-stone-500 truncate block">admin@</span>
                  <span className="text-stone-700 block truncate">SuperAdmin@...</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-[#E6D9C5]/60">
                  <span className="text-[#43001F] font-bold block">Manager:</span>
                  <span className="text-stone-500 truncate block">manager@</span>
                  <span className="text-stone-700 block truncate">Manager@...</span>
                </div>
                <div className="bg-white p-1.5 rounded border border-[#E6D9C5]/60">
                  <span className="text-[#43001F] font-bold block">Staff:</span>
                  <span className="text-stone-500 truncate block">staff@</span>
                  <span className="text-stone-700 block truncate">Staff@...</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Authenticating Role...' : `Sign In as ${activePreset.replace('_', ' ')}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Return to Guest Portal Link */}
        <div className="text-center mt-6">
          <NextLink
            href="/"
            className="text-xs text-[#EFE3D6]/70 hover:text-[#D8AD56] transition-colors inline-flex items-center gap-1.5"
          >
            <span>&larr; Return to Guest Portal &amp; Reservations</span>
          </NextLink>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#21180F] flex items-center justify-center text-[#D8AD56] text-xs font-mono">
          Loading authentication portal...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
