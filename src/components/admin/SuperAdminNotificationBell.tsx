'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Bell,
  Volume2,
  VolumeX,
  CheckCheck,
  Trash2,
  X,
  CreditCard,
  Building,
  UserCheck,
  UserMinus,
  Calendar,
  KeyRound,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  SuperAdminNotification,
  NotificationCategoryFilter,
  NotificationSeverity,
  NotificationEventType,
} from '@/lib/notifications/types';
import { playNotificationChime } from '@/lib/notifications/audio';
import { authStorage } from '@/lib/auth-storage';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';

export function SuperAdminNotificationBell() {
  const { t, isTelugu } = useAdminLanguage();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationCategoryFilter>('all');
  const [isMuted, setIsMuted] = useState(false);
  const [activeToast, setActiveToast] = useState<SuperAdminNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Initialize sound mute preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('stg_notif_sound_muted') === 'true';
      setIsMuted(savedMute);
    }
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('stg_notif_sound_muted', String(next));
    if (!next) {
      // Audible feedback when activating audio chime
      playNotificationChime('INFO');
    }
  };

  // Fetch initial notifications
  const fetchNotifications = useCallback(async (category: string = 'all') => {
    try {
      const token = authStorage.getToken();
      const res = await fetch(`/api/admin/notifications?category=${category}&limit=50`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-staff-role': 'Super Admin',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      }
    } catch {
      // Quiet fail on network hiccups
    }
  }, []);

  // Fetch notifications on activeTab change
  useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab, fetchNotifications]);

  // Connect to dedicated Super Admin SSE stream
  useEffect(() => {
    fetchNotifications('all');

    const token = authStorage.getToken() || '';
    // Append token query param for SSE auth if cookies aren't shared
    const streamUrl = `/api/admin/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(streamUrl);

        eventSource.addEventListener('connected', () => {
          // Handshake confirmed
        });

        eventSource.addEventListener('notification', (e) => {
          try {
            const notif = JSON.parse(e.data) as SuperAdminNotification;

            // 1. Prepend to state
            setNotifications((prev) => [notif, ...prev.filter((item) => item.id !== notif.id)]);
            setUnreadCount((c) => c + 1);

            // 2. Play procedural hotel chime
            playNotificationChime(notif.severity);

            // 3. Show floating toast alert
            setActiveToast(notif);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 6000);
          } catch (err) {
            console.error('Failed to parse SSE notification payload:', err);
          }
        });

        eventSource.onerror = () => {
          if (eventSource) eventSource.close();
          // Auto reconnect in 5s
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch {
        reconnectTimer = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchNotifications]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const token = authStorage.getToken();
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({ action: 'mark_read', markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  // Mark single as read
  const handleMarkSingleRead = async (id: string) => {
    try {
      const token = authStorage.getToken();
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  // Clear all
  const handleClearAll = async () => {
    try {
      await fetch('/api/admin/notifications?clearAll=true', {
        method: 'DELETE',
        headers: authStorage.getAuthHeaders({ 'x-staff-role': 'Super Admin' }),
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  // Dismiss single notification
  const handleDismissNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/admin/notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authStorage.getAuthHeaders({ 'x-staff-role': 'Super Admin' }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  // Event icon selector
  const getEventIcon = (type: NotificationEventType, severity: NotificationSeverity) => {
    switch (type) {
      case 'EVENT_CHECK_IN':
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case 'EVENT_CHECK_OUT':
        return <UserMinus className="w-4 h-4 text-blue-600" />;
      case 'EVENT_TRANSACTION':
        return severity === 'CRITICAL' ? (
          <ShieldAlert className="w-4 h-4 text-rose-600" />
        ) : (
          <CreditCard className="w-4 h-4 text-amber-600" />
        );
      case 'EVENT_NEW_BOOKING':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'EVENT_RFID_TAP':
        return severity === 'WARNING' ? (
          <ShieldAlert className="w-4 h-4 text-amber-600" />
        ) : (
          <KeyRound className="w-4 h-4 text-cyan-600" />
        );
      default:
        return <Sparkles className="w-4 h-4 text-stone-500" />;
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 15) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* 1. BELL ICON BUTTON WITH PULSING UNREAD BADGE */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Super Admin Notifications"
        className="relative p-2 rounded-xl bg-white hover:bg-[#F8F3E9] border border-[#241912]/10 text-[#241912] transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group"
        title="Super Admin Real-Time Event Feed"
      >
        <Bell className="w-4 h-4 text-[#43001F] group-hover:rotate-12 transition-transform duration-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-xs animate-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. FLOATING REAL-TIME TOAST BANNER (TOP-RIGHT) */}
      {mounted && typeof document !== 'undefined' && activeToast && createPortal(
        <div className="fixed top-16 right-4 sm:right-6 z-[120] max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#D8AD56]/40 p-3.5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#F8F3E9] border border-[#E6D9C5] shrink-0">
              {getEventIcon(activeToast.type, activeToast.severity)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#43001F]">
                  {activeToast.title}
                </span>
                <span className="text-[9px] text-stone-500 font-mono">
                  {formatTimeAgo(activeToast.createdAt)}
                </span>
              </div>
              <p className="text-xs font-medium text-[#241912] leading-snug line-clamp-2">
                {activeToast.message.replace(/^[🟢🔵💰📅💳🚨]\s*/u, '')}
              </p>
              {activeToast.metadata?.deepLink && (
                <Link
                  href={activeToast.metadata.deepLink}
                  onClick={() => setActiveToast(null)}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#43001F] hover:underline"
                >
                  <span>Open Details</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 3. SLIDE-OVER NOTIFICATION DRAWER & BACKDROP */}
      {mounted && typeof document !== 'undefined' && isOpen && createPortal(
        <div className="fixed inset-0 z-[100] overflow-hidden" aria-modal="true" role="dialog">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 pointer-events-none">
            <div
              ref={drawerRef}
              className="pointer-events-auto w-screen max-w-md sm:max-w-lg bg-[#FAF7F2] shadow-2xl border-l border-[#D8AD56]/30 flex flex-col h-full animate-in slide-in-from-right duration-300"
            >
              {/* 1. DRAWER HEADER (Pure luxury styling matching reference) */}
              <div className="px-5 py-4 sm:py-5 bg-[#FAF7F2] border-b border-[#241912]/8 flex items-center justify-between shrink-0">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="block text-[11px] uppercase font-bold tracking-[0.18em] text-[#43001F]">
                      {isTelugu ? 'సూపర్ అడ్మిన్ ఫీడ్' : 'SUPER ADMIN FEED'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#43001F]/8 text-[#43001F] border border-[#43001F]/15">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#241912] leading-tight mt-1 truncate">
                    {isTelugu ? 'లైవ్ టెలిమెట్రీ' : 'Real-Time Telemetry'}
                  </h2>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Audio Chime Mute Toggle - exact mint green rounded square/pill styling from screenshot */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`w-11 h-11 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shadow-2xs active:scale-95 ${
                      isMuted
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                        : 'bg-[#E8F8F0] border-[#A7E6C5] text-[#0E7044] hover:bg-[#D4F4E4]'
                    }`}
                    title={isMuted ? 'Notification chime muted (Click to unmute)' : 'Notification chime active (Click to mute)'}
                    aria-label="Toggle notification chime"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {/* Close Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 rounded-xl hover:bg-black/5 text-stone-500 hover:text-stone-800 cursor-pointer transition-colors flex items-center justify-center active:scale-95"
                    aria-label="Close notifications drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. CATEGORY FILTER TABS (Strictly hidden scrollbar, no brown track, smooth horizontal touch-scrolling) */}
              <div className="relative bg-[#FAF6EF] border-b border-[#241912]/8 shrink-0">
                <div
                  className="px-5 py-3 overflow-x-auto no-scrollbar touch-scroll [&::-webkit-scrollbar]:hidden flex items-center gap-2"
                  data-no-scrollbar="true"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {(
                    [
                      { id: 'all', label: 'All Alerts', icon: Bell },
                      { id: 'financials', label: 'Financials', icon: CreditCard },
                      { id: 'check_in_out', label: 'Check-Ins/Outs', icon: Building },
                      { id: 'rfid_taps', label: 'RFID Taps', icon: KeyRound },
                      { id: 'bookings', label: 'Bookings', icon: Calendar },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border shadow-2xs active:scale-95 shrink-0 ${
                          isActive
                            ? 'bg-[#43001F] text-white border-[#43001F] shadow-xs'
                            : 'bg-white text-[#241912]/85 hover:bg-[#FDFBF7] border-stone-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Soft right edge gradient fade on narrow mobile screens */}
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#FAF6EF] to-transparent sm:hidden" />
              </div>

              {/* 3. STATUS & SUB-ACTIONS STRIP */}
              <div className="px-5 py-2.5 bg-[#FAF7F2]/90 border-b border-[#241912]/6 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span className="text-[11px] font-semibold text-stone-700 truncate">
                    Live Feed
                  </span>
                  {unreadCount > 0 ? (
                    <span className="text-[10px] font-bold text-[#43001F] bg-[#43001F]/8 px-2 py-0.5 rounded-full border border-[#43001F]/15 shrink-0">
                      {unreadCount} unread
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500 shrink-0">
                      (All caught up)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Mark All Read */}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-black/5 text-[11px] font-bold text-[#43001F] transition-colors cursor-pointer active:scale-95"
                      title="Mark all notifications as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}

                  {/* Clear All */}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="p-1 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer active:scale-95"
                      title="Clear notification list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4. NOTIFICATIONS SCROLL LIST */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#FAF7F2]/40">
                {notifications.length === 0 ? (
                  <div className="text-center py-20 px-6">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-[#D8AD56]/30 shadow-xs flex items-center justify-center mx-auto mb-4 text-[#D8AD56]">
                      <Bell className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-serif font-bold text-[#241912]">No activity to report</h3>
                    <p className="text-xs text-stone-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                      All hotel operations running smoothly. Incoming guest check-ins, financial receipts, and keycard taps will stream here live.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3.5 sm:p-4 rounded-2xl transition-all border relative overflow-hidden group ${
                        notif.isRead
                          ? 'bg-white/80 border-stone-200/80 opacity-90 hover:opacity-100 hover:bg-white shadow-2xs'
                          : 'bg-white border-[#D8AD56]/60 shadow-xs ring-1 ring-[#D8AD56]/20'
                      }`}
                    >
                      {/* Left vertical accent on unread cards */}
                      {!notif.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#D8AD56] to-[#43001F] rounded-l-2xl" />
                      )}

                      <div className="flex items-start gap-3.5">
                        {/* Event Icon Bubble */}
                        <div className="w-10 h-10 rounded-2xl bg-[#F8F3E9] border border-[#E6D9C5] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          {getEventIcon(notif.type, notif.severity)}
                        </div>

                        {/* Text & Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-[#43001F] truncate">
                                {notif.title}
                              </span>
                              {!notif.isRead && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#43001F]/10 text-[#43001F] uppercase">
                                  NEW
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-stone-400 font-mono">
                                {formatTimeAgo(notif.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleDismissNotification(notif.id, e)}
                                className="p-1 rounded-md text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                                title="Dismiss notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs sm:text-[13px] font-medium text-[#241912] leading-relaxed">
                            {notif.message.replace(/^[🟢🔵💰📅💳🚨]\s*/u, '')}
                          </p>

                          {/* Metadata chips */}
                          {notif.metadata && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {notif.metadata.roomNumber && (
                                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-[10px] font-bold text-stone-700">
                                  Room {notif.metadata.roomNumber}
                                </span>
                              )}
                              {notif.metadata.amount && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                                  ₹{Number(notif.metadata.amount).toLocaleString('en-IN')}
                                </span>
                              )}
                              {notif.metadata.bookingReference && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-[10px] font-mono font-semibold text-purple-700 border border-purple-200">
                                  #{notif.metadata.bookingReference}
                                </span>
                              )}
                              {notif.metadata.cardType && (
                                <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-[10px] font-semibold text-cyan-800 border border-cyan-200">
                                  {notif.metadata.cardType}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Footer Action Links */}
                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                            {notif.metadata?.deepLink ? (
                              <Link
                                href={notif.metadata.deepLink}
                                onClick={() => {
                                  if (!notif.isRead) handleMarkSingleRead(notif.id);
                                  setIsOpen(false);
                                }}
                                className="inline-flex items-center gap-1.5 font-bold text-[#43001F] hover:text-[#7A1542] hover:underline"
                              >
                                <span>Open Details</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span />
                            )}

                            {!notif.isRead && (
                              <button
                                type="button"
                                onClick={() => handleMarkSingleRead(notif.id)}
                                className="text-stone-400 hover:text-[#43001F] font-medium transition-colors cursor-pointer text-[11px]"
                                title="Mark as read"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
