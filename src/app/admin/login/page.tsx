'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import Image from 'next/image';
import { Lock, Mail, ArrowRight, Key, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sritayigrand.com');
  const [password, setPassword] = useState('GrandHotel@Kadiri2026!');
  const [loading, setLoading] = useState(false);
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
        throw new Error(data.error || 'Invalid credentials');
      }

      // Store session token in localStorage for easy header attachment
      if (data.session) {
        localStorage.setItem('stg_token', data.session.token);
        localStorage.setItem('stg_role', data.session.role);
        localStorage.setItem('stg_user_name', data.session.name);
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('GrandHotel@Kadiri2026!');
    performLogin(roleEmail, 'GrandHotel@Kadiri2026!');
  };

  return (
    <div className="min-h-screen bg-[#25150F] flex flex-col justify-center items-center p-4 selection:bg-[#D8AD56]">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient from-[#382216]/50 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header with Official Emblem */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 rounded-full border-2 border-[#D8AD56] overflow-hidden mx-auto mb-3 shadow-xl bg-black/40">
            <Image
              src="/images/hotel/tayi-grand-logo.jpg"
              alt="Sri Tayi Grand Official Logo"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
            SRI TAYI GRAND
          </h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#D8AD56] font-semibold mt-1">
            HOTEL MANAGEMENT SAAS PORTAL
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-white rounded-3xl border border-[#D8AD56]/40 p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#241912] flex items-center justify-between">
              <span>Staff Sign In</span>
              <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Portal
              </span>
            </h2>
            <p className="text-xs text-[#786B61] mt-1 font-light">
              Enter your credentials to access Sri Tayi Grand control panel.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#241912] uppercase tracking-wider mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="staff@sritayigrand.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56] text-sm text-[#241912] outline-none transition-all placeholder:text-[#8C7A6B]/50"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#241912] uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[10px] text-[#D8AD56] hover:underline cursor-pointer">
                  Default: GrandHotel@Kadiri2026!
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:ring-1 focus:ring-[#D8AD56] text-sm text-[#241912] outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-goldGlow hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Management'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Role Fill Presets for Ease of Testing */}
          <div className="pt-4 border-t border-[#FAF7F2]">
            <div className="text-[11px] font-semibold text-[#8C7A6B] uppercase tracking-wider mb-2 text-center">
              Quick Role One-Click Switch
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoRole('admin@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[#241912] text-left border border-[#D8AD56]/20 transition-colors"
              >
                <div className="font-bold text-[11px] text-[#382216]">Super Admin</div>
                <div className="text-[9px] text-[#786B61] truncate">admin@sritayigrand.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('reception@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[#241912] text-left border border-[#D8AD56]/20 transition-colors"
              >
                <div className="font-bold text-[11px] text-[#382216]">Receptionist</div>
                <div className="text-[9px] text-[#786B61] truncate">reception@sritayigrand.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('housekeeping@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[#241912] text-left border border-[#D8AD56]/20 transition-colors"
              >
                <div className="font-bold text-[11px] text-[#382216]">Housekeeping</div>
                <div className="text-[9px] text-[#786B61] truncate">housekeeping@sritayigrand.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('manager@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[#241912] text-left border border-[#D8AD56]/20 transition-colors"
              >
                <div className="font-bold text-[11px] text-[#382216]">General Manager</div>
                <div className="text-[9px] text-[#786B61] truncate">manager@sritayigrand.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Guest Website Link */}
        <div className="text-center mt-6">
          <NextLink
            href="/"
            className="text-xs text-[#EFE3D6]/70 hover:text-[#D8AD56] transition-colors inline-flex items-center gap-1.5"
          >
            <span>← Return to Guest Portal & Reservations</span>
          </NextLink>
        </div>
      </div>
    </div>
  );
}
