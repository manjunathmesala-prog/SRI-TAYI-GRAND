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
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('Admin Console');
  const [userRole, setUserRole] = useState('Super Admin');

  // Real-time synchronization connection hook
  const { status, isConnected } = useRealtimeSync();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('stg_user_name');
      const storedRole = localStorage.getItem('stg_role');
      if (storedName) setUserName(storedName);
      if (storedRole) setUserRole(storedRole);
    }
  }, []);

  // If on login page, don't show admin sidebar
  if (pathname === '/admin/login') {
    return null;
  }

  const menuItems = [
    { label: 'Dashboard Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Front Desk / Reception', href: '/admin/front-desk', icon: ConciergeBell, highlight: true },
    { label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { label: 'Room Inventory', href: '/admin/rooms/inventory', icon: BedDouble },
    { label: 'Room Categories', href: '/admin/rooms/categories', icon: Layers },
    { label: 'Housekeeping', href: '/admin/housekeeping', icon: Sparkles },
    { label: 'Guests', href: '/admin/guests', icon: Users },
    { label: 'Payments & Revenue', href: '/admin/payments', icon: CreditCard },
    { label: 'Convention Hall Enquiries', href: '/admin/convention-hall', icon: Building },
    { label: 'RFID Door Keycards', href: '/admin/rfid', icon: KeyRound, badge: 'Hardware' },
    { label: 'Guest Reviews', href: '/admin/reviews', icon: MessageSquareQuote },
    { label: 'Staff & Roles', href: '/admin/staff', icon: UserCog },
    { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    localStorage.removeItem('stg_token');
    localStorage.removeItem('stg_role');
    localStorage.removeItem('stg_user_name');
    router.push('/admin/login');
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-[#25150F] text-white px-4 py-3 flex items-center justify-between border-b border-[#D8AD56]/20 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 rounded-full border border-[#D8AD56] overflow-hidden bg-[#382216] shrink-0">
            <Image
              src="/images/hotel/tayi-grand-logo.jpg"
              alt="Sri Tayi Grand Logo"
              fill
              sizes="28px"
              className="object-cover"
            />
          </div>
          <span className="font-serif font-bold text-sm tracking-wide">Sri Tayi Grand Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
            }`}
            title={`Real-Time Sync: ${status}`}
          />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded text-[#D8AD56] hover:bg-white/10"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#25150F] text-[#EFE3D6] flex flex-col justify-between border-r border-[#D8AD56]/20 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <NextLink href="/admin/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 rounded-full border border-[#D8AD56] overflow-hidden bg-[#382216] shadow-sm shrink-0">
                <Image
                  src="/images/hotel/tayi-grand-logo.jpg"
                  alt="Sri Tayi Grand Logo"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div>
                <span className="font-serif font-bold text-base text-white tracking-wide block leading-none">
                  Sri Tayi Grand
                </span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#D8AD56] font-semibold mt-1 block">
                  HOTEL MANAGEMENT SAAS
                </span>
              </div>
            </NextLink>

            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Status Indicator Pill */}
          <div className="px-4 pt-3 pb-1">
            <div
              className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-semibold border ${
                isConnected
                  ? 'bg-green-950/40 text-green-300 border-green-800/60'
                  : status === 'reconnecting'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                  : 'bg-red-950/40 text-red-300 border-red-800/60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {isConnected
                    ? 'Real-Time Sync Active'
                    : status === 'reconnecting'
                    ? 'Reconnecting Stream...'
                    : 'Sync Connecting...'}
                </span>
              </div>
              <Radio className="w-3 h-3 opacity-60" />
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#382216] text-[#D8AD56] font-semibold shadow-sm border border-[#D8AD56]/30'
                      : 'text-[#EFE3D6]/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#D8AD56]' : 'text-white/60'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/30">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D8AD56]" />
                  )}
                </NextLink>
              );
            })}
          </nav>
        </div>

        {/* Footer: Public Site Link & User Profile */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#1D100B]">
          <NextLink
            href="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#EFE3D6]/80 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span>Public Website</span>
            </span>
            <ExternalLink className="w-3 h-3 text-white/50" />
          </NextLink>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#382216] border border-[#D8AD56]/50 flex items-center justify-center text-[11px] font-bold text-[#D8AD56]">
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate max-w-[120px]">
                <span className="text-xs font-semibold text-white block leading-tight truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-[#D8AD56] block truncate">{userRole}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded text-white/50 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
