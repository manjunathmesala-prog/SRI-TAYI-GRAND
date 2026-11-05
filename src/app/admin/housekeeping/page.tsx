'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { PhysicalRoom, HousekeepingStatus } from '@/types';
import { Sparkles, CheckCircle2, Clock, AlertTriangle, User, RefreshCw } from 'lucide-react';

export default function HousekeepingAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const rooms = repo.getRooms();

  const dirtyRooms = rooms.filter((r) => r.housekeeping_status === 'dirty');
  const inProgressRooms = rooms.filter((r) => r.housekeeping_status === 'in_progress');
  const cleanRooms = rooms.filter((r) => r.housekeeping_status === 'clean' || r.housekeeping_status === 'inspected');

  const updateStatus = (roomId: string, newHkStatus: HousekeepingStatus) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    // If marked clean or inspected and was in cleaning operational status, make it available
    const newOpStatus = newHkStatus === 'clean' || newHkStatus === 'inspected'
      ? (room.operational_status === 'cleaning' ? 'available' : room.operational_status)
      : (room.operational_status === 'available' ? 'cleaning' : room.operational_status);

    repo.updateRoomStatus(roomId, newOpStatus, newHkStatus);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            FACILITY MAINTENANCE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#D8AD56]" />
            <span>Housekeeping Operations</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Turnover sanitization, deep cleaning tracking, room inspections, and linen management.
          </p>
        </div>
      </div>

      {/* RFID Cleaner Card Dual-Tap Automation Banner */}
      <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <strong className="block text-cyan-950">RFID Cleaner Card Dual-Tap Automation Active</strong>
            <span className="text-cyan-900/80 text-[11px]">
              Tap 1 (Cleaner enters): automatically moves room to &ldquo;In Progress&rdquo; &bull; Tap 2 / Door Lock (Cleaner exits): automatically moves room to &ldquo;Clean &amp; Available&rdquo;.
            </span>
          </div>
        </div>
        <a
          href="/admin/rfid"
          className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs shrink-0 transition-colors"
        >
          Manage Cleaning Cards &rarr;
        </a>
      </div>

      {/* Housekeeping Columns: Dirty, In Progress, Clean */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Pending Cleaning (Dirty) */}
        <div className="bg-white rounded-2xl border border-red-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Needs Cleaning</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
              {dirtyRooms.length}
            </span>
          </div>

          <div className="space-y-3">
            {dirtyRooms.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#786B61]">All rooms currently attended!</div>
            ) : (
              dirtyRooms.map((r) => (
                <div key={r.id} className="p-3.5 rounded-xl border border-red-100 bg-red-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-base text-[#241912]">Room {r.room_number}</span>
                    <span className="text-[10px] text-[#786B61]">Floor {r.floor_number}</span>
                  </div>
                  <div className="text-xs text-[#786B61]">{r.category_name}</div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(r.id, 'in_progress')}
                      className="w-full py-1.5 rounded-lg bg-[#382216] text-[#EFE3D6] text-xs font-semibold hover:bg-[#25150F]"
                    >
                      Start Cleaning
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: In-Progress */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">In Progress</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
              {inProgressRooms.length}
            </span>
          </div>

          <div className="space-y-3">
            {inProgressRooms.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#786B61]">No rooms in active cleaning.</div>
            ) : (
              inProgressRooms.map((r) => (
                <div key={r.id} className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-base text-[#241912]">Room {r.room_number}</span>
                    <span className="text-[10px] text-[#786B61]">Floor {r.floor_number}</span>
                  </div>
                  <div className="text-xs text-[#786B61]">{r.category_name}</div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(r.id, 'clean')}
                      className="w-full py-1.5 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940]"
                    >
                      Mark Clean & Ready
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Clean & Inspected */}
        <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-green-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h3 className="font-serif font-bold text-base text-[#241912]">Clean & Ready</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
              {cleanRooms.length}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {cleanRooms.map((r) => (
              <div key={r.id} className="p-3 rounded-xl border border-green-100 bg-green-50/30 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#241912]">Room {r.room_number}</span>
                  <span className="text-[10px] text-[#786B61] ml-2">F{r.floor_number} · {r.category_name}</span>
                </div>
                <span className="text-[10px] font-bold text-[#2E7D32] bg-white px-2 py-0.5 rounded border border-green-200">
                  {r.housekeeping_status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
