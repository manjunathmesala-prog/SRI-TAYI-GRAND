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
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Front Desk', href: '/admin/front-desk', icon: ConciergeBell, highlight: true },
    { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { label: 'Cashbook', href: '/admin/cashbook', icon: Wallet },
    { label: 'Closing', href: '/admin/daily-closing', icon: Lock },
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
                  HOTEL &bull; PMS &bull; KADIRI
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
                <span>{isConnected ? 'LIVE PMS' : 'SYNCING'}</span>
              </div>

              {cashBalance !== null && (
                <NextLink
                  href="/admin/cashbook"
                  prefetch={false}
                  className="px-2 py-0.5 rounded-full bg-[#B18A4A]/15 hover:bg-[#B18A4A]/25 border border-[#B18A4A]/30 text-[#E6D9C5] text-[10px] font-mono font-medium flex items-center gap-1 transition-colors"
                  title="Front Desk Cash Float"
                >
                  <Wallet className="w-3 h-3 text-[#B18A4A]" />
                  <span>₹{cashBalance.toLocaleString('en-IN')}</span>
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
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

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
                                  ? 'text-amber-400'
                                  : 'text-[#B18A4A]'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase">
                              {item.badge}
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

        {/* Desktop Footer / User Profile & Logout */}
        <div className="pt-4 border-t border-[#3a2c1f] space-y-3 mt-4">
          <div className="text-[11px] text-[#E6D9C5]/60 truncate">
            Logged in as <span className="text-white font-medium">{userName}</span>
            <span className="text-[10px] text-[#B18A4A] block">{userRole}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <NextLink
              href="/"
              prefetch={false}
              target="_blank"
              className="text-[11px] text-[#B18A4A] hover:underline flex items-center gap-1"
            >
              <span>Public Website</span>
              <ExternalLink className="w-3 h-3" />
            </NextLink>

            <button
              onClick={handleLogout}
              className="text-xs text-rose-300 hover:text-rose-100 flex items-center space-x-1 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
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
                PMS CONSOLE
              </div>
            </div>
          </NextLink>
        </div>

        {/* Quick Mobile Action Shortcuts */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {cashBalance !== null && (
            <NextLink
              href="/admin/cashbook"
              prefetch={false}
              className="px-2 py-1 rounded-lg bg-black/40 text-amber-300 border border-amber-400/20 text-[10px] font-mono font-semibold max-w-[85px] truncate"
              title="Front Desk Cash Float"
            >
              ₹{cashBalance.toLocaleString('en-IN')}
            </NextLink>
          )}
          <NextLink
            href="/admin/front-desk"
            prefetch={false}
            className="px-2.5 py-1.5 rounded-lg bg-[#8D672F] active:bg-[#6D4E21] text-white text-[10px] uppercase tracking-wider font-semibold shadow-sm flex items-center space-x-1 shrink-0"
          >
            <ConciergeBell className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Front Desk</span>
          </NextLink>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE DRAWER MODAL OVERLAY (< md)                             */}
      {/* ------------------------------------------------------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-[#21180F] text-[#F8F3E9] font-sans p-5 pb-12 safe-area-bottom flex flex-col justify-between shadow-2xl h-full z-10 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#3a2c1f]">
                <div className="flex items-center space-x-2">
                  <Image
                    src="/images/hotel/tayi-grand-logo.png"
                    alt="Sri Tayi Grand"
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                  <div>
                    <div className="text-xs font-serif font-bold text-[#B18A4A] tracking-wider uppercase">
                      SRI TAYI GRAND
                    </div>
                    <div className="text-[9px] text-[#E6D9C5]/80 uppercase tracking-widest font-semibold">
                      KADIRI PMS
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-lg text-[#E6D9C5]/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grouped Navigation in Drawer */}
              <nav className="space-y-4">
                {navSections.map((section) => {
                  const visibleItems = section.items.filter((item) => canAccessRoute(userRole, item.href));
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={section.title} className="space-y-1">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-[#B18A4A]/70 px-2 py-1">
                        {section.title}
                      </div>
                      <div className="space-y-0.5">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          const isActive =
                            pathname === item.href ||
                            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

                          return (
                            <NextLink
                              key={item.href}
                              href={item.href}
                              prefetch={false}
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-medium transition-all ${
                                isActive
                                  ? 'bg-[#8D672F] text-white shadow-md font-semibold'
                                  : item.highlight
                                  ? 'bg-[#B18A4A]/20 text-[#E6D9C5] border border-[#B18A4A]/40 font-semibold'
                                  : 'text-[#E6D9C5]/80 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 shrink-0 ${
                                  item.highlight ? 'text-amber-400' : 'text-[#B18A4A]'
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </NextLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-[#3a2c1f] space-y-3">
              <div className="text-[11px] text-[#E6D9C5]/60 truncate">
                Logged in as <span className="text-white font-medium">{userName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <NextLink
                  href="/"
                  prefetch={false}
                  target="_blank"
                  className="text-[11px] text-[#B18A4A] flex items-center gap-1"
                >
                  <span>Public Site</span>
                  <ExternalLink className="w-3 h-3" />
                </NextLink>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-300 flex items-center space-x-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (< md)                            */}
      {/* ------------------------------------------------------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#21180F]/95 backdrop-blur-md border-t border-[#3a2c1f] min-h-[3.75rem] px-2 py-1 flex items-center justify-around shadow-2xl safe-area-bottom font-sans">
        {bottomBarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <NextLink
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 text-[10px] tracking-tight transition-all active:scale-95 ${
                isActive
                  ? 'text-[#B18A4A] font-bold'
                  : item.highlight
                  ? 'text-amber-300 font-semibold'
                  : 'text-[#E6D9C5]/70 active:text-white'
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-0.5 ${
                  isActive
                    ? 'text-[#B18A4A]'
                    : item.highlight
                    ? 'text-amber-300'
                    : 'text-[#E6D9C5]/70'
                }`}
              />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </NextLink>
          );
        })}
      </nav>
    </>
  );
}
