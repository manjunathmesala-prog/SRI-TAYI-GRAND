'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { StaffAttendance, StaffMember, ShiftType, AttendanceStatus } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { getAdminHeaders } from '@/lib/auth-storage';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
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
        headers: getAdminHeaders(),
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
        headers: getAdminHeaders({
          'Content-Type': 'application/json',
        }),
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
        headers: getAdminHeaders({
          'Content-Type': 'application/json',
        }),
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

      {/* Clean Luxury Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E6D9C5]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] tracking-tight">
            Staff Attendance
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            Shift roster and duty logs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAttendance()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#786A5B] hover:text-[#2A1D13] transition-all flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#8D672F]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsClockInModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] font-medium text-xs tracking-wide transition-all shadow-xs flex items-center gap-2"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Clock-In Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#786A5B]">Total Staff</span>
            <Users className="w-4 h-4 text-[#8D672F]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#2A1D13]">{stats.totalStaff}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#8D672F]/30 shadow-[0_4px_20px_rgba(33,24,15,0.03)] bg-gradient-to-b from-white to-[#FAF8F5]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8D672F]">On-Duty Now</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#2A1D13]">{stats.onDutyCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#786A5B]">Morning Shift</span>
            <Sun className="w-4 h-4 text-[#8D672F]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#2A1D13]">{stats.morningShiftCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#786A5B]">Evening Shift</span>
            <Sunset className="w-4 h-4 text-[#8D672F]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#2A1D13]">{stats.eveningShiftCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#786A5B]">Night Shift</span>
            <Moon className="w-4 h-4 text-[#8D672F]" />
          </div>
          <p className="text-2xl font-bold font-serif text-[#2A1D13]">{stats.nightShiftCount}</p>
        </div>
      </div>

      {/* Date Picker Bar & Filter Controls */}
      <div className="bg-white rounded-2xl p-3 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 rounded-xl border border-[#E6D9C5] hover:bg-[#FAF8F5] text-[#786A5B] transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-xs font-medium text-[#2A1D13]">
            <Calendar className="w-3.5 h-3.5 text-[#8D672F]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-xs"
            />
          </div>

          <button
            onClick={() => handleDateChange(1)}
            className="p-2 rounded-xl border border-[#E6D9C5] hover:bg-[#FAF8F5] text-[#786A5B] transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#8D672F] hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#E6D9C5]"
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
                  ? 'bg-[#2A1D13] text-[#EAD8B8] shadow-xs'
                  : 'text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-[#786A5B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, role, notes..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#8D672F] bg-white text-[#2A1D13] placeholder-[#786A5B]/60"
          />
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] overflow-hidden">
        <div className="p-3.5 bg-[#FAF8F5] border-b border-[#E6D9C5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#2A1D13] uppercase tracking-wider">
              Shift Attendance Register
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white border border-[#E6D9C5] text-[#786A5B] font-semibold">
              {filteredAttendance.length} Logged
            </span>
          </div>
          <span className="text-[11px] text-[#786A5B]">Date: {selectedDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5]/50 border-b border-[#E6D9C5] text-[#786A5B] uppercase text-[10px] tracking-wider font-medium">
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
            <tbody className="divide-y divide-[#E6D9C5]/40 font-sans">
              {filteredAttendance.map((item) => {
                const isOnDuty = item.clock_in && !item.clock_out;
                return (
                  <tr key={item.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    {/* Staff Member */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#2A1D13] text-[#EAD8B8] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {item.staff_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-[#2A1D13] block leading-tight">
                            {item.staff_name}
                          </span>
                          <span className="text-[10px] text-[#786A5B] font-mono block">
                            ID: {item.staff_id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF8F5] text-[#2A1D13] border border-[#E6D9C5]">
                        {item.role}
                      </span>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4 whitespace-nowrap">{getShiftBadge(item.shift)}</td>

                    {/* Clock-In */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[#2A1D13] font-medium">
                      {formatClockTime(item.clock_in)}
                    </td>

                    {/* Clock-Out */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[#2A1D13] font-medium">
                      {item.clock_out ? (
                        formatClockTime(item.clock_out)
                      ) : (
                        <span className="text-emerald-700 font-sans text-[11px] font-medium">
                          Active On Duty
                        </span>
                      )}
                    </td>

                    {/* Work Hours */}
                    <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold text-[#2A1D13]">
                      {item.work_hours !== undefined ? (
                        `${item.work_hours} hrs`
                      ) : isOnDuty ? (
                        <span className="text-[#786A5B] font-normal text-[11px]">Calculating...</span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(item)}</td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-[#786A5B] max-w-xs truncate">
                      {item.notes || '—'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isOnDuty ? (
                        <button
                          onClick={() => handleClockOut(item.id)}
                          disabled={clockingOutId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-medium flex items-center gap-1.5 transition-all mx-auto disabled:opacity-50"
                        >
                          {clockingOutId === item.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>Clock-Out</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#786A5B] font-medium">Logged</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredAttendance.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#786A5B] space-y-2">
                    <UserX className="w-10 h-10 text-[#E6D9C5] mx-auto" />
                    <p className="text-sm">No attendance records logged for {selectedDate}.</p>
                    <button
                      onClick={() => setIsClockInModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] font-medium text-xs inline-flex items-center gap-1.5 mt-2 transition-all shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E6D9C5] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6D9C5]/60 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2A1D13] text-[#EAD8B8] flex items-center justify-center shadow-xs">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2A1D13]">
                    Quick Staff Clock-In
                  </h3>
                  <p className="text-xs text-[#786A5B]">Record shift start</p>
                </div>
              </div>
              <button
                onClick={() => setIsClockInModalOpen(false)}
                className="text-[#786A5B] hover:text-[#2A1D13] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleClockInSubmit} className="space-y-4">
              {/* Select Staff Member */}
              <div>
                <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                  Staff Member <span className="text-rose-500">*</span>
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={clockInStaffId}
                  onChange={(val) => setClockInStaffId(String(val))}
                  placeholder="Select staff member..."
                  options={staffList.map((stf) => ({
                    value: stf.id,
                    label: `${stf.full_name} — ${stf.role}`,
                  }))}
                />
              </div>

              {/* Select Shift */}
              <div>
                <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
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
                          ? 'bg-[#2A1D13] text-[#EAD8B8] border-[#2A1D13] font-medium'
                          : 'border-[#E6D9C5] text-[#2A1D13] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duty Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#2A1D13] mb-1">
                  Station / Duty Notes <span className="text-[#786A5B] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={clockInNotes}
                  onChange={(e) => setClockInNotes(e.target.value)}
                  placeholder="e.g. Front Desk Terminal 1, Floor 2 Housekeeping"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6D9C5] focus:outline-none focus:border-[#8D672F] text-[#2A1D13] placeholder-[#786A5B]/60"
                />
              </div>

              {/* Current Time Preview */}
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5] flex items-center justify-between text-xs">
                <span className="text-[#786A5B]">Clock-In Timestamp:</span>
                <span className="font-mono font-bold text-[#2A1D13]">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E6D9C5]/60">
                <button
                  type="button"
                  onClick={() => setIsClockInModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#E6D9C5] text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5] text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] font-medium text-xs tracking-wide shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
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
