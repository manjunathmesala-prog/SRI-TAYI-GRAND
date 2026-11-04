'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { RFIDCard, RFIDDevice, RFIDAccessEvent } from '@/types';
import { issueGuestRoomKey, revokeGuestRoomKey, simulateDoorTap } from '@/lib/rfid';
import {
  KeyRound,
  Radio,
  Wifi,
  Battery,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Play,
  X,
} from 'lucide-react';

export default function RFIDAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'cards' | 'devices' | 'logs' | 'emulator'>('cards');

  // Issue card modal
  const [isIssuingCard, setIsIssuingCard] = useState(false);
  const [issueRoom, setIssueRoom] = useState('205');
  const [issueGuest, setIssueGuest] = useState('P. Sudhakar Reddy');
  const [issueRef, setIssueRef] = useState('STG-20261105-3921');

  // Emulator state
  const [tapCardUid, setTapCardUid] = useState('E0-04-1A-8B-3C-91');
  const [tapRoom, setTapRoom] = useState('202');
  const [tapResult, setTapResult] = useState<any>(null);

  const devices = repo.getRFIDDevices();
  const cards = repo.getRFIDCards();
  const events = repo.getRFIDEvents();

  const handleIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    await issueGuestRoomKey(issueRoom, issueRef, issueGuest, 'Front Desk');
    setIsIssuingCard(false);
    setRefreshKey((k) => k + 1);
  };

  const handleDeactivate = (cardId: string) => {
    revokeGuestRoomKey(cardId, 'Manual Admin Revocation');
    setRefreshKey((k) => k + 1);
  };

  const handleRunTapSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/rfid/tap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardUid: tapCardUid, roomNumber: tapRoom }),
    });
    const data = await res.json();
    setTapResult(data);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            IOT & DOOR LOCK INTEGRATION
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#D8AD56]" />
            <span>RFID Smart Room Key Integration</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Vendor-independent RFID lock registry, guest keycard issuance, door access tap logs, and testing emulator.
          </p>
        </div>

        <button
          onClick={() => setIsIssuingCard(true)}
          className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Encode & Issue New Keycard</span>
        </button>
      </div>

      {/* Integration Status Notice */}
      <div className="p-4 rounded-2xl bg-[#25150F] text-[#EFE3D6] border border-[#D8AD56]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#382216] border border-[#D8AD56] flex items-center justify-center text-[#D8AD56]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-white text-sm">Vendor-Agnostic RFID Hardware Bridge</h4>
            <p className="text-xs text-[#EFE3D6]/70">
              Provider Mode: <strong>Sri Tayi Grand Safe Test Emulator</strong> · Cloud Ingestion API Active
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
          SYSTEM READY
        </span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'cards'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          Active Keycards ({cards.filter((c) => c.status === 'active').length})
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'devices'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          Enrolled Lock Devices ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          Access Tap Stream ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('emulator')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'emulator'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          Live Door Tap Simulator
        </button>
      </div>

      {/* TAB 1: CARDS */}
      {activeTab === 'cards' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Card Label</th>
                  <th className="py-3.5 px-4 font-semibold">UID</th>
                  <th className="py-3.5 px-4 font-semibold">Assigned Room</th>
                  <th className="py-3.5 px-4 font-semibold">Guest</th>
                  <th className="py-3.5 px-4 font-semibold">Expires At</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#382216]">{c.card_label}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#786B61]">{c.card_uid}</td>
                    <td className="py-3.5 px-4">
                      {c.assigned_room_number ? (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#EFE3D6] font-bold">
                          Room {c.assigned_room_number}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">Master Pass</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{c.guest_name || 'Staff Member'}</td>
                    <td className="py-3.5 px-4 text-[#786B61]">
                      {c.expires_at ? new Date(c.expires_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEVICES */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {devices.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#241912]">{d.device_name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#2E7D32]">
                  {d.status}
                </span>
              </div>
              <div className="text-xs text-[#786B61] space-y-1">
                <div>Type: <strong>{d.device_type}</strong></div>
                <div>Room: <strong>{d.room_number || 'Encoder Station'}</strong></div>
                <div>IP: <span className="font-mono">{d.ip_address}</span></div>
                <div>Firmware: <span className="font-mono">{d.firmware_version}</span></div>
              </div>
              {d.battery_level !== undefined && (
                <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[#2E7D32]">
                    <Battery className="w-4 h-4" />
                    <span>Battery: <strong>{d.battery_level}%</strong></span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: ACCESS LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Time</th>
                  <th className="py-3.5 px-4 font-semibold">Event</th>
                  <th className="py-3.5 px-4 font-semibold">Room Target</th>
                  <th className="py-3.5 px-4 font-semibold">Card UID</th>
                  <th className="py-3.5 px-4 font-semibold">Reason</th>
                  <th className="py-3.5 px-4 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 text-[#786B61]">
                      {new Date(evt.occurred_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                        evt.event_type === 'access_granted' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-red-100 text-red-800'
                      }`}>
                        {evt.event_type === 'access_granted' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{evt.event_type.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#382216]">Room {evt.room_number}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#786B61]">{evt.card_uid || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-xs">{evt.reason || 'Verified tap'}</td>
                    <td className="py-3.5 px-4 text-[10px] uppercase text-[#786B61]">{evt.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EMULATOR / SIMULATOR */}
      {activeTab === 'emulator' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury max-w-2xl mx-auto space-y-6">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              HARDWARE TEST HARNESS
            </span>
            <h3 className="font-serif text-xl font-bold text-[#241912] mt-0.5">
              Simulate Door Lock RFID Tap
            </h3>
            <p className="text-xs text-[#786B61] mt-1">
              Test how the locking firmware verifies physical card UIDs against active booking dates and room assignments.
            </p>
          </div>

          <form onSubmit={handleRunTapSimulation} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                Card UID to Tap
              </label>
              <select
                value={tapCardUid}
                onChange={(e) => setTapCardUid(e.target.value)}
                className="w-full text-xs font-mono font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.card_uid}>
                    {c.card_uid} ({c.card_label} - Assigned: Room {c.assigned_room_number || 'None'} - {c.status})
                  </option>
                ))}
                <option value="E0-04-1A-99-99-99">E0-04-1A-99-99-99 (Unregistered / Random UID)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                Physical Room Lock Reader Target
              </label>
              <select
                value={tapRoom}
                onChange={(e) => setTapRoom(e.target.value)}
                className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
              >
                {repo.getRooms().map((r) => (
                  <option key={r.id} value={r.room_number}>
                    Lock on Room {r.room_number} (Floor {r.floor_number})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 text-[#D8AD56]" />
              <span>Tap RFID Card on Room Lock</span>
            </button>
          </form>

          {tapResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                tapResult.accessGranted
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {tapResult.accessGranted ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>ACCESS GRANTED — LOCK UNLATCHED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>ACCESS DENIED — LOCK LOCKED</span>
                  </>
                )}
              </div>
              <div>Event Reason: {tapResult.event?.reason}</div>
              <div className="text-[10px] text-gray-500 font-mono">Timestamp: {tapResult.event?.occurred_at}</div>
            </div>
          )}
        </div>
      )}

      {/* ISSUE CARD MODAL */}
      {isIssuingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">ENCODER STATION</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Issue RFID Keycard</h3>
              </div>
              <button onClick={() => setIsIssuingCard(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueCard} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Assign to Room
                </label>
                <select
                  value={issueRoom}
                  onChange={(e) => setIssueRoom(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                >
                  {repo.getRooms().map((r) => (
                    <option key={r.id} value={r.room_number}>
                      Room {r.room_number} (Floor {r.floor_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Guest Name
                </label>
                <input
                  type="text"
                  required
                  value={issueGuest}
                  onChange={(e) => setIssueGuest(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Booking Reference
                </label>
                <input
                  type="text"
                  required
                  value={issueRef}
                  onChange={(e) => setIssueRef(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setIsIssuingCard(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940]"
                >
                  Encode & Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
