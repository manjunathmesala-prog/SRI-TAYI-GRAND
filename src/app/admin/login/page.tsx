'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
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
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#382216] border-2 border-[#D8AD56] flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="font-serif font-bold text-2xl text-[#D8AD56]">TG</span>
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
                <ShieldCheck className="w-3 h-3" /> RBAC Protected
              </span>
            </h2>
            <p className="text-xs text-[#786B61] mt-1">
              Multi-user authorized access. All activity is audited in real-time.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:border-[#D8AD56] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-medium pl-9 pr-3 py-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:border-[#D8AD56] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Role Switcher for Multi-Session Audit */}
          <div className="pt-4 border-t border-[#EFE3D6]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#786B61] mb-2.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span>Multi-User Session Roles:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoRole('admin@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[10px] font-semibold text-[#382216] border border-[#EFE3D6] text-left"
              >
                👑 <strong>Super Admin</strong>
                <span className="block text-[9px] text-[#786B61]">All permissions</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('frontdesk@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[10px] font-semibold text-[#382216] border border-[#EFE3D6] text-left"
              >
                🛎️ <strong>Front Desk</strong>
                <span className="block text-[9px] text-[#786B61]">Check-in/out, folios</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('housekeeping@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[10px] font-semibold text-[#382216] border border-[#EFE3D6] text-left"
              >
                🧹 <strong>Housekeeping</strong>
                <span className="block text-[9px] text-[#786B61]">Turnover sanitization</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoRole('accounts@sritayigrand.com')}
                className="p-2 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[10px] font-semibold text-[#382216] border border-[#EFE3D6] text-left"
              >
                📊 <strong>Accounts</strong>
                <span className="block text-[9px] text-[#786B61]">Ledger, Night audit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back to Public Site */}
        <div className="mt-6 text-center">
          <NextLink
            href="/"
            className="text-xs text-[#EFE3D6]/70 hover:text-[#D8AD56] transition-colors"
          >
            ← Return to Sri Tayi Grand Public Site
          </NextLink>
        </div>
      </div>
    </div>
  );
}
