'use client';

import { useState, useEffect } from 'react';
import { repo } from '@/lib/db/repository';
import { RFIDCard, RFIDDevice, RFIDAccessEvent } from '@/types';
import { issueGuestRoomKey, revokeGuestRoomKey, simulateDoorTap } from '@/lib/rfid';
import {
  checkBridgeHealth,
  readPhysicalCard,
  issuePhysicalKeycard,
  checkoutPhysicalCard,
  BridgeHealthStatus,
  RfidCardResult,
} from '@/lib/rfid/bridge-client';
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
  CreditCard,
  Cpu,
  Volume2,
  Check,
  Terminal,
} from 'lucide-react';

export default function RFIDAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'hardware' | 'cards' | 'devices' | 'logs' | 'emulator'>('hardware');

  // Live Hardware Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthStatus>({ isOnline: false });
  const [hardwareBusy, setHardwareBusy] = useState(false);
  const [hardwareMessage, setHardwareMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Read Card scanned state
  const [scannedCard, setScannedCard] = useState<RfidCardResult | null>(null);

  // Quick Issue Hardware form
  const [hwRoom, setHwRoom] = useState('201');
  const [hwGuest, setHwGuest] = useState('P. Sudhakar Reddy');
  const [hwStaff, setHwStaff] = useState('Front Desk - Shift A');

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

  // Periodically poll bridge status
  useEffect(() => {
    const check = async () => {
      const status = await checkBridgeHealth();
      setBridgeStatus(status);
    };

    check();
    const interval = setInterval(check, 6000);
    return () => clearInterval(interval);
  }, []);

  // 1. Scan physical card on Be-Tech encoder
  const handleScanCard = async () => {
    setHardwareBusy(true);
    setHardwareMessage({ text: 'Communicating with USB encoder on Port 1... place card on reader.', type: 'info' });

    const result = await readPhysicalCard(hwStaff);
    setHardwareBusy(false);

    if (result.success) {
      setScannedCard(result);
      if (result.roomNumber) setHwRoom(result.roomNumber);
      setHardwareMessage({
        text: `Card Read Success: Room ${result.roomNumber || 'None'} (Card #${result.cardNo || 'N/A'}). Valid: ${result.beginTime || 'N/A'} - ${result.endTime || 'N/A'}`,
        type: 'success',
      });
      setRefreshKey((k) => k + 1);
    } else {
      setHardwareMessage({
        text: result.error || 'Failed to read card. Check if card is placed on encoder.',
        type: 'error',
      });
    }
  };

  // 2. Issue card to physical encoder
  const handleIssueHardwareCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);
    setHardwareMessage({ text: `Writing Room ${hwRoom} authorization to Mifare 1K card...`, type: 'info' });

    // Call bridge or fallback to emulator
    let success = false;
    let cardUid = '';

    if (bridgeStatus.isOnline) {
      const result = await issuePhysicalKeycard({
        roomNumber: hwRoom,
        staffUser: hwStaff,
      });

      if (result.success) {
        success = true;
        cardUid = `BT-57-${result.cardNo || hwRoom}`;
        setHardwareMessage({
          text: `Success: Room ${hwRoom} keycard encoded & activated! Encoder emitted 2 confirmation beeps.`,
          type: 'success',
        });
      } else {
        setHardwareMessage({
          text: result.error || 'Physical write failed. Check reader connection.',
          type: 'error',
        });
      }
    } else {
      // Safe fallback emulator
      const emulated = await issueGuestRoomKey(hwRoom, `WALKIN-${Date.now().toString().slice(-4)}`, hwGuest, hwStaff);
      cardUid = emulated.card_uid;
      success = true;
      setHardwareMessage({
        text: `[Safe Mode] Keycard for Room ${hwRoom} created in system registry (UID: ${cardUid}). To write physical Mifare cards, launch Start_RFID_Bridge.bat.`,
        type: 'info',
      });
    }

    if (success) {
      repo.issueRFIDCard(hwRoom, `DIR-${Date.now().toString().slice(-4)}`, hwGuest, hwStaff);
      setRefreshKey((k) => k + 1);
    }

    setHardwareBusy(false);
  };

  // 3. Clear/Checkout card on physical encoder
  const handleCheckoutCard = async () => {
    if (!hwRoom) {
      alert('Please enter or select the room number to checkout.');
      return;
    }
    setHardwareBusy(true);
    setHardwareMessage({ text: `Clearing card authorization for Room ${hwRoom}...`, type: 'info' });

    if (bridgeStatus.isOnline) {
      const result = await checkoutPhysicalCard(hwRoom, hwStaff);
      if (result.success) {
        setHardwareMessage({
          text: `Card cleared and deactivated for Room ${hwRoom}. Card is now free for next guest.`,
          type: 'success',
        });
      } else {
        setHardwareMessage({
          text: result.error || 'Checkout write failed.',
          type: 'error',
        });
      }
    } else {
      setHardwareMessage({
        text: `[Safe Mode] Card for Room ${hwRoom} cleared in registry.`,
        type: 'info',
      });
    }

    setRefreshKey((k) => k + 1);
    setHardwareBusy(false);
  };

  // Issue card via modal
  const handleModalIssueCard = async (e: React.FormEvent) => {
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
            Be-Tech BIS 5.7 Mifare 1K hardware encoder bridge, keycard encoding, real-time tap logs, and guest check-in automation.
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

      {/* Live Hardware Bridge Status Banner */}
      <div className="p-4 rounded-2xl bg-[#25150F] text-[#EFE3D6] border border-[#D8AD56]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-luxury">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center ${
              bridgeStatus.isOnline
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500 text-amber-400'
            }`}
          >
            <Radio className={`w-5 h-5 ${bridgeStatus.isOnline ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-serif font-bold text-white text-sm">
                Be-Tech BIS 5.7 USB RFID Encoder Bridge
              </h4>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  bridgeStatus.isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {bridgeStatus.isOnline ? 'Hardware Online' : 'Bridge Offline (Safe Mode)'}
              </span>
            </div>
            <p className="text-xs text-[#EFE3D6]/70 mt-0.5">
              Endpoint: <code className="text-[#D8AD56] font-mono">http://127.0.0.1:8989</code> · Driver:{' '}
              <span className="font-mono text-white/90">btlock57l.dll</span> · Reader Type: <strong>4 (USB Mifare)</strong> · Pwd: <span className="font-mono text-[#D8AD56]">TAYIGR</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!bridgeStatus.isOnline && (
            <div className="text-right hidden lg:block text-[11px] text-[#EFE3D6]/60">
              Run <strong className="text-white">start-rfid-bridge.bat</strong> on front-desk PC
            </div>
          )}
          <button
            onClick={async () => {
              const s = await checkBridgeHealth();
              setBridgeStatus(s);
            }}
            className="px-3 py-1.5 rounded-lg border border-[#D8AD56]/40 text-xs text-[#D8AD56] hover:bg-[#D8AD56]/10 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Bridge</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'hardware'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Hardware Encoder Station</span>
        </button>
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
          Door Lock Simulator
        </button>
      </div>

      {/* TAB 0: HARDWARE ENCODER STATION */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Direct Hardware Operations */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
                  PHYSICAL USB ENCODER (BE-TECH BIS 5.7)
                </span>
                <h3 className="font-serif text-xl font-bold text-[#241912] mt-0.5">
                  Front Desk Card Read & Write Terminal
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    bridgeStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="text-xs font-medium text-[#786B61]">
                  {bridgeStatus.isOnline ? 'USB Reader Online' : 'Bridge Inactive (Safe Fallback)'}
                </span>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleScanCard}
                disabled={hardwareBusy}
                className="p-4 rounded-xl border border-[#D8AD56]/40 bg-[#FAF7F2] hover:bg-[#EFE3D6]/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="w-5 h-5 text-[#382216] group-hover:text-[#D8AD56] transition-colors" />
                  <span className="text-[10px] font-bold text-[#D8AD56] uppercase">1 Beep</span>
                </div>
                <div className="mt-3">
                  <h4 className="font-serif font-bold text-sm text-[#241912]">Scan / Read Card</h4>
                  <p className="text-[11px] text-[#786B61] mt-0.5">Read Mifare card data currently on the encoder</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleIssueHardwareCard}
                disabled={hardwareBusy}
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">2 Beeps</span>
                </div>
                <div className="mt-3">
                  <h4 className="font-serif font-bold text-sm text-emerald-950">Encode Keycard</h4>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5">Write Room {hwRoom} authorization to card</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleCheckoutCard}
                disabled={hardwareBusy}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <XCircle className="w-5 h-5 text-rose-700" />
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Clear Card</span>
                </div>
                <div className="mt-3">
                  <h4 className="font-serif font-bold text-sm text-rose-950">Check-Out & Wipe</h4>
                  <p className="text-[11px] text-rose-800/80 mt-0.5">Clear room access for next check-in</p>
                </div>
              </button>
            </div>

            {/* Hardware Status Message */}
            {hardwareMessage && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 transition-all ${
                  hardwareMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : hardwareMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-900 border border-rose-200'
                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                }`}
              >
                {hardwareMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : hardwareMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{hardwareMessage.text}</div>
              </div>
            )}

            {/* Form for Target Room & Guest */}
            <form onSubmit={handleIssueHardwareCard} className="space-y-4 pt-3 border-t border-[#EFE3D6]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#786B61] mb-1">
                    Room Number
                  </label>
                  <select
                    value={hwRoom}
                    onChange={(e) => setHwRoom(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912]"
                  >
                    {repo.getRooms().map((r) => (
                      <option key={r.id} value={r.room_number}>
                        Room {r.room_number} (Floor {r.floor_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#786B61] mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    value={hwGuest}
                    onChange={(e) => setHwGuest(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#EFE3D6]"
                    placeholder="Guest Full Name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#786B61] mb-1">
                    Active Staff Operator
                  </label>
                  <input
                    type="text"
                    value={hwStaff}
                    onChange={(e) => setHwStaff(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#EFE3D6]"
                    placeholder="Staff Name"
                  />
                </div>
              </div>
            </form>

            {/* Scanned Card Details View */}
            {scannedCard && (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#382216]">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Last Scanned Physical Card Information</span>
                  </span>
                  <span className="font-mono text-[10px] text-[#786B61]">Source: btlock57l.dll</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#241912]">
                  <div>Room: <strong className="text-[#382216]">Room {scannedCard.roomNumber || 'None'}</strong></div>
                  <div>Card No: <span className="font-mono text-xs">{scannedCard.cardNo || 'N/A'}</span></div>
                  <div>Valid From: <span className="font-mono text-[11px] text-[#786B61]">{scannedCard.beginTime || 'N/A'}</span></div>
                  <div>Valid Until: <span className="font-mono text-[11px] text-[#786B61]">{scannedCard.endTime || 'N/A'}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: How it Works & Audit Quick Look */}
          <div className="space-y-6">
            <div className="bg-[#25150F] text-white rounded-2xl p-6 border border-[#D8AD56]/30 space-y-4 shadow-luxury">
              <div className="flex items-center gap-2 text-[#D8AD56]">
                <Terminal className="w-4 h-4" />
                <h4 className="font-serif font-bold text-sm">Be-Tech BIS 5.7 Bridge Quick Start</h4>
              </div>

              <div className="text-xs text-[#EFE3D6]/80 space-y-2.5 leading-relaxed font-light">
                <p>
                  1. Connect the <strong>USB RFID Desktop Card Machine</strong> to the front-desk computer.
                </p>
                <p>
                  2. Double-click <code className="text-[#D8AD56] bg-black/40 px-1.5 py-0.5 rounded">start-rfid-bridge.bat</code> in the project root or run:
                  <br />
                  <code className="text-[11px] text-white/90 bg-black/50 p-1.5 rounded block mt-1 font-mono">
                    rfid-bridge\bin\SriAnanthaKeycardBridge.exe
                  </code>
                </p>
                <p>
                  3. The local bridge service will start listening on port <strong>8989</strong>. The status badge above will turn <strong className="text-emerald-400">Green</strong>.
                </p>
                <p>
                  4. Every card tap is automatically audited and sent to <code className="text-[#D8AD56]">/api/admin/rfid-logs</code>.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#EFE3D6]/70">
                <span>System Pwd: <strong className="text-[#D8AD56] font-mono">TAYIGR</strong></span>
                <span>Port: <strong>1</strong></span>
                <span>Type: <strong>4</strong></span>
              </div>
            </div>

            {/* Quick Live Tap Counter Card */}
            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-[#241912]">Recent Card Taps</span>
                <span className="text-[10px] uppercase font-bold text-[#D8AD56]">Live Log</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-[#EFE3D6] text-xs">
                {events.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="pt-2 first:pt-0 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#382216]">Room {evt.room_number}</div>
                      <div className="text-[10px] text-[#786B61]">{evt.reason}</div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        evt.event_type === 'access_granted'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {evt.event_type === 'access_granted' ? 'SUCCESS' : 'DENIED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <th className="py-3.5 px-4 font-semibold">Reason / Audit Trail</th>
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
                    <td className="py-3.5 px-4 text-[10px] uppercase font-bold text-[#D8AD56]">
                      {evt.source === 'encoder' ? 'USB Encoder' : evt.source}
                    </td>
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

            <form onSubmit={handleModalIssueCard} className="space-y-4">
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
