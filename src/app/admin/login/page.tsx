'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - ENTERPRISE AUTHENTICATION PORTAL (BILINGUAL: EN + TELUGU)
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
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';

const PRESET_ACCOUNTS = [
  {
    roleId: 'SUPER_ADMIN',
    roleLabel: 'Super Admin',
    roleLabelTe: 'సూపర్ అడ్మిన్',
    name: 'Sri Tayi Grand Admin',
    email: 'admin@sritayigrand.com',
    password: 'SuperAdmin@TayiGrand2026!',
    icon: Crown,
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    scopeEn: 'Full Unrestricted Access • Settings • Audit Logs • P&L',
    scopeTe: 'పూర్తి అపరిమిత యాక్సెస్ • సెట్టింగులు • ఆడిట్ లాగ్స్ • P&L',
  },
  {
    roleId: 'MANAGER',
    roleLabel: 'Hotel Manager',
    roleLabelTe: 'హోటల్ మేనేజర్',
    name: 'G. Mohan Kumar',
    email: 'manager@sritayigrand.com',
    password: 'Manager@TayiGrand2026!',
    icon: Briefcase,
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    scopeEn: 'Operations • Reservations • Housekeeping • Staff • Reports',
    scopeTe: 'కార్యకలాపాలు • రిజర్వేషన్లు • గదుల శుభ్రత • సిబ్బంది • నివేదికలు',
  },
  {
    roleId: 'STAFF',
    roleLabel: 'Front Desk Staff',
    roleLabelTe: 'రిసెప్షన్ సిబ్బంది',
    name: 'Sri Tayi Grand Staff',
    email: 'staff@sritayigrand.com',
    password: 'Staff@TayiGrand2026!',
    icon: Users,
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    scopeEn: 'Reception • Check-In / Walk-In • Room Board • RFID Keycards',
    scopeTe: 'రిసెప్షన్ • చెక్-ఇన్ / వాక్-ఇన్ • రూమ్ బోర్డు • RFID కీకార్డులు',
  },
];

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/admin/dashboard';
  const { t, isTelugu } = useAdminLanguage();

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
        throw new Error(data.error || t('auth.invalidCredentials', 'Authentication failed. Please check credentials.'));
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.invalidCredentials', 'An unexpected authentication error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const selectPreset = (preset: (typeof PRESET_ACCOUNTS)[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.roleId);
    setError(null);
  };

  const fastLoginAs = async (preset: (typeof PRESET_ACCOUNTS)[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.roleId);
    await performLogin(preset.email, preset.password);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#180F08] via-[#241912] to-[#120B06] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#B18A4A]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Top Bar with Language Selector and Back Link */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 z-10 px-1">
        <NextLink
          href="/"
          className="text-xs text-[#E6D9C5]/80 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <span>&larr;</span>
          <span>{isTelugu ? 'పబ్లిక్ వెబ్‌సైట్' : 'Public Website'}</span>
        </NextLink>

        {/* Premium Language Switcher: EN | తెలుగు */}
        <AdminLanguageSwitcher />
      </div>

      <div className="w-full max-w-xl relative z-10">
        {/* Hotel Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-block relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#D8AD56] p-1.5 bg-black/50 shadow-2xl mb-3">
            <Image
              src="/images/hotel/tayi-grand-logo.png"
              alt="Sri Tayi Grand Emblem"
              fill
              className="object-contain drop-shadow-xl p-1"
              priority
            />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {isTelugu ? 'శ్రీ తాయి గ్రాండ్' : 'SRI TAYI GRAND'}
          </h1>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#D8AD56] font-semibold mt-1">
            {isTelugu
              ? 'హోటల్ మేనేజ్‌మెంట్ • ఎంటర్‌ప్రైజ్ PMS పోర్టల్'
              : 'HOTEL MANAGEMENT • ENTERPRISE RBAC PORTAL'}
          </p>
        </div>

        {/* Credentials Selector Pills (Super Admin, Manager, Staff) */}
        <div className="bg-[#2A1D15] border border-[#D8AD56]/30 rounded-2xl p-3 sm:p-4 mb-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-[#D8AD56] font-semibold">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{t('auth.fastRoleSelect', 'Select Role Profile (One-Tap Fast Login)')}</span>
            </div>
            <span className="text-[10px] text-white/60 uppercase tracking-widest font-mono">
              {isTelugu ? '3 పాత్రలు అందుబాటులో ఉన్నాయి' : '3 Roles Verified'}
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
                          {isTelugu ? preset.roleLabelTe : preset.roleLabel}
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
                      {isSelected ? (isTelugu ? 'సక్రియం' : 'Active') : (isTelugu ? 'ఎంచుకోండి' : 'Tap to fill')}
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
                      {isTelugu ? 'తక్షణ ప్రవేశం →' : 'Instant Enter →'}
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
                {t('auth.loginTitle', 'Staff Authentication')}
              </h2>
              <p className="text-xs text-[#786B61] mt-0.5">
                {t('auth.loginSubtitle', 'Role-Based Access Control verified by Edge security middleware.')}
              </p>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {isTelugu ? 'RBAC రక్షితం' : 'RBAC Protected'}
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
                  {t('auth.email', 'Staff Email Address')}
                </label>
                <span className="text-[10px] text-[#786B61] font-mono truncate">
                  {email === 'admin@sritayigrand.com'
                    ? (isTelugu ? 'సూపర్ అడ్మిన్ ఖాతా' : 'Super Admin Account')
                    : email === 'manager@sritayigrand.com'
                    ? (isTelugu ? 'మేనేజర్ ఖాతా' : 'Manager Account')
                    : email === 'staff@sritayigrand.com'
                    ? (isTelugu ? 'రిసెప్షన్ ఖాతా' : 'Front Desk Account')
                    : (isTelugu ? 'ఖాతా' : 'Account')}
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
                  {t('auth.password', 'Password')}
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
                <span>{t('auth.rememberMe', 'Remember on this terminal (persistent)')}</span>
              </label>
              <span className="text-[10px] text-stone-400 hidden sm:inline">
                {rememberMe ? (isTelugu ? 'శాశ్వత సెషన్' : 'Persistent session') : (isTelugu ? 'టాబ్ సెషన్ మాత్రమే' : 'Tab session only')}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || loginSuccess}
              className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-[#8D672F] via-[#B18A4A] to-[#8D672F] hover:from-[#6D4E21] hover:to-[#6D4E21] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-99 disabled:opacity-50 cursor-pointer min-h-[48px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('auth.authenticating', 'Authenticating Credentials...')}</span>
                </>
              ) : loginSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{isTelugu ? 'ధృవీకరణ పూర్తయింది! ప్రవేశిస్తోంది...' : 'Authenticated! Redirecting...'}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.signIn', 'Sign In to Management Console')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice Footer */}
          <div className="pt-2 border-t border-[#EFE3D6] text-center">
            <p className="text-[11px] text-[#786B61] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('auth.securityNotice', 'Secured via Cryptographic JWT & Supabase Row-Level Security.')}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#241912] flex items-center justify-center text-[#D8AD56]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
