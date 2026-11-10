'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  BedDouble,
  CalendarCheck,
  ConciergeBell,
  Users,
  CreditCard,
  Building,
  Sparkles,
  UserCog,
  BarChart3,
  Globe,
  Settings,
  KeyRound,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Radio,
  MessageSquareQuote,
  Wallet,
  TrendingDown,
  Lock,
  Wrench,
  Calculator,
  UserCheck,
  ShieldCheck,
  CalendarRange,
  TrendingUp,
  MessageSquare,
  FileText,
  MailCheck,
} from 'lucide-react';
import { useRealtimeSync, cashbookClient } from '@/lib/realtime-client';
import { canAccessRoute } from '@/lib/rbac/types';
import { authStorage } from '@/lib/auth-storage';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';

interface NavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: any;
    highlight?: boolean;
    badge?: string;
  }[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Admin Console');
  const [userRole, setUserRole] = useState('Super Admin');
  const [cashBalance, setCashBalance] = useState<number | null>(null);

  const { t, formatCurrency, isTelugu } = useAdminLanguage();

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
      if (storedName) setUserName(storedName);
      if (storedRole) {
        setUserRole(storedRole);
      } else {
        authStorage.rehydrate().then((claims) => {
          if (claims) {
            if (claims.name) setUserName(claims.name);
            if (claims.role) setUserRole(claims.role);
          }
        });
      }
    }
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Close drawer on path change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname === '/admin/login') {
    return null;
  }

  const getSectionTitle = (title: string) => {
    if (!isTelugu) return title;
    if (title.includes('OVERVIEW')) return 'A. స్థూలదృష్టి';
    if (title.includes('OPERATIONS')) return 'B. హోటల్ కార్యకలాపాలు';
    if (title.includes('FINANCIAL')) return 'C. ఆర్థిక నిర్వహణ';
    if (title.includes('BUSINESS')) return 'D. వ్యాపార నిర్వహణ';
    if (title.includes('WEBSITE')) return 'E. వెబ్‌సైట్ నిర్వహణ';
    if (title.includes('SYSTEM')) return 'F. సిస్టమ్ నిర్వహణ';
    return title;
  };

  const getTranslatedLabel = (href: string, fallback: string) => {
    switch (href) {
      case '/admin/dashboard':
        return t('nav.dashboard', fallback);
      case '/admin/analytics':
        return isTelugu ? 'విశ్లేషణ & గణాంకాలు' : 'Analytics';
      case '/admin/reports':
        return t('nav.reports', fallback);
      case '/admin/front-desk':
        return t('nav.frontDesk', fallback);
      case '/admin/walk-in':
        return t('nav.walkIn', fallback);
      case '/admin/bookings':
        return t('nav.bookings', fallback);
      case '/admin/rooms/board':
        return isTelugu ? 'రూమ్ టేప్ చార్ట్' : 'Room Tape Chart';
      case '/admin/rooms/inventory':
        return t('nav.roomInventory', fallback);
      case '/admin/rooms/categories':
        return t('nav.roomCategories', fallback);
      case '/admin/guests':
        return t('nav.guests', fallback);
      case '/admin/housekeeping':
        return t('nav.housekeeping', fallback);
      case '/admin/maintenance':
        return t('nav.maintenance', fallback);
      case '/admin/convention-hall':
        return t('nav.conventionHall', fallback);
      case '/admin/enquiries':
        return t('nav.enquiries', fallback);
      case '/admin/rfid':
        return t('nav.rfid', fallback);
      case '/admin/payments':
        return t('nav.payments', fallback);
      case '/admin/cashbook':
        return t('nav.cashbook', fallback);
      case '/admin/expenses':
        return t('nav.expenses', fallback);
      case '/admin/accounting':
        return isTelugu ? 'జనరల్ లెడ్జర్ ERP' : 'General Ledger ERP';
      case '/admin/daily-closing':
        return t('nav.dailyClosing', fallback);
      case '/admin/staff/attendance':
        return t('nav.attendance', fallback);
      case '/admin/staff':
        return t('nav.staff', fallback);
      case '/admin/pricing':
        return isTelugu ? 'డైనమిక్ ధరలు' : 'Dynamic Pricing';
      case '/admin/channels':
        return isTelugu ? 'ఛానల్ మేనేజర్' : 'Channel Manager (OTAs)';
      case '/admin/reviews':
        return t('nav.reviews', fallback);
      case '/admin/content':
        return t('nav.content', fallback);
      case '/admin/settings':
        return t('nav.settings', fallback);
      case '/admin/audit-logs':
        return t('nav.auditLogs', fallback);
      default:
        return fallback;
    }
  };

  const getTranslatedBadge = (badge?: string) => {
    if (!badge || !isTelugu) return badge;
    if (badge === 'Executive') return 'ఎగ్జిక్యూటివ్';
    if (badge === 'Counter') return 'కౌంటర్';
    if (badge === 'Matrix') return 'మ్యాట్రిక్స్';
    if (badge === 'OOO') return 'OOO';
    if (badge === 'Leads') return 'లీడ్స్';
    if (badge === 'Hardware') return 'హార్డ్‌వేర్';
    if (badge === 'Live') return 'ప్రత్యక్షం';
    if (badge === 'GL') return 'GL';
    if (badge === 'Roster') return 'రోస్టర్';
    if (badge === 'Yield') return 'ఈల్డ్';
    if (badge === '2-Way') return '2-వే';
    if (badge === 'Audit') return 'ఆడిట్';
    return badge;
  };

  const navSections: NavSection[] = [
    {
      title: 'A. OVERVIEW',
      items: [
        { label: 'Dashboard Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, badge: 'Executive' },
        { label: 'Reports Center', href: '/admin/reports', icon: FileText },
      ],
    },
    {
      title: 'B. HOTEL OPERATIONS',
      items: [
        { label: 'Front Desk / Reception', href: '/admin/front-desk', icon: ConciergeBell, highlight: true },
        { label: 'Walk-In Registration', href: '/admin/walk-in', icon: UserCheck, badge: 'Counter' },
        { label: 'Reservations & Bookings', href: '/admin/bookings', icon: CalendarCheck },
        { label: 'Room Tape Chart', href: '/admin/rooms/board', icon: CalendarRange, badge: 'Matrix' },
        { label: 'Room Inventory', href: '/admin/rooms/inventory', icon: BedDouble },
        { label: 'Room Categories', href: '/admin/rooms/categories', icon: Layers },
        { label: 'Guest Directory (CRM)', href: '/admin/guests', icon: Users },
        { label: 'Housekeeping Matrix', href: '/admin/housekeeping', icon: Sparkles },
        { label: 'Maintenance & OOO', href: '/admin/maintenance', icon: Wrench, badge: 'OOO' },
        { label: 'Convention Hall', href: '/admin/convention-hall', icon: Building, highlight: true },
        { label: 'Enquiries Pipeline', href: '/admin/enquiries', icon: MessageSquare, badge: 'Leads' },
        { label: 'RFID Door Keycards', href: '/admin/rfid', icon: KeyRound, badge: 'Hardware' },
      ],
    },
    {
      title: 'C. FINANCIAL MANAGEMENT',
      items: [
        { label: 'Payments & Revenue', href: '/admin/payments', icon: CreditCard },
        { label: 'Cashbook & Drawer', href: '/admin/cashbook', icon: Wallet, highlight: true, badge: 'Live' },
        { label: 'Operating Expenses', href: '/admin/expenses', icon: TrendingDown },
        { label: 'General Ledger ERP', href: '/admin/accounting', icon: Calculator, badge: 'GL' },
        { label: 'Night Audit & Closing', href: '/admin/daily-closing', icon: Lock },
      ],
    },
    {
      title: 'D. BUSINESS MANAGEMENT',
      items: [
        { label: 'Staff Attendance', href: '/admin/staff/attendance', icon: UserCheck, badge: 'Roster' },
        { label: 'Staff & Roles', href: '/admin/staff', icon: UserCog },
      ],
    },
    {
      title: 'E. WEBSITE MANAGEMENT',
      items: [
        { label: 'Dynamic Pricing', href: '/admin/pricing', icon: TrendingUp, badge: 'Yield' },
        { label: 'Channel Manager (OTAs)', href: '/admin/channels', icon: Globe, badge: '2-Way' },
        { label: 'Guest Reviews', href: '/admin/reviews', icon: MessageSquareQuote },
        { label: 'Website CMS', href: '/admin/content', icon: Globe },
        { label: 'Hotel Settings', href: '/admin/settings', icon: Settings },
      ],
    },
    {
      title: 'F. SYSTEM MANAGEMENT',
      items: [
        { label: 'System Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck, badge: 'Audit' },
      ],
    },
  ];

  const bottomBarItems = [
    { label: t('nav.dashboard', 'Overview'), href: '/admin/dashboard', icon: LayoutDashboard },
    { label: t('nav.frontDesk', 'Front Desk'), href: '/admin/front-desk', icon: ConciergeBell, highlight: true },
    { label: t('nav.bookings', 'Bookings'), href: '/admin/bookings', icon: CalendarCheck },
    { label: t('nav.cashbook', 'Cashbook'), href: '/admin/cashbook', icon: Wallet },
    { label: t('nav.dailyClosing', 'Closing'), href: '/admin/daily-closing', icon: Lock },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch {}
    authStorage.clearSession();
    router.push('/admin/login');
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* DESKTOP SIDEBAR (Visible on md and above: w-72)                */}
      {/* ------------------------------------------------------------- */}
      <aside className="hidden md:flex w-72 bg-[#21180F] text-[#F8F3E9] font-sans p-5 flex-col justify-between shrink-0 shadow-2xl border-r border-[#3a2c1f] fixed top-0 bottom-0 left-0 z-50 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-stone-800">
        <div className="space-y-5">
          {/* Logo / Brand Header */}
          <div className="pb-4 border-b border-[#3a2c1f] space-y-3">
            <NextLink href="/admin/dashboard" prefetch={false} className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 rounded-full border border-[#D8AD56]/80 p-1 bg-black/40 shadow-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/images/hotel/tayi-grand-logo.png"
                  alt="Sri Tayi Grand Official Emblem"
                  width={30}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-serif font-bold text-[#B18A4A] tracking-wider uppercase leading-none">
                  SRI TAYI GRAND
                </div>
                <div className="text-[9px] text-[#E6D9C5]/80 tracking-widest uppercase font-semibold mt-1">
                  HOTEL &bull; {t('nav.liveConsole', 'PMS')} &bull; KADIRI
                </div>
              </div>
            </NextLink>

            {/* Realtime & Drawer Status Badges */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium tracking-wide">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{isConnected ? t('common.live', 'LIVE PMS') : t('common.reconnecting', 'SYNCING')}</span>
              </div>

              {cashBalance !== null && (
                <NextLink
                  href="/admin/cashbook"
                  prefetch={false}
                  className="px-2 py-0.5 rounded-full bg-[#B18A4A]/15 hover:bg-[#B18A4A]/25 border border-[#B18A4A]/30 text-[#E6D9C5] text-[10px] font-mono font-medium flex items-center gap-1 transition-colors"
                  title={t('header.cashInHand', 'Front Desk Cash Float')}
                >
                  <Wallet className="w-3 h-3 text-[#B18A4A]" />
                  <span>{formatCurrency(cashBalance)}</span>
                </NextLink>
              )}
            </div>
          </div>

          {/* Grouped Navigation */}
          <nav className="space-y-5">
            {navSections.map((section) => {
              const visibleItems = section.items.filter((item) => canAccessRoute(userRole, item.href));
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.title} className="space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-widest font-sans text-[#B18A4A]/70 px-2 py-1">
                    {getSectionTitle(section.title)}
                  </div>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                      const translatedLabel = getTranslatedLabel(item.href, item.label);
                      const translatedBadge = getTranslatedBadge(item.badge);

                      return (
                        <NextLink
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-sans font-medium transition-all ${
                            isActive
                              ? 'bg-[#8D672F] text-white shadow-md font-semibold'
                              : item.highlight
                              ? 'bg-[#B18A4A]/15 text-[#E6D9C5] border border-[#B18A4A]/30 hover:bg-[#B18A4A]/25 font-semibold'
                              : 'text-[#E6D9C5]/80 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isActive
                                  ? 'text-white'
                                  : item.highlight
                                  ? 'text-[#D8AD56]'
                                  : 'text-[#B18A4A]'
                              }`}
                            />
                            <span className="truncate">{translatedLabel}</span>
                          </div>

                          {translatedBadge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1.5 shrink-0 ${
                                isActive
                                  ? 'bg-black/30 text-white'
                                  : item.highlight
                                  ? 'bg-[#D8AD56] text-[#21180F]'
                                  : 'bg-white/10 text-[#E6D9C5]/70'
                              }`}
                            >
                              {translatedBadge}
                            </span>
                          )}
                        </NextLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="pt-4 border-t border-[#3a2c1f] space-y-3 mt-4">
          <div className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-full bg-[#8D672F]/30 border border-[#8D672F]/50 flex items-center justify-center text-[#D8AD56] font-bold text-xs shrink-0">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{userName}</div>
              <div className="text-[10px] text-[#B18A4A] truncate uppercase tracking-wider">
                {userRole}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 px-1">
            <NextLink
              href="/"
              target="_blank"
              prefetch={false}
              className="text-xs text-[#E6D9C5]/60 hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-white/5 transition-colors"
              title={t('nav.viewPublicSite', 'View Public Site')}
            >
              <span>{t('nav.viewPublicSite', 'Public Site')}</span>
              <ExternalLink className="w-3 h-3" />
            </NextLink>

            <button
              onClick={handleLogout}
              className="text-xs text-rose-300 hover:text-rose-100 flex items-center space-x-1 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
              title={t('nav.logout', 'Logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('nav.logout', 'Logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE STICKY TOP HEADER (< md)                                */}
      {/* ------------------------------------------------------------- */}
      <header className="md:hidden sticky top-0 z-40 bg-[#21180F] text-[#F8F3E9] font-sans border-b border-[#3a2c1f] px-3 h-14 flex items-center justify-between shadow-md gap-2 w-full max-w-full">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Admin Menu"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-[#E6D9C5] flex items-center justify-center shrink-0 border border-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>

          <NextLink href="/admin/dashboard" prefetch={false} className="flex items-center space-x-2 min-w-0">
            <div className="relative w-8 h-8 rounded-full border border-[#D8AD56]/80 p-0.5 bg-black/40 shadow-sm flex items-center justify-center shrink-0">
              <Image
                src="/images/hotel/tayi-grand-logo.png"
                alt="Sri Tayi Grand"
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-serif font-bold text-[#B18A4A] tracking-wider uppercase truncate">
                SRI TAYI GRAND
              </div>
              <div className="text-[9px] text-[#E6D9C5]/80 font-medium truncate uppercase tracking-widest -mt-0.5">
                {t('nav.liveConsole', 'PMS CONSOLE')}
              </div>
            </div>
          </NextLink>
        </div>

        {/* Quick Mobile Action Shortcuts */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <AdminLanguageSwitcher showIcon={false} className="p-0.5" />

          {cashBalance !== null && (
            <NextLink
              href="/admin/cashbook"
              prefetch={false}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-300 border border-amber-400/20 text-[10px] font-mono font-semibold max-w-[85px] truncate"
              title={t('header.cashInHand', 'Front Desk Cash Float')}
            >
              {formatCurrency(cashBalance)}
            </NextLink>
          )}
          <NextLink
            href="/admin/front-desk"
            prefetch={false}
            className="px-2.5 py-1.5 rounded-lg bg-[#8D672F] active:bg-[#6D4E21] text-white text-[10px] uppercase tracking-wider font-semibold shadow-sm flex items-center space-x-1 shrink-0"
          >
            <ConciergeBell className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{t('nav.frontDesk', 'Front Desk')}</span>
          </NextLink>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE SLIDE-OVER DRAWER OVERLAY                              */}
      {/* ------------------------------------------------------------- */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-4/5 max-w-xs bg-[#21180F] text-[#F8F3E9] p-5 flex flex-col justify-between z-10 shadow-2xl h-full overflow-y-auto border-r border-[#3a2c1f] animate-slide-in-left">
            <div className="space-y-4">
              {/* Header with Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-[#3a2c1f]">
                <div className="flex items-center space-x-2.5">
                  <div className="relative w-8 h-8 rounded-full border border-[#D8AD56]/80 p-0.5 bg-black/40 shadow-sm flex items-center justify-center shrink-0">
                    <Image
                      src="/images/hotel/tayi-grand-logo.png"
                      alt="Sri Tayi Grand"
                      width={22}
                      height={22}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-serif font-bold text-[#B18A4A] tracking-wider uppercase">
                      SRI TAYI GRAND
                    </div>
                    <div className="text-[8px] text-[#E6D9C5]/80 tracking-widest uppercase">
                      HOTEL PMS &bull; KADIRI
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="w-8 h-8 rounded-lg bg-white/5 active:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Drawer Language Switcher */}
              <div className="pt-1 pb-2">
                <AdminLanguageSwitcher className="w-full justify-center" />
              </div>

              {/* Grouped Navigation */}
              <nav className="space-y-4">
                {navSections.map((section) => {
                  const visibleItems = section.items.filter((item) => canAccessRoute(userRole, item.href));
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={section.title} className="space-y-1">
                      <div className="text-[9px] uppercase font-bold tracking-widest font-sans text-[#B18A4A]/70 px-2">
                        {getSectionTitle(section.title)}
                      </div>
                      <div className="space-y-0.5">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          const isActive =
                            pathname === item.href ||
                            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                          const translatedLabel = getTranslatedLabel(item.href, item.label);
                          const translatedBadge = getTranslatedBadge(item.badge);

                          return (
                            <NextLink
                              key={item.href}
                              href={item.href}
                              prefetch={false}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-sans font-medium transition-colors ${
                                isActive
                                  ? 'bg-[#8D672F] text-white shadow-md font-semibold'
                                  : item.highlight
                                  ? 'bg-[#B18A4A]/15 text-[#E6D9C5] border border-[#B18A4A]/30'
                                  : 'text-[#E6D9C5]/80 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 truncate">
                                <Icon
                                  className={`w-4 h-4 shrink-0 ${
                                    isActive
                                      ? 'text-white'
                                      : item.highlight
                                      ? 'text-[#D8AD56]'
                                      : 'text-[#B18A4A]'
                                  }`}
                                />
                                <span className="truncate">{translatedLabel}</span>
                              </div>

                              {translatedBadge && (
                                <span
                                  className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold ml-1.5 shrink-0 ${
                                    isActive
                                      ? 'bg-black/30 text-white'
                                      : item.highlight
                                      ? 'bg-[#D8AD56] text-[#21180F]'
                                      : 'bg-white/10 text-[#E6D9C5]/70'
                                  }`}
                                >
                                  {translatedBadge}
                                </span>
                              )}
                            </NextLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="pt-3 border-t border-[#3a2c1f] space-y-2 mt-4">
              <div className="flex items-center space-x-2 px-1">
                <div className="w-7 h-7 rounded-full bg-[#8D672F]/30 border border-[#8D672F]/50 flex items-center justify-center text-[#D8AD56] font-bold text-xs shrink-0">
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{userName}</div>
                  <div className="text-[9px] text-[#B18A4A] truncate uppercase tracking-wider">
                    {userRole}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 px-1">
                <NextLink
                  href="/"
                  target="_blank"
                  prefetch={false}
                  className="text-xs text-[#E6D9C5]/60 hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-white/5 transition-colors"
                >
                  <span>{t('nav.viewPublicSite', 'Public Site')}</span>
                  <ExternalLink className="w-3 h-3" />
                </NextLink>

                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-300 hover:text-rose-100 flex items-center space-x-1 p-1 rounded hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('nav.logout', 'Logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                           */}
      {/* ------------------------------------------------------------- */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#21180F]/95 backdrop-blur-md border-t border-[#3a2c1f] px-2 py-1.5 flex items-center justify-around shadow-2xl"
      >
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

          return (
            <NextLink
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-sans font-medium transition-all ${
                isActive
                  ? 'text-[#D8AD56] font-bold scale-105'
                  : item.highlight
                  ? 'text-[#B18A4A]'
                  : 'text-[#E6D9C5]/60 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#D8AD56]' : ''}`} />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </NextLink>
          );
        })}
      </nav>
    </>
  );
}
