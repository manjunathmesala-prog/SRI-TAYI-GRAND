'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
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

export default function RoomInventoryPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [editingRoom, setEditingRoom] = useState<PhysicalRoom | null>(null);

  // Edit modal fields
  const [newStatus, setNewStatus] = useState<OperationalStatus>('available');
  const [newHkStatus, setNewHkStatus] = useState<HousekeepingStatus>('clean');
  const [notes, setNotes] = useState('');

  const rooms = repo.getRooms();

  const filteredRooms = rooms.filter((r) => {
    if (selectedFloor !== 'all' && r.floor_number !== selectedFloor) return false;
    if (selectedStatus !== 'all' && r.operational_status !== selectedStatus) return false;
    return true;
  });

  const handleUpdateStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    repo.updateRoomStatus(editingRoom.id, newStatus, newHkStatus, notes);
    setEditingRoom(null);
    setRefreshKey((k) => k + 1);
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            PHYSICAL INVENTORY BOARD
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <BedDouble className="w-6 h-6 text-[#D8AD56]" />
            <span>Room Inventory Management</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Monitor and manage physical room statuses, housekeeping readiness, and maintenance blocks across all floors.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Floor filter */}
          <div className="min-w-[150px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={selectedFloor}
              onChange={(val) => setSelectedFloor(val === 'all' ? 'all' : Number(val))}
              options={[
                { value: 'all', label: 'All Floors (1–3)' },
                { value: 1, label: 'Floor 1' },
                { value: 2, label: 'Floor 2' },
                { value: 3, label: 'Floor 3' },
              ]}
            />
          </div>

          {/* Status filter */}
          <div className="min-w-[180px]">
            <LuxurySelect
              size="sm"
              variant="admin"
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(String(val))}
              options={[
                { value: 'all', label: 'All Operational Statuses' },
                { value: 'available', label: 'Available' },
                { value: 'occupied', label: 'Occupied' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'cleaning', label: 'Cleaning' },
                { value: 'maintenance', label: 'Maintenance' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Visual Room Inventory Board */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            onClick={() => {
              setEditingRoom(room);
              setNewStatus(room.operational_status);
              setNewHkStatus(room.housekeeping_status);
              setNotes(room.notes || '');
            }}
            className="bg-white rounded-2xl border border-[#D8AD56]/30 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group hover:border-[#D8AD56]"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif text-xl font-bold text-[#241912] group-hover:text-[#D8AD56] transition-colors">
                  {room.room_number}
                </span>
                <span className="text-[10px] text-[#786B61]">F{room.floor_number}</span>
              </div>

              <div className="text-[11px] font-medium text-[#786B61] mt-1 line-clamp-1">
                {room.category_name}
              </div>

              {room.current_guest_name && (
                <div className="mt-2 text-[10px] text-[#241912] font-semibold bg-[#FAF7F2] p-1.5 rounded line-clamp-1">
                  <span className="flex items-center gap-1.5"><User className="w-3 h-3 text-[#D8AD56]" /><span>{room.current_guest_name}</span></span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-2 border-t border-[#FAF7F2] space-y-1">
              <span className={`block text-center py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(room.operational_status)}`}>
                {room.operational_status}
              </span>
              <div className="flex items-center justify-between text-[9px] text-[#786B61] px-1">
                <span>HK: <strong className={room.housekeeping_status === 'clean' ? 'text-[#2E7D32]' : 'text-[#E65100]'}>{room.housekeeping_status}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT ROOM STATUS MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">ROOM CONTROLLER</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  Manage Room {editingRoom.room_number}
                </h3>
              </div>
              <button onClick={() => setEditingRoom(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div className="text-xs text-[#786B61]">
                Category: <strong>{editingRoom.category_name}</strong> · Floor: <strong>{editingRoom.floor_number}</strong>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Operational Status
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={newStatus}
                  onChange={(val) => setNewStatus(val as OperationalStatus)}
                  options={[
                    { value: 'available', label: 'Available (Vacant & Ready)' },
                    { value: 'occupied', label: 'Occupied (Guest In-House)' },
                    { value: 'reserved', label: 'Reserved (Awaiting Arrival)' },
                    { value: 'cleaning', label: 'Cleaning (Housekeeping Assigned)' },
                    { value: 'maintenance', label: 'Maintenance (Blocked for Repair)' },
                    { value: 'out_of_service', label: 'Out of Service' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Housekeeping Readiness
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={newHkStatus}
                  onChange={(val) => setNewHkStatus(val as HousekeepingStatus)}
                  options={[
                    { value: 'clean', label: 'Clean (Ready for Inspection/Guest)' },
                    { value: 'dirty', label: 'Dirty (Requires Turnover Cleaning)' },
                    { value: 'in_progress', label: 'In Progress (Staff Currently Inside)' },
                    { value: 'inspected', label: 'Inspected (Supervisor Approved)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Internal Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Balcony lock inspected; AC working normally."
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015]"
                >
                  Update Room Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
