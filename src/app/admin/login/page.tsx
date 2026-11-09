'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE AUTHENTICATION PORTAL
 * Supports Super Admin, Hotel Manager, and Front Desk Staff Sign-In.
 * Engineered for full mobile responsiveness, session isolation, and accessibility.
 * ==============================================================================
 */

import { useState, useEffect, Suspense } from 'react';
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
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { authStorage } from '@/lib/auth-storage';

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
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('SUPER_ADMIN');
  const [error, setError] = useState<string | null>(null);

  // Fast auto-redirect if staff already has an active, valid session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingToken = authStorage.getToken();
      if (existingToken) {
        fetch('/api/admin/auth')
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.session) {
              window.location.href = redirectPath;
            }
          })
          .catch(() => {});
      }
    }
  }, [redirectPath]);

  // Synchronize active preset badge if email is changed manually
  const handleEmailChange = (val: string) => {
    setEmail(val);
    const matched = PRESET_ACCOUNTS.find(
      (p) => p.email.toLowerCase() === val.trim().toLowerCase()
    );
    if (matched) {
      setActivePreset(matched.roleId);
    } else {
      setActivePreset('CUSTOM');
    }
  };

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

      // Persist authenticated session claims using sessionStorage (with optional rememberMe)
      if (data.session) {
        authStorage.setSession(
          {
            token: data.session.token,
            role: data.session.role,
            name: data.session.name,
            email: staffEmail,
          },
          rememberMe
        );
      }

      setLoginSuccess(true);
      window.location.href = redirectPath;
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoading(false);
      setLoginSuccess(false);
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
    <div className="min-h-[100dvh] bg-[#21180F] flex flex-col justify-start sm:justify-center items-center p-3 xs:p-4 sm:p-6 py-6 sm:py-12 overflow-y-auto selection:bg-[#D8AD56]">
      {/* Background Ambience */}
      <div className="fixed inset-0 bg-radial-gradient from-[#382216]/60 via-[#21180F]/90 to-[#140D08] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10 my-auto">
        {/* Brand Card Header with Official Emblem */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2.5 sm:mb-3 flex items-center justify-center">
            <Image
              src="/images/hotel/tayi-grand-logo.png"
              alt="Sri Tayi Grand Official Logo"
              fill
              sizes="(max-width: 640px) 64px, 80px"
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
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-[#D8AD56] font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Select Role Profile (One-Tap Fast Login)</span>
            </div>
            <span className="text-[10px] text-white/60 uppercase tracking-widest font-mono">
              3 Roles Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
            {PRESET_ACCOUNTS.map((preset) => {
              const isSelected = activePreset === preset.roleId;
              const Icon = preset.icon;
              return (
                <div
                  key={preset.roleId}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => selectPreset(preset)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectPreset(preset);
                    }
                  }}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between select-none outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56] ${
                    isSelected
                      ? 'bg-[#43001F] border-[#D8AD56] shadow-md ring-1 ring-[#D8AD56]'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#D8AD56]' : 'text-white/70'}`} />
                        <span className="text-xs font-bold text-white tracking-tight truncate">
                          {preset.roleLabel}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#D8AD56] shrink-0 ml-1" />}
                    </div>

                    <p className="text-[11px] text-[#FDFBF7]/80 truncate font-mono">
                      {preset.email}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold text-[#D8AD56]">
                      {isSelected ? 'Active' : 'Tap to fill'}
                    </span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={(e) => {
                        e.stopPropagation();
                        fastLoginAs(preset);
                      }}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-white/20 hover:bg-[#D8AD56] hover:text-[#21180F] text-white font-semibold transition-all cursor-pointer disabled:opacity-50 shrink-0 min-h-[28px] flex items-center"
                    >
                      Instant Enter &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Sign-In Card */}
        <div className="bg-white rounded-3xl border border-[#D8AD56]/40 p-5 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3.5 gap-2">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#241912] leading-tight">
                Staff Authentication
              </h2>
              <p className="text-xs text-[#786B61] mt-0.5">
                Role-Based Access Control verified by Edge security middleware.
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              RBAC Protected
            </span>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <label
                  htmlFor="staff-email-input"
                  className="block text-xs font-semibold text-[#241912] uppercase tracking-wider"
                >
                  Staff Email Address
                </label>
                <span className="text-[10px] text-[#786B61] font-mono truncate">
                  {email === 'admin@sritayigrand.com'
                    ? 'Super Admin Account'
                    : email === 'manager@sritayigrand.com'
                    ? 'Manager Account'
                    : email === 'staff@sritayigrand.com'
                    ? 'Front Desk Account'
                    : 'Custom Account'}
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="staff-email-input"
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  placeholder="staff@sritayigrand.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-2 focus:ring-[#D8AD56]/20 text-sm text-[#241912] outline-none transition-all placeholder:text-[#8C7A6B]/80 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="staff-password-input"
                  className="block text-xs font-semibold text-[#241912] uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="staff-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-2 focus:ring-[#D8AD56]/20 text-sm text-[#241912] outline-none transition-all font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  tabIndex={0}
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-[#8C7A6B] hover:text-[#43001F] hover:bg-stone-100 transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Session Scope & Remember Me Selection */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#786B61]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#43001F] border-stone-300 focus:ring-[#D8AD56] cursor-pointer"
                />
                <span>Remember on this terminal (persistent)</span>
              </label>
              <span className="text-[10px] text-stone-400 hidden sm:inline">
                {rememberMe ? 'Persistent session' : 'Tab session only'}
              </span>
            </div>

            {/* Quick credentials reference table */}
            <div className="p-3 sm:p-3.5 bg-[#F8F3E9] rounded-xl border border-[#E6D9C5] text-xs text-[#786B61] space-y-2">
              <div className="font-semibold text-[#43001F] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#B18A4A]" />
                  <span>Verified Credentials Reference</span>
                </span>
                <span className="text-[10px] text-[#B18A4A] font-normal hidden sm:inline">
                  Constant-time HMAC validated
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                {PRESET_ACCOUNTS.map((item) => (
                  <button
                    key={item.roleId}
                    type="button"
                    disabled={loading}
                    onClick={() => selectPreset(item)}
                    className="bg-white hover:bg-stone-50 p-2 rounded-lg border border-[#E6D9C5]/80 text-left transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-[#43001F] font-bold block text-xs">{item.roleLabel}</span>
                    <span className="text-stone-500 block truncate">{item.email}</span>
                    <span className="text-stone-700 block truncate font-sans text-[10px] text-[#B18A4A]">
                      Click to load
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] active:bg-[#20000E] text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D8AD56]" />
                  <span>Authenticating Role...</span>
                </>
              ) : loginSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Access Granted! Opening Dashboard...</span>
                </>
              ) : (
                <>
                  <span>
                    Sign In as{' '}
                    {activePreset === 'CUSTOM'
                      ? 'Staff Member'
                      : activePreset.replace('_', ' ')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Return to Guest Portal Link */}
        <div className="text-center mt-5 sm:mt-6">
          <NextLink
            href="/"
            className="text-xs text-[#EFE3D6]/80 hover:text-[#D8AD56] transition-colors inline-flex items-center gap-1.5 py-1 px-2 rounded"
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
        <div className="min-h-[100dvh] bg-[#21180F] flex items-center justify-center text-[#D8AD56] text-xs font-mono">
          Loading authentication portal...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
