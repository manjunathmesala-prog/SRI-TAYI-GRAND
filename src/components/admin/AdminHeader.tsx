'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Wallet,
  UserPlus,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Crown,
  Briefcase,
  Users,
  LogOut,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useRealtimeSync, cashbookClient } from '@/lib/realtime-client';
import { SuperAdminNotificationBell } from '@/components/admin/SuperAdminNotificationBell';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, formatCurrency, isTelugu } = useAdminLanguage();

  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [userName, setUserName] = useState<string>('Sri Tayi Grand Admin');
  const [userRole, setUserRole] = useState<string>('Super Admin');
  const [userEmail, setUserEmail] = useState<string>('admin@sritayigrand.com');
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchCashBalance = async (force = false) => {
    try {
      const bal = await cashbookClient.getBalance(force);
      if (typeof bal === 'number') {
        setCashBalance(bal);
      }
    } catch {}
  };

  const { status, isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'cash_shift_opened' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'cash_transaction_created' ||
        event.eventType === 'expense_created'
      ) {
        fetchCashBalance();
      }
    },
  });

  useEffect(() => {
    fetchCashBalance();

    if (typeof window !== 'undefined') {
      const storedName = authStorage.getUserName();
      const storedRole = authStorage.getRole();
      const storedEmail = authStorage.getUserEmail();
      if (storedName) setUserName(storedName);
      if (storedRole) {
        setUserRole(storedRole);
        if (storedEmail) {
          setUserEmail(storedEmail);
        } else if (storedRole === 'Super Admin') {
          setUserEmail('admin@sritayigrand.com');
        } else if (storedRole === 'Hotel Manager') {
          setUserEmail('manager@sritayigrand.com');
        } else {
          setUserEmail('staff@sritayigrand.com');
        }
      } else {
        authStorage.rehydrate().then((claims) => {
          if (claims) {
            if (claims.name) setUserName(claims.name);
            if (claims.role) setUserRole(claims.role);
            if (claims.email) setUserEmail(claims.email);
          }
        });
      }
    }

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(isTelugu ? 'te-IN' : 'en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTelugu]);

  // Format page title from pathname localized
  const getPageTitle = () => {
    if (pathname === '/admin' || pathname === '/admin/dashboard') {
      return t('header.executiveDashboard', 'Executive Dashboard');
    }
    if (pathname.includes('/bookings')) return t('nav.bookings', 'Bookings');
    if (pathname.includes('/front-desk')) return t('nav.frontDesk', 'Front Desk');
    if (pathname.includes('/walk-in')) return t('nav.walkIn', 'Walk-In Registration');
    if (pathname.includes('/rooms/board')) return isTelugu ? 'రూమ్ టేప్ చార్ట్' : 'Room Tape Chart';
    if (pathname.includes('/rooms/inventory')) return t('nav.roomInventory', 'Room Inventory');
    if (pathname.includes('/rooms/categories')) return t('nav.roomCategories', 'Room Categories');
    if (pathname.includes('/rooms')) return t('nav.rooms', 'Rooms & Inventory');
    if (pathname.includes('/guests')) return t('nav.guests', 'Guests Directory (CRM)');
    if (pathname.includes('/payments')) return t('nav.payments', 'Payments');
    if (pathname.includes('/cashbook')) return t('nav.cashbook', 'Cashbook & Drawer');
    if (pathname.includes('/expenses')) return t('nav.expenses', 'Expenses');
    if (pathname.includes('/daily-closing')) return t('nav.dailyClosing', 'Daily Shift Closing');
    if (pathname.includes('/convention-hall')) return t('nav.conventionHall', 'Convention Hall');
    if (pathname.includes('/housekeeping')) return t('nav.housekeeping', 'Housekeeping');
    if (pathname.includes('/maintenance')) return t('nav.maintenance', 'Maintenance');
    if (pathname.includes('/staff/attendance')) return t('nav.attendance', 'Staff Attendance');
    if (pathname.includes('/staff')) return t('nav.staff', 'Staff Management');
    if (pathname.includes('/rfid')) return t('nav.rfid', 'RFID Management');
    if (pathname.includes('/reports')) return t('nav.reports', 'Reports & Analytics');
    if (pathname.includes('/analytics')) return isTelugu ? 'విశ్లేషణ' : 'Analytics';
    if (pathname.includes('/settings')) return t('nav.settings', 'Settings');
    if (pathname.includes('/content')) return t('nav.content', 'Website Content');
    if (pathname.includes('/reviews')) return t('nav.reviews', 'Google Reviews');
    if (pathname.includes('/enquiries')) return t('nav.enquiries', 'Enquiries');
    if (pathname.includes('/audit-logs')) return t('nav.auditLogs', 'Audit Logs');

    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return 'Admin Console';
    return segment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    authStorage.clearSession();
    router.push('/admin/login');
  };

  const getRoleIcon = (role: string) => {
    if (role === 'Super Admin') return Crown;
    if (role === 'Hotel Manager') return Briefcase;
    return Users;
  };

  const RoleIcon = getRoleIcon(userRole);

  const getRoleLabel = (role: string) => {
    if (role === 'Super Admin') return t('header.superAdmin', 'Super Admin');
    if (role === 'Hotel Manager') return t('header.hotelManager', 'Hotel Manager');
    return t('header.frontDeskStaff', 'Front Desk Staff');
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#E6D9C5] px-4 sm:px-6 py-2.5 flex flex-wrap gap-2 items-center justify-between shadow-xs">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center space-x-3">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#8D672F]">
            Sri Tayi Grand &bull; {t('nav.liveConsole', 'PMS Console')}
          </div>
          <h1 className="text-base sm:text-lg font-serif font-bold text-[#33271D] leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Live Telemetry, Language Switcher, Cash Float & Quick Action Shortcuts */}
      <div className="flex flex-wrap min-w-0 items-center gap-2 sm:gap-3">
        {/* Realtime Status Indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700'
          }`}
          title="Server-Sent Events Realtime Connection"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-mono">
            {isConnected ? t('common.live', 'LIVE SSE') : t('common.reconnecting', 'RECONNECTING')}
          </span>
        </div>

        {/* Live Cash Drawer Counter */}
        {cashBalance !== null && (
          <Link
            href="/admin/cashbook"
            prefetch={false}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#B18A4A]/15 hover:bg-[#B18A4A]/25 border border-[#B18A4A]/30 text-[#8D672F] text-xs font-mono font-bold transition-all shadow-2xs group"
            title={t('header.cashInHand', 'Front Desk Cash Drawer Balance')}
          >
            <Wallet className="w-3.5 h-3.5 text-[#8D672F] group-hover:scale-110 transition-transform" />
            <span>{formatCurrency(cashBalance)}</span>
          </Link>
        )}

        {/* Clock */}
        {currentTime && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/80 border border-[#E6D9C5] text-[#786A5B] text-xs font-mono">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Language Switcher: EN | తెలుగు */}
        <AdminLanguageSwitcher />

        {/* Quick Walk-In Button */}
        <Link
          href="/admin/front-desk"
          prefetch={false}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs uppercase tracking-wider font-semibold shadow-sm active:scale-95 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{t('bookings.newBooking', 'Walk-In')}</span>
        </Link>

        {/* Super Admin Live Alert Bell & Drawer */}
        <SuperAdminNotificationBell />

        {/* User Profile & Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
              userRole === 'Super Admin'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 hover:bg-amber-500/15'
                : userRole === 'Hotel Manager'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 hover:bg-purple-500/15'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-900 hover:bg-blue-500/15'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-white shadow-2xs border border-black/5 flex items-center justify-center">
              <RoleIcon className="w-3.5 h-3.5 text-[#43001F]" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-[11px] font-bold leading-tight truncate max-w-[110px]">
                {userName.split(' ')[0]}
              </span>
              <span className="block text-[9px] uppercase tracking-wider opacity-70 leading-none">
                {getRoleLabel(userRole)}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#D8AD56]/40 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="p-2.5 rounded-xl bg-[#F8F3E9] border border-[#E6D9C5] mb-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#43001F]">
                    {t('common.status', 'Active Role Session')}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-[#43001F] text-white">
                    {getRoleLabel(userRole)}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#241912] mt-1 truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-[#786B61] font-mono truncate">
                  {userEmail}
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('header.signOut', 'Sign Out of Console')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
