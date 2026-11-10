'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhysicalRoom, HousekeepingStatus, StaffMember, HousekeepingTurnaroundChecklist } from '@/types';
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
} from 'lucide-react';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';

export default function HousekeepingAdminPage() {
  const { t, formatCurrency, formatDate, translateStatus, isTelugu } = useAdminLanguage();
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Turnaround Inspection Modal State
  const [inspectionRoom, setInspectionRoom] = useState<PhysicalRoom | null>(null);
  const [chkLinen, setChkLinen] = useState(false);
  const [chkTowels, setChkTowels] = useState(false);
  const [chkBathToiletries, setChkBathToiletries] = useState(false);
  const [chkAcGeyser, setChkAcGeyser] = useState(false);
  const [chkFloorDustbin, setChkFloorDustbin] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectorName, setInspectorName] = useState('G. Mohan Kumar (Hotel Manager)');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHousekeepingData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/housekeeping', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
        if (data.housekeepingStaff) setStaffList(data.housekeepingStaff);
      } else {
        const stateData = await adminOperations.fetchFullState();
        if (stateData.success && stateData.rooms) {
          setRooms(stateData.rooms);
        }
      }
    } catch {
      const stateData = await adminOperations.fetchFullState();
      if (stateData.success && stateData.rooms) {
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

      const res = await fetch('/api/admin/housekeeping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'complete_turnaround',
          roomId: inspectionRoom.id,
          checklist: checklistPayload,
          inspectedBy: inspectorName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to pass turnaround inspection');
      }

      setInspectionRoom(null);
      showToast('success', 'Room inspection passed and room marked clean & available.');
      adminOperations.invalidateFullState();
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
      const res = await fetch('/api/admin/housekeeping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'assign_housekeeper',
          roomId,
          staffId: selectedStaff.id,
          staffName: selectedStaff.full_name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign housekeeper');
      }

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
      const res = await fetch('/api/admin/housekeeping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'update_status',
          roomId,
          housekeepingStatus: 'in_progress',
          operationalStatus: 'cleaning',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update cleaning status');
      }

      showToast('success', 'Room marked as cleaning in progress');
      adminOperations.invalidateFullState();
      await fetchHousekeepingData();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating status');
    } finally {
      setIsUpdating(null);
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.room_number.includes(searchQuery) ||
      (r.category_name ? r.category_name.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
      (r.assigned_housekeeper_name ? r.assigned_housekeeper_name.toLowerCase().includes(searchQuery.toLowerCase()) : false);

    if (!matchesSearch) return false;
    if (filterFloor === 'all') return true;
    return r.floor_number === filterFloor;
  });

  const dirtyRooms = filteredRooms.filter((r) => r.housekeeping_status === 'dirty');
  const inProgressRooms = filteredRooms.filter((r) => r.housekeeping_status === 'in_progress');
  const cleanRooms = filteredRooms.filter(
    (r) => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected'
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              FACILITY & HYGIENE MANAGEMENT
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Real-Time Sync Active' : `Sync: ${status}`}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D8AD56]" />
            <span>Housekeeping Turnaround & Inspections</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            5-point turnaround inspection checklist, staff duty assignments, live turnover kanban, and RFID synchronization.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search room or staff..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#EFE3D6] rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterFloor('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterFloor === 'all' ? 'bg-[#382216] text-[#D8AD56]' : 'text-[#786B61]'
              }`}
            >
              All Floors
            </button>
            {[1, 2, 3, 4].map((fl) => (
              <button
                key={fl}
                onClick={() => setFilterFloor(fl)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterFloor === fl ? 'bg-[#382216] text-[#D8AD56]' : 'text-[#786B61]'
                }`}
              >
                F{fl}
              </button>
            ))}
          </div>

          <button
            onClick={fetchHousekeepingData}
            className="p-2 rounded-xl bg-white border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#786B61] text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Refresh Housekeeping Board"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMN 1: DIRTY / VACANT DIRTY */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Turnaround Required</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
              {dirtyRooms.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            {dirtyRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#786B61]">All rooms cleaned or occupied.</div>
            ) : (
              dirtyRooms.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-serif font-bold text-lg text-[#241912]">Room {r.room_number}</span>
                      <div className="text-[11px] text-[#786B61]">
                        Floor {r.floor_number} · {r.category_name}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                      Dirty
                    </span>
                  </div>

                  {/* Housekeeper Assignment Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-[#786B61] flex items-center gap-1">
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
                      disabled={isUpdating === r.id}
                      onClick={() => handleStartCleaning(r.id)}
                      className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Start Cleaning
                    </button>
                    <button
                      onClick={() => handleOpenInspection(r)}
                      className="w-full py-2 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>
                  </div>
                </div>
              ))
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
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {inProgressRooms.length}
            </span>
          </div>

          <div className="space-y-3.5 max-h-[700px] overflow-y-auto pr-1">
            {inProgressRooms.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#786B61]">No rooms currently being sanitized.</div>
            ) : (
              inProgressRooms.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-serif font-bold text-lg text-[#241912]">Room {r.room_number}</span>
                      <div className="text-[11px] text-[#786B61]">
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
                    <label className="text-[10px] font-bold uppercase text-[#786B61] flex items-center gap-1">
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

                  {/* Turnaround Inspection Button */}
                  <div className="pt-1">
                    <button
                      onClick={() => handleOpenInspection(r)}
                      className="w-full py-2.5 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#D8AD56]" />
                      <span>Inspect & Certify Clean</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: CLEAN & READY */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Clean & Certified</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {cleanRooms.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {cleanRooms.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#241912]">Room {r.room_number}</span>
                    <span className="text-[10px] text-[#786B61] ml-2">F{r.floor_number} · {r.category_name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                    Ready
                  </span>
                </div>

                {r.turnaround_checklist ? (
                  <div className="text-[10px] text-[#786B61] border-t border-emerald-100 pt-1.5 space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-800 font-medium">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Inspected by: {r.turnaround_checklist.inspected_by || 'Supervisor'}</span>
                    </div>
                    {r.turnaround_checklist.completed_at && (
                      <div className="text-[9px] text-[#A89F91]">
                        {new Date(r.turnaround_checklist.completed_at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: TURNAROUND INSPECTION CHECKLIST */}
      {inspectionRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                <span className="text-[#786B61]">Category:</span>
                <span className="font-bold text-[#241912] ml-1.5">{inspectionRoom.category_name}</span>
              </div>
              <div>
                <span className="text-[#786B61]">Attendant:</span>
                <span className="font-bold text-[#241912] ml-1.5">
                  {inspectionRoom.assigned_housekeeper_name || 'Housekeeping Staff'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCompleteInspection} className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#786B61] block mb-2">
                  Mandatory Turnaround Quality Checklist:
                </span>

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
                      <p className="text-[10px] text-[#786B61]">Crisp white linen, stain-free and ironed</p>
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
                      <p className="text-[10px] text-[#786B61]">2 bath towels, 2 hand towels, and dry bath mat</p>
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
                      <p className="text-[10px] text-[#786B61]">Toilet sanitized, mirrors cleaned, soap & shampoo kits placed</p>
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
                      <p className="text-[10px] text-[#786B61]">AC set to 24°C, hot water flow tested, all switches active</p>
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
                      <p className="text-[10px] text-[#786B61]">Tile disinfectant sweep, dustbin with new liner placed</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Inspector Name */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Inspected By *
                  </label>
                  <input
                    type="text"
                    required
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Supervisor Notes
                  </label>
                  <input
                    type="text"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="Optional notes or remarks"
                    className="w-full text-xs p-2 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
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
                  <span>{isSubmittingInspection ? 'Certifying...' : 'Pass Inspection & Mark Clean'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
