'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StaffAttendance, StaffMember, ShiftType, AttendanceStatus } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  UserCheck,
  Users,
  Clock,
  Calendar,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sun,
  Sunset,
  Moon,
  Briefcase,
  X,
  LogOut,
  Sparkles,
  Timer,
  ChevronLeft,
  ChevronRight,
  UserX,
  ShieldAlert,
} from 'lucide-react';

export default function AdminStaffAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<StaffAttendance[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState({
    totalStaff: 0,
    onDutyCount: 0,
    morningShiftCount: 0,
    eveningShiftCount: 0,
    nightShiftCount: 0,
    generalShiftCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'all' | ShiftType>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clock-In Modal
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clockInStaffId, setClockInStaffId] = useState('');
  const [clockInShift, setClockInShift] = useState<ShiftType>('morning');
  const [clockInNotes, setClockInNotes] = useState('');

  // Clock-out in progress
  const [clockingOutId, setClockingOutId] = useState<string | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/staff/attendance?date=${selectedDate}`, {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAttendanceList(data.attendance || []);
          setStaffList(data.staff || []);
          setStats(
            data.stats || {
              totalStaff: (data.staff || []).length,
              onDutyCount: 0,
              morningShiftCount: 0,
              eveningShiftCount: 0,
              nightShiftCount: 0,
              generalShiftCount: 0,
            }
          );
          if (data.staff && data.staff.length > 0 && !clockInStaffId) {
            setClockInStaffId(data.staff[0].id);
          }
        }
      } else {
        showNotification('error', 'Failed to synchronize staff attendance data.');
      }
    } catch {
      showNotification('error', 'Network error connecting to attendance service.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, clockInStaffId, showNotification]);

  // Real-time synchronization
  useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'attendance_recorded' ||
        event.eventType === 'audit_log_created' ||
        event.eventType === 'cash_shift_opened' ||
        event.eventType === 'cash_shift_closed' ||
        event.eventType === 'full_sync'
      ) {
        fetchAttendance();
      }
    },
  });

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Shift Navigation Helper
  const handleDateChange = (daysDelta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleClockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clockInStaffId) {
      showNotification('error', 'Please select a staff member to clock in.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/staff/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'clock_in',
          staffId: clockInStaffId,
          shift: clockInShift,
          notes: clockInNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Staff member clocked in successfully!');
        setIsClockInModalOpen(false);
        setClockInNotes('');
        fetchAttendance();
      } else {
        showNotification('error', data.error || 'Failed to clock in staff member.');
      }
    } catch {
      showNotification('error', 'Network error clocking in staff.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async (attendanceId: string) => {
    try {
      setClockingOutId(attendanceId);
      const res = await fetch('/api/admin/staff/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'clock_out',
          attendanceId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('success', data.message || 'Staff member clocked out successfully!');
        fetchAttendance();
      } else {
        showNotification('error', data.error || 'Failed to clock out staff member.');
      }
    } catch {
      showNotification('error', 'Network error clocking out staff.');
    } finally {
      setClockingOutId(null);
    }
  };

  // Filtered attendance list
  const filteredAttendance = useMemo(() => {
    return attendanceList.filter((item) => {
      const matchesShift = shiftFilter === 'all' || item.shift === shiftFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.staff_name.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));
      return matchesShift && matchesSearch;
    });
  }, [attendanceList, shiftFilter, searchQuery]);

  const getShiftBadge = (shift: ShiftType) => {
    switch (shift) {
      case 'morning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Sun className="w-3 h-3 text-amber-600" />
            Morning (06:00 - 14:00)
          </span>
        );
      case 'evening':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            <Sunset className="w-3 h-3 text-orange-600" />
            Evening (14:00 - 22:00)
          </span>
        );
      case 'night':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Moon className="w-3 h-3 text-indigo-600" />
            Night (22:00 - 06:00)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-50 text-stone-800 border border-stone-200">
            <Briefcase className="w-3 h-3 text-stone-600" />
            General (09:00 - 18:00)
          </span>
        );
    }
  };

  const getStatusBadge = (item: StaffAttendance) => {
    const isOnDuty = item.clock_in && !item.clock_out;
    if (isOnDuty) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          On-Duty Now
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Shift Completed
      </span>
    );
  };

  const formatClockTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-md border animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border-emerald-700'
              : 'bg-red-900/90 text-red-100 border-red-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#241912] border border-[#D8AD56]/30 rounded-2xl p-6 sm:p-8 text-[#FAF7F2] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Staff Operations Tier-3
              </span>
              <span className="text-xs text-[#FAF7F2]/60 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#D8AD56]" />
                Live Attendance &amp; Shifts
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">
              Staff Attendance &amp; Shift Roster
            </h1>
            <p className="text-sm text-[#FAF7F2]/80 max-w-2xl font-light">
              Biometric check-in and shift duty allocation for Sri Tayi Grand hotel staff. Monitor
              on-duty personnel, morning/evening/night coverage, and automated work hours computation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchAttendance()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/20 hover:border-[#D8AD56] text-white hover:text-[#D8AD56] bg-white/5 transition-all text-xs font-medium flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
              <span>Refresh Roster</span>
            </button>
            <button
              onClick={() => setIsClockInModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#C99C44] text-[#241912] font-semibold text-xs tracking-wide shadow-lg hover:shadow-[#D8AD56]/20 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Clock-In Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* Shift Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Staff */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Total Staff
            </span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-[#241912]">{stats.totalStaff}</p>
          <p className="text-xs text-stone-400 mt-0.5">Enrolled Personnel</p>
        </div>

        {/* On-Duty Today */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-300 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800">
              On-Duty Today
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">{stats.onDutyCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Currently Stationed</p>
        </div>

        {/* Morning Shift */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Morning Shift
            </span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-800">{stats.morningShiftCount}</p>
          <p className="text-xs text-stone-400 mt-0.5">06:00 - 14:00</p>
        </div>

        {/* Evening Shift */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Evening Shift
            </span>
            <Sunset className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-800">{stats.eveningShiftCount}</p>
          <p className="text-xs text-stone-400 mt-0.5">14:00 - 22:00</p>
        </div>

        {/* Night Shift */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Night Shift
            </span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-stone-800">{stats.nightShiftCount}</p>
          <p className="text-xs text-stone-400 mt-0.5">22:00 - 06:00</p>
        </div>
      </div>

      {/* Date Picker Bar & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Date Navigator */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-800">
            <Calendar className="w-4 h-4 text-[#D8AD56]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-2 rounded-xl text-xs font-medium text-[#D8AD56] hover:bg-[#FAF7F2] transition-colors"
          >
            Today
          </button>
        </div>

        {/* Shift Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Shifts' },
            { id: 'morning', label: 'Morning' },
            { id: 'evening', label: 'Evening' },
            { id: 'night', label: 'Night' },
            { id: 'general', label: 'General' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setShiftFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                shiftFilter === s.id
                  ? 'bg-[#241912] text-[#D8AD56] font-semibold'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, role, notes..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56]"
          />
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-[#FAF7F2] border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Shift Attendance Register
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-200 text-stone-700 font-bold">
              {filteredAttendance.length} Logged
            </span>
          </div>
          <span className="text-[11px] text-stone-500">Date: {selectedDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Allocated Shift</th>
                <th className="py-3 px-4">Clock-In</th>
                <th className="py-3 px-4">Clock-Out</th>
                <th className="py-3 px-4 text-center">Work Hours</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duty Notes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredAttendance.map((item) => {
                const isOnDuty = item.clock_in && !item.clock_out;
                return (
                  <tr key={item.id} className="hover:bg-amber-50/20 transition-colors">
                    {/* Staff Member */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#241912] text-[#D8AD56] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {item.staff_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-stone-900 block leading-tight">
                            {item.staff_name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono block">
                            ID: {item.staff_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800 border border-stone-200">
                        {item.role}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getShiftBadge(item.shift)}</td>

                    {/* Clock-In */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-stone-800 font-semibold">
                      {formatClockTime(item.clock_in)}
                    </td>

                    {/* Clock-Out */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-stone-800 font-semibold">
                      {item.clock_out ? (
                        formatClockTime(item.clock_out)
                      ) : (
                        <span className="text-emerald-600 font-sans text-[11px] font-medium italic">
                          Active On Duty
                        </span>
                      )}
                    </td>

                    {/* Work Hours */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono font-bold text-stone-900">
                      {item.work_hours !== undefined ? (
                        `${item.work_hours} hrs`
                      ) : isOnDuty ? (
                        <span className="text-stone-400 font-normal text-[11px]">Calculating...</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getStatusBadge(item)}</td>

                    {/* Notes */}
                    <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                      {item.notes || '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isOnDuty ? (
                        <button
                          onClick={() => handleClockOut(item.id)}
                          disabled={clockingOutId === item.id}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all mx-auto disabled:opacity-50"
                        >
                          {clockingOutId === item.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>Clock-Out</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-stone-400 font-medium">Logged</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400 space-y-2">
                    <UserX className="w-10 h-10 text-stone-300 mx-auto" />
                    <p className="text-sm">No attendance records logged for {selectedDate}.</p>
                    <button
                      onClick={() => setIsClockInModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#241912] text-[#D8AD56] font-semibold text-xs inline-flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Clock-In Staff Member
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: QUICK CLOCK-IN STAFF */}
      {/* ========================================================================= */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#241912] text-[#D8AD56] flex items-center justify-center shadow-md">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#241912]">
                    Quick Staff Clock-In
                  </h3>
                  <p className="text-xs text-stone-500">Record on-duty shift start timestamp</p>
                </div>
              </div>
              <button
                onClick={() => setIsClockInModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClockInSubmit} className="space-y-4">
              {/* Select Staff Member */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Staff Member <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={clockInStaffId}
                  onChange={(e) => setClockInStaffId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-[#D8AD56]"
                >
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.full_name} — {stf.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Shift */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Allocated Shift <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'morning', label: 'Morning (06:00 - 14:00)' },
                    { id: 'evening', label: 'Evening (14:00 - 22:00)' },
                    { id: 'night', label: 'Night (22:00 - 06:00)' },
                    { id: 'general', label: 'General (09:00 - 18:00)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setClockInShift(s.id as ShiftType)}
                      className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                        clockInShift === s.id
                          ? 'bg-[#241912] text-[#D8AD56] border-[#241912] font-semibold'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duty Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Station / Duty Notes <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  placeholder="e.g. Front Desk Terminal 1, Floor 2 Housekeeping"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Current Time Preview */}
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                <span className="text-stone-500">Clock-In Timestamp:</span>
                <span className="font-mono font-bold text-[#241912]">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsClockInModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#C99C44] text-[#241912] font-semibold text-xs tracking-wide shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm Clock-In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
