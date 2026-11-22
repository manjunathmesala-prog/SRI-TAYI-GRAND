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
import { OfflineSyncBadge } from '@/components/sync/OfflineSyncBadge';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, formatCurrency, isTelugu } = useAdminLanguage();

  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return authStorage.getUserName() || 'Staff';
    }
    return 'Staff';
  });
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return authStorage.getRole() || 'Staff';
    }
    return 'Staff';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return authStorage.getUserEmail() || 'staff@sritayigrand.com';
    }
    return 'staff@sritayigrand.com';
  });
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
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E6D9C5] px-4 sm:px-6 py-2 flex flex-wrap gap-2 items-center justify-between shadow-2xs">
      {/* Left: Page Title */}
      <div className="flex items-center space-x-3">
        <h1 className="text-base sm:text-lg font-serif font-bold text-[#2A1D13] tracking-tight leading-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right: Live Telemetry, Language Switcher, Cash Float & Quick Action Shortcuts */}
      <div className="flex flex-wrap min-w-0 items-center gap-2 sm:gap-2.5">
        {/* Realtime Status Indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide border transition-all ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
          title="Server-Sent Events Realtime Connection"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-[11px] font-mono">
            {isConnected ? t('common.live', 'Live') : t('common.reconnecting', 'Connecting')}
          </span>
        </div>

        {/* Offline & Sync Queue Status Badge */}
        <OfflineSyncBadge />

        {/* Live Cash Drawer Counter */}
        {cashBalance !== null && (
          <Link
            href="/admin/cashbook"
            prefetch={false}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E6D9C5] text-[#2A1D13] text-xs font-mono font-medium transition-all shadow-2xs group"
            title={t('header.cashInHand', 'Front Desk Cash Drawer Balance')}
          >
            <Wallet className="w-3.5 h-3.5 text-[#8D672F] group-hover:scale-105 transition-transform" />
            <span>{formatCurrency(cashBalance)}</span>
          </Link>
        )}

        {/* Clock */}
        {currentTime && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#E6D9C5] text-[#786A5B] text-xs font-mono">
            <Clock className="w-3 h-3 text-[#786A5B]" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Language Switcher: EN | తెలుగు */}
        <AdminLanguageSwitcher />

        {/* Quick Walk-In Button */}
        <Link
          href="/admin/front-desk"
          prefetch={false}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs font-medium shadow-2xs active:scale-95 transition-all"
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
            className="flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF8F5] transition-all text-xs font-medium text-[#2A1D13] cursor-pointer shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-[#2A1D13] text-[#EAD8B8] flex items-center justify-center">
              <RoleIcon className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-[11px] font-semibold leading-tight truncate max-w-[110px]">
                {userName.split(' ')[0]}
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-[#786A5B] leading-none">
                {getRoleLabel(userRole)}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#786A5B] ml-0.5" />
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-[#E6D9C5] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Profile Card Header */}
              <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5] mb-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-[#786A5B]">
                    {t('common.status', 'Session')}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full font-medium bg-[#2A1D13] text-[#EAD8B8]">
                    {getRoleLabel(userRole)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#2A1D13] mt-1 truncate">
                  {userName}
                </div>
                <div className="text-[11px] text-[#786A5B] font-mono truncate">
                  {userEmail}
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-2 border-t border-[#E6D9C5]/60">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('header.signOut', 'Sign Out')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
