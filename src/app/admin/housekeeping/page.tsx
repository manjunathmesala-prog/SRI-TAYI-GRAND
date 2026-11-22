'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PhysicalRoom, HousekeepingStatus, StaffMember, HousekeepingTurnaroundChecklist } from '@/types';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { authStorage } from '@/lib/auth-storage';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Radio,
  X,
  CheckSquare,
  Square,
  ShieldCheck,
  ClipboardCheck,
  UserCheck,
  RefreshCw,
  Search,
  Printer,
  Wrench,
  Check,
  RotateCcw,
  Building,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

export default function HousekeepingAdminPage() {
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all');
  const [filterAttendant, setFilterAttendant] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [printTimestamp, setPrintTimestamp] = useState('');

  useEffect(() => {
    const updatePrintTimestamp = () => setPrintTimestamp(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    updatePrintTimestamp();
    window.addEventListener('beforeprint', updatePrintTimestamp);
    return () => window.removeEventListener('beforeprint', updatePrintTimestamp);
  }, []);

  // Turnaround Inspection Modal State
  const [inspectionRoom, setInspectionRoom] = useState<PhysicalRoom | null>(null);
  const [chkLinen, setChkLinen] = useState(false);
  const [chkTowels, setChkTowels] = useState(false);
  const [chkBathToiletries, setChkBathToiletries] = useState(false);
  const [chkAcGeyser, setChkAcGeyser] = useState(false);
  const [chkFloorDustbin, setChkFloorDustbin] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectorName, setInspectorName] = useState(() => {
    const name = authStorage.getUserName();
    const role = authStorage.getRole();
    return name ? `${name} (${role || 'Supervisor'})` : 'G. Mohan Kumar (Hotel Manager)';
  });
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHousekeepingData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/housekeeping', {
        headers: authStorage.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
        if (data.housekeepingStaff) setStaffList(data.housekeepingStaff);
      } else {
        const stateData = await adminOperations.fetchFullState();
        if (stateData && stateData.rooms) {
          setRooms(stateData.rooms);
        }
      }
    } catch {
      const stateData = await adminOperations.fetchFullState();
      if (stateData && stateData.rooms) {
        setRooms(stateData.rooms);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHousekeepingData();
  }, [fetchHousekeepingData]);

  // Real-time synchronization
  const { isConnected, status } = useRealtimeSync({
    onRefresh: fetchHousekeepingData,
  });

  // Open Inspection Modal
  const handleOpenInspection = (room: PhysicalRoom) => {
    setInspectionRoom(room);
    setChkLinen(false);
    setChkTowels(false);
    setChkBathToiletries(false);
    setChkAcGeyser(false);
    setChkFloorDustbin(false);
    setInspectionNotes('');
  };

  // Toggle All Checkboxes
  const handleToggleCheckAll = () => {
    const areAllChecked =
      chkLinen && chkTowels && chkBathToiletries && chkAcGeyser && chkFloorDustbin;
    const nextVal = !areAllChecked;
    setChkLinen(nextVal);
    setChkTowels(nextVal);
    setChkBathToiletries(nextVal);
    setChkAcGeyser(nextVal);
    setChkFloorDustbin(nextVal);
  };

  // Check if all 5 inspection requirements are met
  const allInspectionItemsChecked =
    chkLinen && chkTowels && chkBathToiletries && chkAcGeyser && chkFloorDustbin;

  // Complete Turnaround Inspection Submit
  const handleCompleteInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionRoom || !allInspectionItemsChecked) return;

    setIsSubmittingInspection(true);
    try {
      const checklistPayload: HousekeepingTurnaroundChecklist = {
        linen_changed: chkLinen,
        towels_replaced: chkTowels,
        bathroom_sanitized: chkBathToiletries,
        toiletries_restocked: chkBathToiletries,
        ac_geyser_checked: chkAcGeyser,
        dustbin_emptied: chkFloorDustbin,
        floor_mopped: chkFloorDustbin,
        assigned_staff_id: inspectionRoom.assigned_housekeeper_id,
        assigned_staff_name: inspectionRoom.assigned_housekeeper_name,
        inspection_notes: inspectionNotes,
      };

      await adminOperations.completeHousekeepingTurnaround({
        roomId: inspectionRoom.id,
        checklist: checklistPayload,
        inspectedBy: inspectorName,
      });

      const rNum = inspectionRoom.room_number;
      setInspectionRoom(null);
      showToast('success', `Room ${rNum} inspection passed! Certified Clean & Ready for Guest Check-In.`);
      await fetchHousekeepingData();
    } catch (err: any) {
      showToast('error', err.message || 'Error completing inspection');
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // Assign Housekeeper Staff Member
  const handleAssignHousekeeper = async (roomId: string, staffId: string) => {
    const selectedStaff = staffList.find((s) => s.id === staffId);
    if (!selectedStaff) return;

    setIsUpdating(roomId);
    try {
      await adminOperations.assignHousekeeper(roomId, selectedStaff.id, selectedStaff.full_name);
      showToast('success', `Room assigned to ${selectedStaff.full_name}`);
      await fetchHousekeepingData();
    } catch (err: any) {
      showToast('error', err.message || 'Error assigning staff');
    } finally {
      setIsUpdating(null);
    }
  };

  // Transition to Cleaning In Progress
  const handleStartCleaning = async (roomId: string) => {
    setIsUpdating(roomId);
    try {
      await adminOperations.updateHousekeeping({
        roomId,
        housekeepingStatus: 'in_progress',
        operationalStatus: 'cleaning',
        staffName: 'Housekeeping Console',
      });

      showToast('success', 'Room marked as Cleaning in Progress');
      await fetchHousekeepingData();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating status');
    } finally {
      setIsUpdating(null);
    }
  };

  // Revert / Set to Dirty (Turnaround Required)
  const handleMarkDirty = async (roomId: string) => {
    setIsUpdating(roomId);
    try {
      await adminOperations.updateHousekeeping({
        roomId,
        housekeepingStatus: 'dirty',
        operationalStatus: 'cleaning',
        staffName: 'Housekeeping Console',
      });

      showToast('success', 'Room queued for turnaround cleaning.');
      await fetchHousekeepingData();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating status');
    } finally {
      setIsUpdating(null);
    }
  };

  // Trigger Print for Housekeeping Daily Sheet
  const handlePrintSheet = () => {
    window.print();
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.room_number.includes(q) ||
        (r.category_name ? r.category_name.toLowerCase().includes(q) : false) ||
        (r.assigned_housekeeper_name ? r.assigned_housekeeper_name.toLowerCase().includes(q) : false);

      if (!matchesSearch) return false;
      if (filterFloor !== 'all' && r.floor_number !== filterFloor) return false;
      if (filterAttendant === 'unassigned') {
        if (r.assigned_housekeeper_id) return false;
      } else if (filterAttendant !== 'all') {
        if (r.assigned_housekeeper_id !== filterAttendant) return false;
      }

      return true;
    });
  }, [rooms, searchQuery, filterFloor, filterAttendant]);

  const dirtyRooms = useMemo(
    () => filteredRooms.filter((r) => r.housekeeping_status === 'dirty'),
    [filteredRooms]
  );
  const inProgressRooms = useMemo(
    () => filteredRooms.filter((r) => r.housekeeping_status === 'in_progress'),
    [filteredRooms]
  );
  const cleanRooms = useMemo(
    () => filteredRooms.filter((r) => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected'),
    [filteredRooms]
  );

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rooms.length || 25;
    const dirty = rooms.filter((r) => r.housekeeping_status === 'dirty').length;
    const inProg = rooms.filter((r) => r.housekeeping_status === 'in_progress').length;
    const clean = rooms.filter((r) => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected').length;
    const inspected = rooms.filter((r) => Boolean(r.turnaround_checklist)).length;
    const readyRate = total > 0 ? Math.round((clean / total) * 100) : 0;
    const staffCount = staffList.length;

    return { total, dirty, inProg, clean, inspected, readyRate, staffCount };
  }, [rooms, staffList]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Welcome & Telemetry Bar (Screen Only) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8D672F]">
              Facility &amp; Hygiene
            </span>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isConnected ? 'Live Sync Active' : `Sync: ${status}`}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2A1D13] flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#8D672F]" />
            <span>Housekeeping Turnaround &amp; Inspections</span>
          </h1>
          <p className="text-[#786A5B] text-xs mt-0.5">
            Room sanitization checklists, attendant floor assignments, and instant front-desk readiness sync.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handlePrintSheet}
            className="px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF6EE] text-[#8D672F] font-semibold text-xs flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Print Morning Turnaround Worksheet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>

          <button
            onClick={fetchHousekeepingData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#E6D9C5] bg-white hover:bg-[#FAF6EE] text-[#786A5B] hover:text-[#2A1D13] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Refresh Housekeeping Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* LUXURY KPI METRICS STRIP (Screen Only) */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">Total Rooms</span>
            <span className="text-2xl font-serif font-bold text-[#2A1D13] mt-1 block">{metrics.total}</span>
            <span className="text-[10px] text-[#8D672F] font-medium">3 Floors</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] text-[#8D672F] border border-[#E6D9C5]/60 flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">Dirty / Turnover</span>
            <span className="text-2xl font-serif font-bold text-[#2A1D13] mt-1 block">{metrics.dirty}</span>
            <span className="text-[10px] text-rose-700 font-medium">Needs Cleaning</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center font-bold">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">In Progress</span>
            <span className="text-2xl font-serif font-bold text-[#2A1D13] mt-1 block">{metrics.inProg}</span>
            <span className="text-[10px] text-amber-700 font-medium">Sanitizing</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">Clean &amp; Ready</span>
            <span className="text-2xl font-serif font-bold text-[#2A1D13] mt-1 block">{metrics.clean}</span>
            <span className="text-[10px] text-emerald-700 font-medium">For Walk-Ins</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">Inspections</span>
            <span className="text-2xl font-serif font-bold text-[#2A1D13] mt-1 block">{metrics.inspected}</span>
            <span className="text-[10px] text-[#8D672F] font-medium">Supervisor Pass</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] text-[#8D672F] border border-[#E6D9C5]/60 flex items-center justify-center font-bold">
            <ClipboardCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] hover:border-[#8D672F]/50 transition-all flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#786A5B] block">Readiness Rate</span>
            <span className="text-2xl font-serif font-bold text-[#8D672F] mt-1 block">{metrics.readyRate}%</span>
            <span className="text-[10px] text-[#786A5B] font-medium">{metrics.clean} / {metrics.total} clean</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FAF6EE] text-[#8D672F] border border-[#E6D9C5]/60 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar (Screen Only) */}
      <div className="print:hidden bg-white rounded-2xl border border-[#D8AD56]/20 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Floor Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-medium">Floor:</span>
          {(['all', 1, 2, 3] as const).map((fl) => (
            <button
              key={fl}
              onClick={() => setFilterFloor(fl)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterFloor === fl
                  ? 'bg-[#382216] text-[#D8AD56] shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {fl === 'all' ? 'All Floors' : `Floor ${fl}`}
            </button>
          ))}
        </div>

        {/* Attendant Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500 font-medium">Attendant:</span>
          <div className="min-w-[170px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={filterAttendant}
              onChange={(val) => setFilterAttendant(String(val))}
              options={[
                { value: 'all', label: 'All Attendants' },
                { value: 'unassigned', label: 'Unassigned Rooms' },
                ...staffList.map((s) => ({ value: s.id, label: `${s.full_name}` })),
              ]}
            />
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room number or attendant..."
            className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50/50 text-[#241912] focus:border-[#D8AD56] focus:outline-none"
          />
        </div>
      </div>

      {/* 3-Column Kanban Board (Screen Only) */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMN 1: DIRTY / TURNAROUND REQUIRED */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Turnaround Required</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
              {dirtyRooms.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            {dirtyRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">All rooms cleaned or occupied.</div>
            ) : (
              dirtyRooms.map((r) => {
                const isOOO = r.operational_status === 'maintenance';
                return (
                  <div key={r.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-lg text-[#241912]">Room {r.room_number}</span>
                          {isOOO && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-200 text-rose-900 border border-rose-300 flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5" />
                              <span>OOO Maint.</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Floor {r.floor_number} · {r.category_name}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                        Dirty
                      </span>
                    </div>

                    {/* Housekeeper Assignment Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-stone-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-[#D8AD56]" />
                        <span>Assigned Attendant</span>
                      </label>
                      <LuxurySelect
                        size="sm"
                        variant="admin"
                        value={r.assigned_housekeeper_id || ''}
                        placeholder="Select Staff Member..."
                        disabled={isUpdating === r.id}
                        onChange={(val) => handleAssignHousekeeper(r.id, String(val))}
                        options={[
                          { value: '', label: 'Select Staff Member...' },
                          ...staffList.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role})` })),
                        ]}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        disabled={isUpdating === r.id || isOOO}
                        onClick={() => handleStartCleaning(r.id)}
                        className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <Clock className="w-3 h-3" />
                        <span>Start Cleaning</span>
                      </button>

                      <button
                        disabled={isUpdating === r.id || isOOO}
                        onClick={() => handleOpenInspection(r)}
                        className="w-full py-2 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Inspect & Pass</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: IN PROGRESS CLEANING */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Cleaning In Progress</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {inProgressRooms.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            {inProgressRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">No rooms currently being sanitized.</div>
            ) : (
              inProgressRooms.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-serif font-bold text-lg text-[#241912]">Room {r.room_number}</span>
                      <div className="text-[11px] text-stone-500">
                        Floor {r.floor_number} · {r.category_name}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>In Progress</span>
                    </span>
                  </div>

                  {/* Housekeeper info / reassign */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-stone-500 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-600" />
                      <span>Assigned Attendant</span>
                    </label>
                    <LuxurySelect
                      size="sm"
                      variant="admin"
                      value={r.assigned_housekeeper_id || ''}
                      placeholder="Select Staff Member..."
                      disabled={isUpdating === r.id}
                      onChange={(val) => handleAssignHousekeeper(r.id, String(val))}
                      options={[
                        { value: '', label: 'Select Staff Member...' },
                        ...staffList.map((s) => ({ value: s.id, label: `${s.full_name} (${s.role})` })),
                      ]}
                    />
                  </div>

                  {/* Turnaround Inspection Button & Revert Option */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleOpenInspection(r)}
                      className="col-span-2 py-2.5 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#D8AD56]" />
                      <span>Inspect & Certify</span>
                    </button>

                    <button
                      disabled={isUpdating === r.id}
                      onClick={() => handleMarkDirty(r.id)}
                      className="py-2.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="Revert to Turnaround Required"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Revert</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: CLEAN & CERTIFIED */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Clean & Certified Ready</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {cleanRooms.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            {cleanRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">No rooms currently certified clean.</div>
            ) : (
              cleanRooms.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#241912] text-sm">Room {r.room_number}</span>
                      <span className="text-[10px] text-stone-500 ml-2">Floor {r.floor_number} · {r.category_name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#2E7D32] bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
                      Ready
                    </span>
                  </div>

                  {r.turnaround_checklist ? (
                    <div className="text-[10px] text-stone-500 border-t border-emerald-100/80 pt-1.5 space-y-0.5">
                      <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Inspected by: {r.turnaround_checklist.inspected_by || 'Supervisor'}</span>
                      </div>
                      {r.turnaround_checklist.completed_at && (
                        <div className="text-[9px] text-stone-400 font-mono">
                          {new Date(r.turnaround_checklist.completed_at).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Actions for clean rooms */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <button
                      onClick={() => handleOpenInspection(r)}
                      className="text-stone-500 hover:text-emerald-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                      <span>Re-Inspect</span>
                    </button>

                    <button
                      disabled={isUpdating === r.id}
                      onClick={() => handleMarkDirty(r.id)}
                      className="text-stone-500 hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      title="Mark room dirty for re-cleaning"
                    >
                      <RotateCcw className="w-3 h-3 text-rose-500" />
                      <span>Mark Dirty</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* PRINT-ONLY HOUSEKEEPING WORKSHEET */}
      <div className="hidden print:block space-y-4 p-4 text-black bg-white">
        <div className="border-b-2 border-black pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-serif tracking-wide">SRI TAYI GRAND</h1>
              <p className="text-xs text-gray-600">Bypass Road, Kadiri, Andhra Pradesh 515591</p>
            </div>
            <div className="text-right text-xs">
              <p className="font-bold">HOUSEKEEPING DAILY TURNAROUND WORKSHEET</p>
              <p>Printed: {printTimestamp}</p>
            </div>
          </div>
        </div>

        <table className="w-full text-left text-xs border border-gray-400 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400 font-bold">
              <th className="p-2 border-r border-gray-400">Room #</th>
              <th className="p-2 border-r border-gray-400">Floor</th>
              <th className="p-2 border-r border-gray-400">Category</th>
              <th className="p-2 border-r border-gray-400">Status</th>
              <th className="p-2 border-r border-gray-400">Assigned Attendant</th>
              <th className="p-2 border-r border-gray-400 text-center">Linen [ ]</th>
              <th className="p-2 border-r border-gray-400 text-center">Bath [ ]</th>
              <th className="p-2 border-r border-gray-400 text-center">AC [ ]</th>
              <th className="p-2 border-r border-gray-400 text-center">Floor [ ]</th>
              <th className="p-2 text-center">Sign</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-b border-gray-300">
                <td className="p-2 border-r border-gray-300 font-bold font-mono">Room {r.room_number}</td>
                <td className="p-2 border-r border-gray-300">Floor {r.floor_number}</td>
                <td className="p-2 border-r border-gray-300">{r.category_name}</td>
                <td className="p-2 border-r border-gray-300 uppercase font-bold text-[10px]">{r.housekeeping_status}</td>
                <td className="p-2 border-r border-gray-300">{r.assigned_housekeeper_name || '—'}</td>
                <td className="p-2 border-r border-gray-300 text-center">[ ]</td>
                <td className="p-2 border-r border-gray-300 text-center">[ ]</td>
                <td className="p-2 border-r border-gray-300 text-center">[ ]</td>
                <td className="p-2 border-r border-gray-300 text-center">[ ]</td>
                <td className="p-2 text-center">____________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: TURNAROUND INSPECTION CHECKLIST */}
      {inspectionRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#43001F]" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  Turnaround Inspection: Room {inspectionRoom.room_number}
                </h3>
              </div>
              <button
                onClick={() => setInspectionRoom(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EFE3D6] text-xs flex justify-between items-center">
              <div>
                <span className="text-stone-500">Category:</span>
                <span className="font-bold text-[#241912] ml-1.5">{inspectionRoom.category_name}</span>
              </div>
              <div>
                <span className="text-stone-500">Attendant:</span>
                <span className="font-bold text-[#241912] ml-1.5">
                  {inspectionRoom.assigned_housekeeper_name || 'Housekeeping Staff'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompleteInspection} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                    Mandatory 5-Point Quality Checklist:
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleCheckAll}
                    className="text-[11px] font-bold text-[#8A5A2B] hover:text-[#382216] transition-colors cursor-pointer"
                  >
                    {allInspectionItemsChecked ? 'Uncheck All' : 'Pass All Checks (Check All)'}
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Item 1 */}
                  <label className="p-3 rounded-xl border border-gray-200 hover:bg-[#FAF7F2] flex items-center gap-3 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={chkLinen}
                      onChange={(e) => setChkLinen(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#241912]">Fresh bedsheets & pillow covers replaced</span>
                      <p className="text-[10px] text-stone-500">Crisp white linen, stain-free and ironed</p>
                    </div>
                  </label>

                  {/* Item 2 */}
                  <label className="p-3 rounded-xl border border-gray-200 hover:bg-[#FAF7F2] flex items-center gap-3 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={chkTowels}
                      onChange={(e) => setChkTowels(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#241912]">Fresh bath towels & bath mats placed</span>
                      <p className="text-[10px] text-stone-500">2 bath towels, 2 hand towels, and dry bath mat</p>
                    </div>
                  </label>

                  {/* Item 3 */}
                  <label className="p-3 rounded-xl border border-gray-200 hover:bg-[#FAF7F2] flex items-center gap-3 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={chkBathToiletries}
                      onChange={(e) => setChkBathToiletries(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#241912]">Bathroom sanitized & toiletries restocked</span>
                      <p className="text-[10px] text-stone-500">Toilet sanitized, mirrors cleaned, soap & shampoo kits placed</p>
                    </div>
                  </label>

                  {/* Item 4 */}
                  <label className="p-3 rounded-xl border border-gray-200 hover:bg-[#FAF7F2] flex items-center gap-3 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={chkAcGeyser}
                      onChange={(e) => setChkAcGeyser(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#241912]">AC & hot water geyser operational</span>
                      <p className="text-[10px] text-stone-500">AC set to 24°C, hot water flow tested, all switches active</p>
                    </div>
                  </label>

                  {/* Item 5 */}
                  <label className="p-3 rounded-xl border border-gray-200 hover:bg-[#FAF7F2] flex items-center gap-3 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={chkFloorDustbin}
                      onChange={(e) => setChkFloorDustbin(e.target.checked)}
                      className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-[#241912]">Floor mopped and dustbins emptied</span>
                      <p className="text-[10px] text-stone-500">Tile disinfectant sweep, dustbin with new liner placed</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Inspector Name */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Inspected By *
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none bg-stone-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Supervisor Remarks
                  </label>
                  <input
                    type="text"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Optional notes or remarks"
                    className="w-full text-xs p-2 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none bg-stone-50/50"
                  />
                </div>
              </div>

              {!allInspectionItemsChecked && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Room cannot be marked clean without passing all 5 inspection checklist points.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setInspectionRoom(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!allInspectionItemsChecked || isSubmittingInspection}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmittingInspection ? 'Certifying...' : 'Pass Inspection & Certify Clean'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
