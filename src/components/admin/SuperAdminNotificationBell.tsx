'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SuperAdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationCategoryFilter>('all');
  const [isMuted, setIsMuted] = useState(false);
  const [activeToast, setActiveToast] = useState<SuperAdminNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

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
      const token = authStorage.getToken();
      await fetch('/api/admin/notifications?clearAll=true', {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-staff-role': 'Super Admin',
        },
      });
      setNotifications([]);
      setUnreadCount(0);
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
      {activeToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#D8AD56]/40 p-3.5 animate-in slide-in-from-top-4 duration-300">
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
        </div>
      )}

      {/* 3. SLIDE-OVER NOTIFICATION DRAWER & BACKDROP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div
              ref={drawerRef}
              className="w-screen max-w-md bg-[#FDFBF7] shadow-2xl border-l border-[#241912]/15 flex flex-col animate-in slide-in-from-right duration-300"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 bg-white border-b border-[#241912]/10 flex items-center justify-between shrink-0 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#43001F]">
                      {isTelugu ? 'సూపర్ అడ్మిన్ ఫీడ్' : 'Super Admin Feed'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-serif font-bold text-[#241912]">
                    {isTelugu ? 'లైవ్ టెలిమెట్రీ' : 'Real-Time Telemetry'}
                  </h2>
                </div>

                <div className="flex items-center gap-1">
                  {/* Audio Chime Mute Toggle */}
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isMuted
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                    title={isMuted ? 'Notification chime muted (Click to unmute)' : 'Notification chime active (Click to mute)'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Mark All Read */}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="p-2 rounded-xl hover:bg-[#F8F3E9] border border-transparent hover:border-[#E6D9C5] text-[#43001F] text-xs font-semibold cursor-pointer transition-all"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}

                  {/* Clear All */}
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 text-stone-500 hover:text-rose-600 text-xs cursor-pointer transition-all"
                      title="Clear notification list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Close Drawer */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-800 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="px-4 py-2.5 bg-[#F8F3E9]/60 border-b border-[#241912]/10 overflow-x-auto scrollbar-none flex items-center gap-1.5 shrink-0">
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
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === tab.id
                          ? 'bg-[#43001F] text-white shadow-xs'
                          : 'bg-white text-stone-600 hover:bg-[#F8F3E9] border border-[#241912]/10'
                      }`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Notifications Scroll List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-stone-100">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                      <Bell className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-stone-700">No alerts in this view</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                      All systems operating smoothly. Incoming check-ins, payments, and RFID taps will appear here instantly.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all border ${
                        notif.isRead
                          ? 'bg-white/60 border-stone-200/60 opacity-90'
                          : 'bg-white border-[#D8AD56]/40 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Event Icon Bubble */}
                        <div className="p-2 rounded-xl bg-[#F8F3E9] border border-[#E6D9C5] shrink-0 mt-0.5">
                          {getEventIcon(notif.type, notif.severity)}
                        </div>

                        {/* Text & Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#43001F]">
                              {notif.title}
                            </span>
                            <span className="text-[9px] text-stone-400 font-mono">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-[#241912] leading-relaxed">
                            {notif.message.replace(/^[🟢🔵💰📅💳🚨]\s*/u, '')}
                          </p>

                          {/* Footer Action Links */}
                          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                            {notif.metadata?.deepLink ? (
                              <Link
                                href={notif.metadata.deepLink}
                                onClick={() => {
                                  if (!notif.isRead) handleMarkSingleRead(notif.id);
                                  setIsOpen(false);
                                }}
                                className="inline-flex items-center gap-1 font-bold text-[#43001F] hover:underline"
                              >
                                <span>Navigate to View</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span />
                            )}

                            {!notif.isRead && (
                              <button
                                type="button"
                                onClick={() => handleMarkSingleRead(notif.id)}
                                className="text-stone-400 hover:text-[#43001F] transition-colors cursor-pointer"
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
        </div>
      )}
    </>
  );
}
