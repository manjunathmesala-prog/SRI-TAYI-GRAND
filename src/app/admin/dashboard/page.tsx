'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  BedDouble,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  ConciergeBell,
  Radio,
  RefreshCw,
  X,
  ShieldCheck,
  KeyRound,
  Wrench,
  Eye,
  Check,
  Wallet,
  UserPlus,
  Phone,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import { PhysicalRoom, Booking, PaymentRecord, RoomCategory } from '@/types';
import { useRealtimeSync, adminOperations, cashbookClient } from '@/lib/realtime-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { authStorage } from '@/lib/auth-storage';
import { normalizeRole, RoleEnum } from '@/lib/rbac/types';
import { playChimeSound } from '@/lib/rfid/bridge-client';
import { StatutoryWalkInModal } from '@/components/admin/StatutoryWalkInModal';
import { UnifiedShiftControl } from '@/components/admin/UnifiedShiftControl';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t, translateStatus, formatCurrency, formatDate, isTelugu } = useAdminLanguage();

  // Role and Identity State
  const [userRole, setUserRole] = useState<RoleEnum>(() => {
    if (typeof window !== 'undefined') {
      const activeRole = authStorage.getRole();
      if (activeRole) return normalizeRole(activeRole);
    }
    return 'STAFF';
  });
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return authStorage.getUserName() || 'Staff';
    }
    return 'Staff';
  });
  const [userRoleString, setUserRoleString] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return authStorage.getRole() || 'Front Desk';
    }
    return 'Front Desk';
  });

  // Filter State
  const [filterPeriod, setFilterPeriod] = useState<'Today' | 'Last 7 Days' | 'This Month'>('Today');

  // Authoritative State
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & Interactive Overlays
  const [selectedRoom, setSelectedRoom] = useState<PhysicalRoom | null>(null);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInPreselectedRoom, setWalkInPreselectedRoom] = useState<string | undefined>(undefined);
  const [walkInPreselectedCategory, setWalkInPreselectedCategory] = useState<string | undefined>(undefined);

  // Live Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Sync role and claims
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeRole = authStorage.getRole();
      const activeName = authStorage.getUserName();
      if (activeRole) {
        setUserRole(normalizeRole(activeRole));
        setUserRoleString(activeRole);
      }
      if (activeName) {
        setUserName(activeName);
      }
    }
  }, []);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isManager = userRole === 'MANAGER';
  const isStaff = userRole === 'STAFF';
  const canViewRevenue = isSuperAdmin || isManager;

  // Authoritative Data Fetch
  const fetchDashboardData = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const state = await adminOperations.fetchFullState(force);
      if (state && state.success) {
        setRooms(state.rooms || []);
        setCategories(state.categories || []);
        setBookings(state.bookings || []);
        setPayments(state.payments || []);
        if (typeof state.cashBalance === 'number') {
          setCashBalance(state.cashBalance);
        }
      }

      // Also ensure fresh cash drawer count
      const freshCash = await cashbookClient.getBalance(force);
      if (typeof freshCash === 'number') {
        setCashBalance(freshCash);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to sync live metrics', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time synchronization
  const { isConnected, status } = useRealtimeSync({
    onRefresh: () => fetchDashboardData(true),
    onEvent: (event) => {
      if (
        event.eventType === 'booking_created' ||
        event.eventType === 'booking_updated' ||
        event.eventType === 'check_in' ||
        event.eventType === 'check_out' ||
        event.eventType === 'housekeeping_updated' ||
        event.eventType === 'room_status_changed' ||
        event.eventType === 'payment_recorded' ||
        event.eventType === 'cash_transaction_created'
      ) {
        fetchDashboardData(true);
      }
    },
  });

  // Calculate IST Today String (Kadiri, AP)
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  }, []);

  // Filter Bookings by Selected Period
  const filteredBookings = useMemo(() => {
    if (filterPeriod === 'Today') {
      return bookings.filter((b) => {
        const createdStr = b.created_at ? b.created_at.slice(0, 10) : '';
        const checkInStr = b.check_in_date ? b.check_in_date.slice(0, 10) : '';
        const checkOutStr = b.check_out_date ? b.check_out_date.slice(0, 10) : '';
        return (
          createdStr === todayStr ||
          checkInStr === todayStr ||
          (checkInStr <= todayStr && checkOutStr >= todayStr)
        );
      });
    }

    if (filterPeriod === 'Last 7 Days') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const minDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(pastDate);
      return bookings.filter((b) => {
        const checkInStr = b.check_in_date ? b.check_in_date.slice(0, 10) : '';
        const createdStr = b.created_at ? b.created_at.slice(0, 10) : '';
        return checkInStr >= minDateStr || createdStr >= minDateStr;
      });
    }

    if (filterPeriod === 'This Month') {
      const currentMonth = todayStr.slice(0, 7); // YYYY-MM
      return bookings.filter((b) => {
        const checkInStr = b.check_in_date ? b.check_in_date.slice(0, 7) : '';
        const createdStr = b.created_at ? b.created_at.slice(0, 7) : '';
        return checkInStr === currentMonth || createdStr === currentMonth;
      });
    }

    return bookings;
  }, [bookings, filterPeriod, todayStr]);

  // Filter Payments by Selected Period
  const filteredPayments = useMemo(() => {
    if (filterPeriod === 'Today') {
      return payments.filter((p) => {
        const paidStr = p.paid_at ? p.paid_at.slice(0, 10) : '';
        return paidStr === todayStr;
      });
    }

    if (filterPeriod === 'Last 7 Days') {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const minDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(pastDate);
      return payments.filter((p) => {
        const paidStr = p.paid_at ? p.paid_at.slice(0, 10) : '';
        return paidStr >= minDateStr;
      });
    }

    if (filterPeriod === 'This Month') {
      const currentMonth = todayStr.slice(0, 7);
      return payments.filter((p) => {
        const paidStr = p.paid_at ? p.paid_at.slice(0, 7) : '';
        return paidStr === currentMonth;
      });
    }

    return payments;
  }, [payments, filterPeriod, todayStr]);

  // Operational Room Metrics
  const totalRooms = rooms.length || 25;
  const occupiedRooms = rooms.filter((r) => r.operational_status === 'occupied').length;
  const reservedRooms = rooms.filter((r) => r.operational_status === 'reserved').length;
  const availableRooms = rooms.filter((r) => r.operational_status === 'available').length;
  const cleaningRooms = rooms.filter((r) => r.operational_status === 'cleaning').length;
  const maintenanceRooms = rooms.filter((r) => r.operational_status === 'maintenance').length;

  const occupancyRate =
    totalRooms > 0 ? Math.round(((occupiedRooms + reservedRooms) / totalRooms) * 100) : 0;

  // Bookings metrics based on active filter
  const checkedInCount = filteredBookings.filter((b) => b.status === 'checked_in').length;
  const confirmedArrivals = filteredBookings.filter((b) => b.status === 'confirmed').length;

  // Financial Metrics
  const totalPeriodRevenue = filteredBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  const totalPeriodCollections = filteredPayments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Counter Desk Collections (Today's Cash + UPI collected at front desk)
  const todayDeskCollections = useMemo(() => {
    return payments
      .filter((p) => {
        const pDate = p.paid_at ? p.paid_at.slice(0, 10) : '';
        return pDate === todayStr && p.status === 'successful';
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments, todayStr]);

  // Recent Bookings List
  const recentBookings = useMemo(() => {
    return filteredBookings.slice(0, 8);
  }, [filteredBookings]);

  // Handle Quick Room Inspection / Cleaning Status Update
  const handleUpdateRoomHousekeeping = async (
    roomId: string,
    targetOpStatus: 'available' | 'cleaning' | 'maintenance',
    targetHkStatus: 'clean' | 'dirty' | 'inspected'
  ) => {
    setActionLoading(true);
    try {
      const res = await adminOperations.updateHousekeeping({
        roomId,
        housekeepingStatus: targetHkStatus,
        operationalStatus: targetOpStatus,
        staffName: userName,
        notes: `Quick dashboard update by ${userName} (${userRoleString})`,
      });

      if (res && res.success) {
        playChimeSound(true);
        showToast(
          isTelugu
            ? `గది స్థితి విజయవంతంగా అప్‌డేట్ చేయబడింది (${targetOpStatus === 'available' ? 'సిద్ధంగా ఉంది' : targetOpStatus})`
            : `Room status updated to ${targetOpStatus === 'available' ? 'Clean & Available' : targetOpStatus}`,
          'success'
        );

        // Optimistically update local room state
        setRooms((prev) =>
          prev.map((r) =>
            r.id === roomId
              ? { ...r, operational_status: targetOpStatus, housekeeping_status: targetHkStatus }
              : r
          )
        );
        setSelectedRoom((prev) =>
          prev && prev.id === roomId
            ? { ...prev, operational_status: targetOpStatus, housekeeping_status: targetHkStatus }
            : prev
        );
      }
    } catch (err: any) {
      playChimeSound(false);
      showToast(err?.message || 'Failed to update room housekeeping status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Launch Walk-In Check-In for selected room
  const handleOpenWalkInForRoom = (room: PhysicalRoom) => {
    setWalkInPreselectedRoom(room.room_number);
    setWalkInPreselectedCategory(room.category_id);
    setSelectedRoom(null);
    setWalkInModalOpen(true);
  };

  // Filter Buttons Configuration
  const filterOptions = [
    { id: 'Today' as const, label: t('common.today', 'Today') },
    { id: 'Last 7 Days' as const, label: t('reports.last7Days', 'Last 7 Days') },
    { id: 'This Month' as const, label: t('reports.thisMonth', 'This Month') },
  ];

  // Role-Aware Quick Action Shortcuts
  const getShortcutsForRole = () => {
    if (isStaff) {
      return [
        {
          title: t('frontDesk.title', 'Walk-In & Check-In Desk'),
          subtitle: isTelugu ? 'కీకార్డ్ ఎన్‌కోడింగ్ & ఫోలియోలు' : 'Keycard encoding & guest folios',
          href: '/admin/front-desk',
          icon: ConciergeBell,
          color: 'text-[#8D672F] bg-[#B18A4A]/10 group-hover:bg-[#8D672F] group-hover:text-white',
        },
        {
          title: isTelugu ? 'రూమ్ టేప్ చార్ట్ & బోర్డు' : 'Room Status & Tape Chart',
          subtitle: isTelugu ? 'అంతస్తులు 1, 2, 3 పూర్తి స్థితి' : 'Live tape chart across all floors',
          href: '/admin/rooms/board',
          icon: Layers,
          color: 'text-[#1565C0] bg-blue-50 group-hover:bg-[#1565C0] group-hover:text-white',
        },
        {
          title: t('nav.rfid', 'RFID Keycard Station'),
          subtitle: isTelugu ? 'కార్డుల జారీ & హార్డ్‌వేర్ రీచెక్' : 'Issue guest cards & verify bridge',
          href: '/admin/rfid',
          icon: KeyRound,
          color: 'text-[#2E7D32] bg-emerald-50 group-hover:bg-[#2E7D32] group-hover:text-white',
        },
        {
          title: t('housekeeping.title', 'Housekeeping Turnover'),
          subtitle: isTelugu ? 'పారిశుధ్య నిర్వహణ & తనిఖీ' : 'Sanitization tracking & turnover',
          href: '/admin/housekeeping',
          icon: Sparkles,
          color: 'text-[#E65100] bg-amber-50 group-hover:bg-[#E65100] group-hover:text-white',
        },
        {
          title: t('nav.guests', 'Guests Directory (CRM)'),
          subtitle: isTelugu ? 'ప్రభుత్వ గుర్తింపు & పోలీస్ ఫారమ్ C' : 'Statutory ID verification & CRM',
          href: '/admin/guests',
          icon: ShieldCheck,
          color: 'text-[#6A1B9A] bg-purple-50 group-hover:bg-[#6A1B9A] group-hover:text-white',
        },
      ];
    }

    if (isManager) {
      return [
        {
          title: t('frontDesk.title', 'Walk-In & Front Desk'),
          subtitle: isTelugu ? 'వాక్-ఇన్, కీకార్డులు & ఫోలియోలు' : 'Walk-in registration & room folios',
          href: '/admin/walk-in',
          icon: ConciergeBell,
          color: 'text-[#8D672F] bg-[#B18A4A]/10 group-hover:bg-[#8D672F] group-hover:text-white',
        },
        {
          title: isTelugu ? 'సిబ్బంది హాజరు & షిఫ్ట్‌లు' : 'Staff Attendance (Clock In/Out)',
          subtitle: isTelugu ? 'రోజువారీ హాజరు & పని గంటలు' : 'Clock-in, clock-out & roster shifts',
          href: '/admin/staff/attendance',
          icon: Users,
          color: 'text-[#2E7D32] bg-emerald-50 group-hover:bg-[#2E7D32] group-hover:text-white',
        },
        {
          title: isTelugu ? 'నిర్వహణ ఖర్చులు' : 'Operating Expenditure',
          subtitle: isTelugu ? 'హోటల్ రోజువారీ ఖర్చులు & వోచర్లు' : 'Daily expenses & cashbook vouchers',
          href: '/admin/expenses',
          icon: CreditCard,
          color: 'text-[#C62828] bg-rose-50 group-hover:bg-[#C62828] group-hover:text-white',
        },
        {
          title: isTelugu ? 'కన్వెన్షన్ హాల్ & ఈవెంట్లు' : 'Convention Hall & Functions',
          subtitle: isTelugu ? 'ఈవెంట్ బుకింగ్‌లు & విచారణలు' : 'Function hall bookings & banquet leads',
          href: '/admin/convention-hall',
          icon: Building,
          color: 'text-[#E65100] bg-amber-50 group-hover:bg-[#E65100] group-hover:text-white',
        },
        {
          title: isTelugu ? 'నైట్ ఆడిట్ & రోజువారీ క్లోజింగ్' : 'Night Audit & Daily Closing',
          subtitle: isTelugu ? 'షిఫ్ట్ ముగింపు & లెడ్జర్ లాక్' : 'Shift reconcile & lock financial day',
          href: '/admin/night-audit',
          icon: FileText,
          color: 'text-[#1565C0] bg-blue-50 group-hover:bg-[#1565C0] group-hover:text-white',
        },
        {
          title: isTelugu ? 'జనరల్ లెడ్జర్ ERP' : 'General Ledger Accounting',
          subtitle: isTelugu ? 'జర్నల్ ఎంట్రీలు & ఖాతాలు' : 'ERP accounts & journal entries',
          href: '/admin/accounting',
          icon: TrendingUp,
          color: 'text-[#6A1B9A] bg-purple-50 group-hover:bg-[#6A1B9A] group-hover:text-white',
        },
      ];
    }

    // Super Admin Exclusive Shortcuts
    return [
      {
        title: t('frontDesk.title', 'Front Desk Operations'),
        subtitle: isTelugu ? 'వాక్-ఇన్, కీకార్డులు & ఫోలియోలు' : 'Front desk & check-in flow',
        href: '/admin/front-desk',
        icon: ConciergeBell,
        color: 'text-[#8D672F] bg-[#B18A4A]/10 group-hover:bg-[#8D672F] group-hover:text-white',
      },
      {
        title: isTelugu ? 'ఎగ్జిక్యూటివ్ అనలిటిక్స్' : 'Executive Analytics & RevPAR',
        subtitle: isTelugu ? 'ఆదాయ విశ్లేషణ & ఈల్డ్ పోకడలు' : 'Yield, ADR, RevPAR & monthly trajectory',
        href: '/admin/analytics',
        icon: TrendingUp,
        color: 'text-[#1565C0] bg-blue-50 group-hover:bg-[#1565C0] group-hover:text-white',
      },
      {
        title: isTelugu ? 'జనరల్ లెడ్జర్ ERP' : 'General Ledger Accounting',
        subtitle: isTelugu ? 'జర్నల్ ఎంట్రీలు & GST నివేదికలు' : 'ERP accounts & financial export',
        href: '/admin/accounting',
        icon: CreditCard,
        color: 'text-[#6A1B9A] bg-purple-50 group-hover:bg-[#6A1B9A] group-hover:text-white',
      },
      {
        title: isTelugu ? 'డైనమిక్ రూమ్ ధరలు' : 'Dynamic Pricing & Tariffs',
        subtitle: isTelugu ? 'కాలానుగుణ ధరలు & ఈల్డ్ నిర్వహణ' : 'Yield management & season rates',
        href: '/admin/pricing',
        icon: Building,
        color: 'text-[#E65100] bg-amber-50 group-hover:bg-[#E65100] group-hover:text-white',
      },
      {
        title: isTelugu ? 'సిస్టమ్ సెట్టింగ్‌లు & API' : 'Hotel Master Settings',
        subtitle: isTelugu ? 'సిస్టమ్ కన్ఫిగరేషన్ & గేట్‌వే' : 'Hotel settings, cloud & integrations',
        href: '/admin/settings',
        icon: ShieldCheck,
        color: 'text-[#2E7D32] bg-emerald-50 group-hover:bg-[#2E7D32] group-hover:text-white',
      },
    ];
  };

  // Find active booking for a specific room if occupied
  const getActiveStayForRoom = (room: PhysicalRoom): Booking | undefined => {
    return bookings.find(
      (b) =>
        (b.assigned_room_number === room.room_number || b.assigned_room_id === room.id) &&
        b.status === 'checked_in'
    );
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-[#2E7D32] text-white border-green-600'
              : toastMessage.type === 'error'
              ? 'bg-[#C62828] text-white border-red-600'
              : 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]/40'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          ) : (
            <Sparkles className="w-4 h-4 shrink-0 text-[#D8AD56]" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 p-0.5 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Refined Luxury Operational Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E6D9C5]/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] tracking-tight">
              {t('dashboard.title', 'Operational Overview')}
            </h1>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
              title={isConnected ? 'Live Telemetry Active' : 'Connecting to Telemetry'}
            />
          </div>
          <p className="text-xs text-[#786A5B] mt-0.5 font-light">
            {isTelugu
              ? `${userName} (${userRoleString}) • ${formatDate(new Date(), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}`
              : `Welcome back, ${userName} • ${formatDate(new Date(), {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}`}
          </p>
        </div>

        {/* Action Controls & Interactive Date Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="inline-flex rounded-full p-1 bg-white border border-[#E6D9C5] shadow-[0_2px_8px_rgba(33,24,15,0.03)]">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFilterPeriod(opt.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  filterPeriod === opt.id
                    ? 'bg-[#8D672F] text-white shadow-xs font-semibold'
                    : 'text-[#786A5B] hover:text-[#2A1D13]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            className="p-2 rounded-full bg-white border border-[#E6D9C5] text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5] transition-all cursor-pointer shadow-[0_2px_8px_rgba(33,24,15,0.03)]"
            title={t('common.refresh', 'Refresh Data')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8D672F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Unified Manager Shift & Shared Cash Drawer Hero Controller */}
      <UnifiedShiftControl onShiftStateChange={() => fetchDashboardData(true)} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        {/* Card 1: Occupancy Rate */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-4 sm:p-5 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:shadow-[0_8px_30px_rgba(33,24,15,0.06)] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8D7D71]">
              {t('dashboard.occupancyRate', 'Occupancy Rate')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5]/60 text-[#8D672F] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tabular-nums">{occupancyRate}%</span>
            <span className="text-xs text-[#2E7D32] font-semibold">
              {occupiedRooms + reservedRooms} / {totalRooms} {isTelugu ? 'గదులు' : 'Rooms'}
            </span>
          </div>
          <div className="w-full bg-[#FAF8F5] h-1.5 rounded-full mt-3 overflow-hidden border border-[#E6D9C5]/40">
            <div
              className="bg-[#8D672F] h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Card 2: Current In-House Guests */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-4 sm:p-5 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:shadow-[0_8px_30px_rgba(33,24,15,0.06)] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8D7D71]">
              {t('frontDesk.currentInHouse', 'In-House Guests')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5]/60 text-[#1565C0] flex items-center justify-center">
              <ConciergeBell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tabular-nums">{checkedInCount}</span>
            <span className="text-xs text-[#786A5B]">
              {isTelugu ? 'గదులు' : 'Rooms Occupied'}
            </span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2 font-medium">
            {confirmedArrivals} {isTelugu ? 'రావలసిన నిర్ధారిత అతిథులు' : 'upcoming arrivals'}
          </p>
        </div>

        {/* Card 3: Financial Card */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-4 sm:p-5 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:shadow-[0_8px_30px_rgba(33,24,15,0.06)] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8D7D71]">
              {canViewRevenue
                ? t('dashboard.totalRevenue', 'Total Revenue')
                : isTelugu
                ? 'కౌంటర్ వద్ద నగదు నిల్వ'
                : 'Front Desk Cash Drawer'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5]/60 text-[#2E7D32] flex items-center justify-center">
              {canViewRevenue ? <CreditCard className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tabular-nums truncate">
              {canViewRevenue
                ? formatCurrency(totalPeriodRevenue)
                : formatCurrency(cashBalance !== null ? cashBalance : 0)}
            </span>
          </div>

          <p className="text-[11px] text-[#2E7D32] mt-2 font-semibold truncate">
            {canViewRevenue ? (
              <>
                {formatCurrency(totalPeriodCollections)}{' '}
                {isTelugu ? 'జమ చేయబడింది' : 'settled collections'}
              </>
            ) : (
              <>
                {formatCurrency(todayDeskCollections)}{' '}
                {isTelugu ? 'నేటి వసూళ్లు' : "today's collections"}
              </>
            )}
          </p>
        </div>

        {/* Card 4: Housekeeping & Room Readiness */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-4 sm:p-5 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:shadow-[0_8px_30px_rgba(33,24,15,0.06)] hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8D7D71]">
              {t('rooms.available', 'Inventory Ready')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5]/60 text-[#8D672F] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tabular-nums">{availableRooms}</span>
            <span className="text-xs text-[#2E7D32] font-semibold">
              {isTelugu ? 'సిద్ధంగా ఉన్నాయి' : 'Clean & Ready'}
            </span>
          </div>
          <p className="text-[11px] text-[#786A5B] mt-2 font-medium">
            {cleaningRooms} {isTelugu ? 'శుభ్రత' : 'cleaning'} &bull; {maintenanceRooms}{' '}
            {isTelugu ? 'మరమ్మతు' : 'maintenance'}
          </p>
        </div>
      </div>

      {/* Middle Grid: Operational Room Matrix & Front Desk Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left: 25 Physical Rooms Interactive Status Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6D9C5]/80 p-6 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-[#E6D9C5]/50">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2A1D13] tracking-tight">
                {t('rooms.title', 'Room Status Board')}
              </h3>
              <p className="text-xs text-[#786A5B] font-light">
                {isTelugu ? '25 అతిథి గదుల ప్రత్యక్ష స్థితి (అంతస్తులు 1, 2, 3)' : 'Floors 1, 2 & 3 live inventory overview'}
              </p>
            </div>

            <NextLink
              href="/admin/rooms/board"
              className="text-xs font-semibold text-[#8D672F] hover:text-[#6D4E21] flex items-center gap-1 group transition-colors"
            >
              <span>{isTelugu ? 'పూర్తి బోర్డు' : 'Full Tape Chart'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </NextLink>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
            {rooms.slice(0, 24).map((r) => {
              const status = r.operational_status || 'available';
              const isOccupied = status === 'occupied';
              const isAvailable = status === 'available';
              const isCleaning = status === 'cleaning';
              const isReserved = status === 'reserved';
              const isMaintenance = status === 'maintenance';

              // Localized clean status text without clipping ellipsis
              const getBadgeText = () => {
                if (isTelugu) {
                  if (isAvailable) return 'సిద్ధం';
                  if (isOccupied) return 'బుక్ అయింది';
                  if (isCleaning) return 'శుభ్రత';
                  if (isReserved) return 'రిజర్వ్';
                  if (isMaintenance) return 'మరమ్మతు';
                  return 'సిద్ధం';
                }
                return translateStatus(status);
              };

              return (
                <button
                  type="button"
                  key={r.id || r.room_number}
                  onClick={() => setSelectedRoom(r)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer relative group text-left flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${
                    isOccupied
                      ? 'bg-rose-50/70 border-rose-200/80 hover:border-rose-300 text-rose-950'
                      : isAvailable
                      ? 'bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-300 text-emerald-950'
                      : isCleaning
                      ? 'bg-amber-50/70 border-amber-200/80 hover:border-amber-300 text-amber-950'
                      : isReserved
                      ? 'bg-blue-50/70 border-blue-200/80 hover:border-blue-300 text-blue-950'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-300 text-stone-800'
                  }`}
                  title={`Room ${r.room_number} • ${r.category_name || 'Room'}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-sm font-bold text-[#2A1D13]">
                      {r.room_number}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isOccupied
                          ? 'bg-rose-500'
                          : isAvailable
                          ? 'bg-emerald-500'
                          : isCleaning
                          ? 'bg-amber-500'
                          : isReserved
                          ? 'bg-blue-500'
                          : 'bg-stone-400'
                      }`}
                    />
                  </div>

                  <div className="mt-1.5">
                    <div className="text-[10px] font-semibold leading-tight capitalize text-[#2A1D13]">
                      {getBadgeText()}
                    </div>
                    <div className="text-[9px] text-[#786A5B] opacity-75 mt-0.5 truncate">
                      {r.category_name || (isTelugu ? 'గది' : 'Room')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Status Legend */}
          <div className="mt-5 pt-4 border-t border-[#E6D9C5]/50 flex items-center justify-between text-[11px] text-[#786A5B] flex-wrap gap-2">
            <div className="flex items-center gap-5 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-[#786A5B]">{isTelugu ? 'అందుబాటులో ఉంది' : 'Available'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[11px] font-medium text-[#786A5B]">{isTelugu ? 'బసలో ఉన్నారు' : 'Occupied'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[11px] font-medium text-[#786A5B]">{isTelugu ? 'శుభ్రత' : 'Cleaning'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                <span className="text-[11px] font-medium text-[#786A5B]">{isTelugu ? 'మరమ్మతు' : 'Maintenance'}</span>
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#786A5B]/80">
              {totalRooms} {isTelugu ? 'మొత్తం గదులు' : 'Rooms Total'}
            </span>
          </div>
        </div>

        {/* Right: Role-Based Quick Action Shortcuts */}
        <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-6 shadow-[0_4px_20px_rgba(33,24,15,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E6D9C5]/50">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2A1D13] tracking-tight">
                  {t('dashboard.quickActions', 'Front Desk Shortcuts')}
                </h3>
                <p className="text-xs text-[#786A5B] font-light">
                  {isTelugu ? 'ముఖ్యమైన నిర్వహణ విభాగాలు' : 'Quick access to operational consoles'}
                </p>
              </div>
              <span className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E6D9C5] text-[#8D672F]">
                {userRoleString}
              </span>
            </div>

            <div className="space-y-2.5">
              {getShortcutsForRole().map((shortcut, idx) => {
                const Icon = shortcut.icon;
                return (
                  <NextLink
                    key={idx}
                    href={shortcut.href}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E6D9C5]/70 hover:border-[#8D672F] text-xs font-semibold text-[#2A1D13] flex items-center justify-between shadow-[0_2px_8px_rgba(33,24,15,0.02)] hover:shadow-sm group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E6D9C5]/60 flex items-center justify-center text-[#8D672F] group-hover:bg-[#8D672F] group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-[#2A1D13] group-hover:text-[#8D672F] transition-colors">
                        {shortcut.title}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[#786A5B]/60 group-hover:text-[#8D672F] transition-colors" />
                  </NextLink>
                );
              })}
            </div>
          </div>

          {/* Quick Counter Summary Footer */}
          <div className="mt-6 pt-3 border-t border-[#E6D9C5]/50 flex items-center justify-between text-xs text-[#786A5B]">
            <span className="font-light">{isTelugu ? 'కౌంటర్ ప్రాంగణం' : 'Property Location'}</span>
            <span className="font-serif font-bold text-[#2A1D13]">
              Sri Tayi Grand &bull; Kadiri
            </span>
          </div>
        </div>
      </div>

      {/* Recent Bookings Activity Table */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5] p-6 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-[#33271D]">
                {t('dashboard.recentActivity', 'Recent Booking Activity')}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E6D9C5] text-[#8D672F]">
                {filterPeriod}
              </span>
            </div>
            <p className="text-xs text-[#786A5B]">
              {isTelugu
                ? 'ఎంచుకున్న కాలవ్యవధిలోని అతిథి రిజర్వేషన్లు మరియు రాకలు'
                : 'Guest reservations and check-in activity for the selected time window'}
            </p>
          </div>

          <NextLink
            href="/admin/bookings"
            className="text-xs font-semibold text-[#8D672F] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>
              {isTelugu
                ? `మొత్తం బుకింగ్స్ (${bookings.length}) →`
                : `All Bookings (${bookings.length}) →`}
            </span>
          </NextLink>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786A5B] uppercase tracking-wider text-[10px] border-b border-[#E6D9C5]">
              <tr>
                <th className="py-3 px-4 font-semibold">{t('bookings.reference', 'Reference')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.guestName', 'Guest')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.roomCategory', 'Category')}</th>
                <th className="py-3 px-4 font-semibold">{isTelugu ? 'తేదీలు' : 'Dates'}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.roomNumber', 'Assigned Room')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.totalAmount', 'Amount')}</th>
                <th className="py-3 px-4 font-semibold">{t('bookings.bookingStatus', 'Status')}</th>
                <th className="py-3 px-4 font-semibold text-right">{t('common.actions', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#33271D]">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#786A5B] italic">
                    {isTelugu
                      ? 'ఈ కాలవ్యవధిలో బుకింగ్ రికార్డులు ఏవీ కనుగొనబడలేదు.'
                      : 'No booking records found matching the selected filter period.'}
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                      {b.booking_reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{b.guest_name}</div>
                      <div className="text-[10px] text-[#786A5B]">{b.guest_phone}</div>
                    </td>
                    <td className="py-3.5 px-4">{b.category_name}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {formatDate(b.check_in_date)} {isTelugu ? 'నుండి' : 'to'}{' '}
                      {formatDate(b.check_out_date)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {b.assigned_room_number ? (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E6D9C5] font-bold text-[#33271D]">
                          {isTelugu ? `గది ${b.assigned_room_number}` : `Room ${b.assigned_room_number}`}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#E65100] italic">
                          {isTelugu ? 'కేటాయించబడలేదు' : 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                      {formatCurrency(b.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          b.status === 'checked_in'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : b.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {translateStatus(b.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <NextLink
                        href={`/admin/front-desk?booking=${b.booking_reference}`}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#8D672F] hover:text-white text-[11px] font-semibold text-[#382216] transition-colors inline-block"
                      >
                        {isTelugu ? 'ఫోలియో వీక్షించండి' : 'Open Folio'}
                      </NextLink>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Room Quick Action Modal */}
      {selectedRoom && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedRoom(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E6D9C5] shadow-2xl max-w-lg w-full p-6 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E6D9C5] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-bold text-[#382216]">
                    {isTelugu ? `గది ${selectedRoom.room_number}` : `Room ${selectedRoom.room_number}`}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedRoom.operational_status === 'occupied'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : selectedRoom.operational_status === 'available'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : selectedRoom.operational_status === 'cleaning'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-stone-100 text-stone-800 border-stone-300'
                    }`}
                  >
                    {translateStatus(selectedRoom.operational_status)}
                  </span>
                </div>
                <p className="text-xs text-[#786A5B] mt-1">
                  {selectedRoom.category_name || 'Standard Room'} • Floor {selectedRoom.floor_number}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-[#786A5B] transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Status Specific Overview */}
            <div className="py-5 space-y-4">
              {/* If Occupied: Show In-House Guest Folio details */}
              {selectedRoom.operational_status === 'occupied' && (() => {
                const stay = getActiveStayForRoom(selectedRoom);
                if (!stay) {
                  return (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                      {isTelugu
                        ? 'ఈ గది ఆక్యుపై చేయబడింది, కానీ నిర్దిష్ట గెస్ట్ ఫోలియో లింక్ చేయబడలేదు.'
                        : 'Room is occupied. Front desk check-in registered.'}
                    </div>
                  );
                }

                const pendingBalance = (stay.total_amount || 0) - (stay.paid_amount || 0);

                return (
                  <div className="space-y-3 p-4 rounded-xl bg-stone-50 border border-[#E6D9C5]">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <span className="text-xs font-bold text-[#382216]">{stay.guest_name}</span>
                      <span className="font-mono text-xs font-semibold text-[#786A5B]">
                        {stay.booking_reference}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[#786A5B] text-[10px] block">{isTelugu ? 'ఫోన్ నంబర్' : 'Phone'}</span>
                        <span className="font-medium text-[#33271D]">{stay.guest_phone}</span>
                      </div>
                      <div>
                        <span className="text-[#786A5B] text-[10px] block">{isTelugu ? 'చెక్-అవుట్ తేదీ' : 'Checkout'}</span>
                        <span className="font-medium text-[#33271D]">{formatDate(stay.check_out_date)}</span>
                      </div>
                      <div>
                        <span className="text-[#786A5B] text-[10px] block">{isTelugu ? 'మొత్తం ఛార్జీ' : 'Folio Total'}</span>
                        <span className="font-bold text-[#33271D]">{formatCurrency(stay.total_amount)}</span>
                      </div>
                      <div>
                        <span className="text-[#786A5B] text-[10px] block">{isTelugu ? 'బ్యాలెన్స్ పెండింగ్' : 'Balance Due'}</span>
                        <span
                          className={`font-bold ${
                            pendingBalance > 0 ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(pendingBalance)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <NextLink
                        href={`/admin/front-desk?booking=${stay.booking_reference}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-bold text-center transition-all shadow-xs"
                      >
                        {isTelugu ? 'ఫోలియో & చెక్-అవుట్ ➔' : 'View Folio & Settle ➔'}
                      </NextLink>
                      <NextLink
                        href={`/admin/rfid?room=${selectedRoom.room_number}`}
                        className="py-2 px-3 rounded-xl bg-white border border-[#E6D9C5] hover:border-[#8D672F] text-xs font-semibold text-[#382216] transition-all"
                        title="Keycard operations"
                      >
                        <KeyRound className="w-4 h-4 text-[#8D672F]" />
                      </NextLink>
                    </div>
                  </div>
                );
              })()}

              {/* If Available: Fast Check-In / Walk-In */}
              {selectedRoom.operational_status === 'available' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isTelugu ? 'గది సిద్ధంగా ఉంది' : 'Room is Clean & Ready for Guest Arrival'}</span>
                    </p>
                    <p className="text-[11px] text-emerald-900 mt-1">
                      {isTelugu
                        ? 'ఈ గదిని వెంటనే అతిథికి కేటాయించి చెక్-ఇన్ చేయవచ్చు.'
                        : 'Housekeeping inspection verified. You can immediately register a walk-in or assign a confirmed booking.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenWalkInForRoom(selectedRoom)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#8D672F] hover:bg-[#6D4E21] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isTelugu
                          ? `గది ${selectedRoom.room_number} కి తక్షణ చెక్-ఇన్ చేయండి`
                          : `Check-In / Walk-In for Room ${selectedRoom.room_number}`}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() =>
                          handleUpdateRoomHousekeeping(selectedRoom.id, 'cleaning', 'dirty')
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-all cursor-pointer"
                      >
                        {isTelugu ? 'శుభ్రత షెడ్యూల్ చేయండి' : 'Schedule Cleaning'}
                      </button>

                      {(isSuperAdmin || isManager) && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() =>
                            handleUpdateRoomHousekeeping(selectedRoom.id, 'maintenance', 'dirty')
                          }
                          className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-rose-100 hover:text-rose-900 text-stone-700 text-xs font-semibold transition-all cursor-pointer"
                          title="Block for maintenance"
                        >
                          <Wrench className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* If Cleaning / Dirty: Inspect & Mark Clean */}
              {selectedRoom.operational_status === 'cleaning' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>{isTelugu ? 'హౌస్‌కీపింగ్ జరుగుతోంది' : 'Housekeeping In Progress'}</span>
                    </p>
                    <p className="text-[11px] text-amber-900 mt-1">
                      {isTelugu
                        ? 'గది శుభ్రపరిచిన తర్వాత తనిఖీ చేసి సిద్ధంగా ఉందని గుర్తించండి.'
                        : 'Room has been vacated or flagged for linen turnover and sanitization.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleUpdateRoomHousekeeping(selectedRoom.id, 'available', 'clean')
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isTelugu
                        ? '✓ తనిఖీ పూర్తయింది - సిద్ధంగా గుర్తించు'
                        : '✓ Inspect & Mark Clean / Available'}
                    </span>
                  </button>

                  <NextLink
                    href="/admin/housekeeping"
                    className="block text-center text-xs font-semibold text-[#8D672F] hover:underline pt-1"
                  >
                    {isTelugu ? 'హౌస్‌కీపింగ్ బోర్డు తెరవండి ➔' : 'Open Housekeeping Board ➔'}
                  </NextLink>
                </div>
              )}

              {/* If Maintenance: Resolve Maintenance */}
              {selectedRoom.operational_status === 'maintenance' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950">
                    <p className="font-bold flex items-center gap-1.5 text-rose-900">
                      <Wrench className="w-4 h-4 text-rose-600" />
                      <span>{isTelugu ? 'మరమ్మతులో ఉంది' : 'Maintenance Block Active'}</span>
                    </p>
                    <p className="text-[11px] text-rose-900 mt-1">
                      {isTelugu
                        ? 'ఈ గది తాత్కాలిక మరమ్మతుల కోసం నిలిపివేయబడింది.'
                        : 'Room is currently blocked for plumbing, AC, or electrical maintenance.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      handleUpdateRoomHousekeeping(selectedRoom.id, 'available', 'clean')
                    }
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isTelugu ? '✓ మరమ్మతు పరిష్కరించి అందుబాటులో ఉంచండి' : '✓ Resolve Maintenance & Make Available'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embedded Statutory Walk-In Modal */}
      <StatutoryWalkInModal
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        availableRooms={rooms.filter((r) => r.operational_status === 'available')}
        categories={categories}
        allRooms={rooms}
        allBookings={bookings}
        initialData={{
          roomNumber: walkInPreselectedRoom,
          categoryId: walkInPreselectedCategory,
        }}
        onSuccess={(booking, roomNum) => {
          setWalkInModalOpen(false);
          playChimeSound(true);
          showToast(
            isTelugu
              ? `అతిథి ${booking.guest_name} గది ${roomNum} కి విజయవంతంగా చెక్-ఇన్ అయ్యారు!`
              : `Guest ${booking.guest_name} successfully checked into Room ${roomNum}!`,
            'success'
          );
          fetchDashboardData(true);
        }}
      />
    </div>
  );
}
