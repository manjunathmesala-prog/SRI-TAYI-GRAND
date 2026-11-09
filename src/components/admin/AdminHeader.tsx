'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  UserPlus,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';

export function AdminHeader() {
  const pathname = usePathname();
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  const fetchCashBalance = async () => {
    try {
      const res = await fetch('/api/admin/cashbook', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success && typeof data.balance === 'number') {
        setCashBalance(data.balance);
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
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format page title from pathname
  const getPageTitle = () => {
    if (pathname === '/admin' || pathname === '/admin/dashboard') return 'Executive Dashboard';
    const segment = pathname.split('/').filter(Boolean).pop();
    if (!segment) return 'Admin Console';
    return segment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-[#241912]/10 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
      {/* Left: Breadcrumbs & Page Title */}
      <div className="flex items-center space-x-3">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-[#43001F]/60">
            Sri Tayi Grand &bull; PMS Console
          </div>
          <h1 className="text-base sm:text-lg font-serif font-bold text-[#241912] leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Live Telemetry, Cash Float & Quick Action Shortcuts */}
      <div className="flex items-center space-x-2 sm:space-x-3">
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
            {isConnected ? 'LIVE SSE' : 'RECONNECTING'}
          </span>
        </div>

        {/* Live Cash Drawer Counter */}
        {cashBalance !== null && (
          <Link
            href="/admin/cashbook"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#43001F]/10 hover:bg-[#43001F]/15 border border-[#43001F]/20 text-[#43001F] text-xs font-mono font-bold transition-all shadow-2xs group"
            title="Front Desk Cash Drawer Balance"
          >
            <Wallet className="w-3.5 h-3.5 text-[#43001F] group-hover:scale-110 transition-transform" />
            <span>₹{cashBalance.toLocaleString('en-IN')}</span>
          </Link>
        )}

        {/* Clock */}
        {currentTime && (
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100/80 border border-stone-200/80 text-stone-600 text-xs font-mono">
            <Clock className="w-3 h-3 text-stone-400" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Quick Walk-In Button */}
        <Link
          href="/admin/front-desk"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Walk-In</span>
        </Link>
      </div>
    </header>
  );
}
