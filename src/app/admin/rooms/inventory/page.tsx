'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhysicalRoom, OperationalStatus, HousekeepingStatus } from '@/types';
import {
  BedDouble,
  Filter,
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  RefreshCw,
  User,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import { authStorage } from '@/lib/auth-storage';

export default function RoomInventoryPage() {
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<PhysicalRoom | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Edit modal fields
  const [newStatus, setNewStatus] = useState<OperationalStatus>('available');
  const [newHkStatus, setNewHkStatus] = useState<HousekeepingStatus>('clean');
  const [notes, setNotes] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      const data = await adminOperations.fetchFullState();
      if (data.success && data.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.warn('Failed to load room inventory', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useRealtimeSync({
    onRefresh: fetchRooms,
  });

  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor_number !== selectedFloor) return false;
    if (selectedStatus !== 'all' && r.operational_status !== selectedStatus) return false;
    return true;
  });

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setIsSubmitting(true);
    try {
      const token = authStorage.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/rooms/inventory', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          roomId: editingRoom.id,
          operationalStatus: newStatus,
          housekeepingStatus: newHkStatus,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update room');
      }

      setToast(`Room ${editingRoom.room_number} status updated and synced to Supabase!`);
      setTimeout(() => setToast(null), 4000);
      setEditingRoom(null);
      await fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to update room status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'available':
        return 'bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]';
      case 'occupied':
        return 'bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]';
      case 'reserved':
        return 'bg-[#E3F2FD] text-[#1565C0] border-[#BBDEFB]';
      case 'cleaning':
        return 'bg-[#F3E5F5] text-[#6A1B9A] border-[#E1BEE7]';
      case 'maintenance':
      case 'out_of_service':
        return 'bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getHkBadge = (status: HousekeepingStatus) => {
    switch (status) {
      case 'clean':
        return 'text-[#2E7D32] bg-emerald-50 border-emerald-200';
      case 'dirty':
        return 'text-[#C62828] bg-rose-50 border-rose-200';
      case 'in_progress':
        return 'text-[#E65100] bg-amber-50 border-amber-200';
      case 'inspected':
        return 'text-[#1565C0] bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            HOTEL INVENTORY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-[#D8AD56]" />
            <span>Physical Rooms Register</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Monitor real-time room occupancies, housekeeping readiness, and maintenance statuses across Floors 1 to 3.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRooms()}
            className="px-3.5 py-2 rounded-xl border border-[#D8AD56]/40 hover:bg-[#FAF7F2] text-xs font-semibold text-[#382216] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#786B61]" />
          <span className="text-xs font-semibold text-[#241912]">Filter By:</span>

          <div className="w-36">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={selectedFloor}
              onChange={(val) => setSelectedFloor(val as any)}
              options={[
                { value: 'all', label: 'All Floors' },
                { value: 1, label: 'Floor 1 (101-110)' },
                { value: 2, label: 'Floor 2 (201-210)' },
                { value: 3, label: 'Floor 3 (301-305)' },
              ]}
            />
          </div>

          <div className="w-40">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(String(val))}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'available', label: 'Available' },
                { value: 'occupied', label: 'Occupied' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          </div>
        </div>

        <div className="text-xs text-[#786B61]">
          Showing <strong>{filteredRooms.length}</strong> of <strong>{rooms.length}</strong> rooms
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map((room) => {
          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-xs hover:border-[#D8AD56]/60 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#FAF7F2]">
                  <span className="font-serif text-lg font-bold text-[#241912]">
                    Room {room.room_number}
                  </span>
                  <span className="text-[10px] text-[#786B61] font-medium">Floor {room.floor_number}</span>
                </div>

                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="text-[11px] text-[#786B61] font-semibold">{room.category_name}</div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getStatusBadge(room.operational_status)}`}>
                      {room.operational_status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border ${getHkBadge(room.housekeeping_status)}`}>
                      {room.housekeeping_status.replace('_', ' ')}
                    </span>
                  </div>

                  {room.current_guest_name && (
                    <div className="mt-2 p-2 rounded-lg bg-[#FAF7F2] text-[11px] flex items-center gap-1.5 text-[#382216]">
                      <User className="w-3.5 h-3.5 text-[#D8AD56] shrink-0" />
                      <span className="truncate font-semibold">{room.current_guest_name}</span>
                    </div>
                  )}

                  {room.notes && (
                    <p className="text-[10px] text-gray-500 italic mt-1 line-clamp-2">
                      &quot;{room.notes}&quot;
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingRoom(room);
                  setNewStatus(room.operational_status);
                  setNewHkStatus(room.housekeeping_status);
                  setNotes(room.notes || '');
                }}
                className="w-full py-1.5 text-center text-xs font-semibold rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-[#382216] transition-colors"
              >
                Update Status
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit Status Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">ROOM OVERRIDE</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Update Room {editingRoom.room_number}</h3>
              </div>
              <button onClick={() => setEditingRoom(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Operational Status
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={newStatus}
                  onChange={(val) => setNewStatus(val as any)}
                  options={[
                    { value: 'available', label: 'Available (Vacant)' },
                    { value: 'occupied', label: 'Occupied (Active Stay)' },
                    { value: 'reserved', label: 'Reserved' },
                    { value: 'cleaning', label: 'Cleaning In Progress' },
                    { value: 'maintenance', label: 'Maintenance / Out of Order' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Housekeeping Status
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={newHkStatus}
                  onChange={(val) => setNewHkStatus(val as any)}
                  options={[
                    { value: 'clean', label: 'Clean (Ready for Guest)' },
                    { value: 'dirty', label: 'Dirty (Requires Cleaning)' },
                    { value: 'in_progress', label: 'In Progress (Maid Inside)' },
                    { value: 'inspected', label: 'Inspected (Supervisor Approved)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Maintenance / Inspection Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Balcony lock inspected; AC working normally."
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isSubmitting ? 'Syncing...' : 'Update Room Status'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
