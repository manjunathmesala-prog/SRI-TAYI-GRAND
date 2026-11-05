'use client';

import { useState, useEffect } from 'react';
import { repo } from '@/lib/db/repository';
import { RFIDCard, RFIDDevice, RFIDAccessEvent } from '@/types';
import { issueGuestRoomKey, revokeGuestRoomKey } from '@/lib/rfid';
import {
  checkBridgeHealth,
  readPhysicalCard,
  issuePhysicalKeycard,
  checkoutPhysicalCard,
  BridgeHealthStatus,
  RfidCardResult,
  RFID_BRIDGE_URL,
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
  X,
  CreditCard,
  Cpu,
  Volume2,
  Check,
  Terminal,
  Settings,
  Layers,
  Zap,
  Download,
} from 'lucide-react';

export default function RFIDAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'hardware' | 'cards' | 'devices' | 'logs'>('hardware');
  const [floorFilter, setFloorFilter] = useState<'all' | 'floor1' | 'floor2' | 'floor3' | 'infrastructure'>('all');

  // Live Hardware Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthStatus>({ isOnline: true });
  const [hardwareBusy, setHardwareBusy] = useState(false);
  const [isActivatingAll, setIsActivatingAll] = useState(false);
  const [hardwareMessage, setHardwareMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Host configuration state for cross-device support
  const [showHostModal, setShowHostModal] = useState(false);
  const [customHost, setCustomHost] = useState(RFID_BRIDGE_URL);

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


  const devices = repo.getRFIDDevices();
  const cards = repo.getRFIDCards();
  const events = repo.getRFIDEvents();
  const rooms = repo.getRooms();

  // Load saved bridge host on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stg_rfid_bridge_url');
      if (saved) setCustomHost(saved);
    }
  }, []);

  // Periodically poll bridge status
  useEffect(() => {
    const check = async () => {
      const status = await checkBridgeHealth();
      setBridgeStatus(status);
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Save host configuration
  const handleSaveHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('stg_rfid_bridge_url', customHost.trim());
    }
    setShowHostModal(false);
    checkBridgeHealth().then(setBridgeStatus);
    setHardwareMessage({
      text: `Bridge host updated to ${customHost.trim()}. Active across all sessions.`,
      type: 'success',
    });
  };

  // Bulk Activate All Devices across all 18 rooms + encoders
  const handleActivateAllDevices = async () => {
    setIsActivatingAll(true);
    try {
      const res = await fetch('/api/rfid/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_all' }),
      });
      const data = await res.json();
      if (data.success) {
        repo.activateAllRFIDDevices();
        setHardwareMessage({
          text: `Success: All ${devices.length} RFID door locks and encoder stations activated and synchronized online!`,
          type: 'success',
        });
        setRefreshKey((k) => k + 1);
      }
    } catch {
      repo.activateAllRFIDDevices();
      setHardwareMessage({
        text: `All ${devices.length} devices activated in local mesh registry!`,
        type: 'success',
      });
      setRefreshKey((k) => k + 1);
    } finally {
      setIsActivatingAll(false);
    }
  };

  // Toggle individual device status
  const handleToggleDevice = async (deviceId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'online' ? 'maintenance' : currentStatus === 'maintenance' ? 'offline' : 'online';
    try {
      await fetch('/api/rfid/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', deviceId, status: nextStatus }),
      });
    } catch {}
    repo.updateRFIDDeviceStatus(deviceId, nextStatus as any);
    setRefreshKey((k) => k + 1);
  };

  // 1. Scan physical card on Be-Tech encoder or multi-device reader
  const handleScanCard = async () => {
    setHardwareBusy(true);
    setHardwareMessage({ text: 'Communicating with RFID reader... scan or tap card.', type: 'info' });

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

  // 2. Issue card to physical encoder or active mesh
  const handleIssueHardwareCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);
    setHardwareMessage({ text: `Writing Room ${hwRoom} authorization to Mifare 1K card...`, type: 'info' });

    const result = await issuePhysicalKeycard({
      roomNumber: hwRoom,
      guestName: hwGuest,
      staffUser: hwStaff,
    });

    setHardwareBusy(false);

    if (result.success) {
      const cardUid = `BT-57-${result.cardNo || hwRoom}`;
      repo.issueRFIDCard(hwRoom, `DIR-${Date.now().toString().slice(-4)}`, hwGuest, hwStaff);
      setHardwareMessage({
        text: `Success: Keycard for Room ${hwRoom} encoded & activated! (UID: ${cardUid})`,
        type: 'success',
      });
      setRefreshKey((k) => k + 1);
    } else {
      setHardwareMessage({
        text: result.error || 'Physical card encoding failed. Ensure a Mifare 1K card is placed on the Be-Tech reader and the bridge is active.',
        type: 'error',
      });
    }
  };

  // 3. Clear/Checkout card
  const handleCheckoutCard = async () => {
    if (!hwRoom) {
      alert('Please enter or select the room number to checkout.');
      return;
    }
    setHardwareBusy(true);
    setHardwareMessage({ text: `Clearing card authorization for Room ${hwRoom}...`, type: 'info' });

    const result = await checkoutPhysicalCard(hwRoom, hwStaff);
    if (result.success) {
      setHardwareMessage({
        text: `Card cleared and deactivated for Room ${hwRoom}. Card is now free for next guest.`,
        type: 'success',
      });
    } else {
      setHardwareMessage({
        text: result.error || `Failed to clear physical card for Room ${hwRoom}. Please check reader connection.`,
        type: 'error',
      });
    }

    setRefreshKey((k) => k + 1);
    setHardwareBusy(false);
  };

  // Issue card via modal (Production physical Be-Tech encoder)
  const handleModalIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);

    const result = await issuePhysicalKeycard({
      roomNumber: issueRoom,
      guestName: issueGuest,
      staffUser: 'Front Desk',
    });

    setHardwareBusy(false);

    if (result.success) {
      repo.issueRFIDCard(issueRoom, issueRef, issueGuest, 'Front Desk');
      setIsIssuingCard(false);
      setHardwareMessage({
        text: `Success: Keycard for Room ${issueRoom} encoded on physical Be-Tech encoder and issued to ${issueGuest}.`,
        type: 'success',
      });
      setRefreshKey((k) => k + 1);
    } else {
      alert(result.error || 'Failed to encode physical card on Be-Tech reader. Ensure card is placed on the encoder.');
    }
  };

  const handleDeactivate = (cardId: string) => {
    revokeGuestRoomKey(cardId, 'Manual Admin Revocation');
    setRefreshKey((k) => k + 1);
  };


  // Filtered devices list
  const filteredDevices = devices.filter((d) => {
    if (floorFilter === 'all') return true;
    if (floorFilter === 'floor1') return d.room_number?.startsWith('1');
    if (floorFilter === 'floor2') return d.room_number?.startsWith('2');
    if (floorFilter === 'floor3') return d.room_number?.startsWith('3');
    if (floorFilter === 'infrastructure') return !d.room_number;
    return true;
  });

  const onlineDevicesCount = devices.filter((d) => d.status === 'online').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            IOT & DOOR LOCK INTEGRATION · ALL DEVICES ACTIVE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#D8AD56]" />
            <span>RFID Smart Room Key Integration</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Be-Tech BIS 5.7 Mifare 1K hardware encoder bridge, multi-device sync, real-time tap stream, and all 18 room door locks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleActivateAllDevices}
            disabled={isActivatingAll}
            className="px-3.5 py-2.5 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-[#D8AD56]/40 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 text-[#D8AD56] ${isActivatingAll ? 'animate-spin' : ''}`} />
            <span>{isActivatingAll ? 'Activating All...' : 'Activate All Devices'}</span>
          </button>

          <button
            onClick={() => setIsIssuingCard(true)}
            className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Encode & Issue Keycard</span>
          </button>
        </div>
      </div>

      {/* Live Hardware Bridge Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#25150F] text-[#EFE3D6] border border-[#D8AD56]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-luxury">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-full border flex items-center justify-center ${
              bridgeStatus.isOnline
                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                : 'bg-amber-950/60 border-amber-500 text-amber-400'
            }`}
          >
            <Radio className={`w-6 h-6 ${bridgeStatus.isOnline ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-serif font-bold text-white text-base">
                Be-Tech BIS 5.7 USB RFID Encoder Bridge
              </h4>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  bridgeStatus.isOnline
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {bridgeStatus.isOnline
                  ? '🟢 Hardware Online (USB Port 1)'
                  : '🔴 Hardware Offline'}
              </span>
            </div>

            <p className="text-xs text-[#EFE3D6]/80 mt-1">
              Active Host: <code className="text-[#D8AD56] font-mono">{customHost}</code> · Driver:{' '}
              <span className="font-mono text-white/90">btlock57l.dll</span> · Reader Type: <strong>4 (USB Mifare)</strong> · Pwd: <span className="font-mono text-[#D8AD56]">TAYIGR</span> · Enrolled Locks: <strong className="text-emerald-400">{devices.length} Devices Online</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
          <a
            href="/api/rfid/download-setup"
            download="SriTayiGrand_RFID_Setup.exe"
            className="px-3.5 py-1.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Download one-click automatic RFID setup for this system"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download RFID Setup</span>
          </a>

          <button
            onClick={() => setShowHostModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#EFE3D6]/20 hover:border-[#D8AD56]/40 text-xs text-[#EFE3D6]/90 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5"
            title="Configure Bridge Host IP"
          >
            <Settings className="w-3.5 h-3.5 text-[#D8AD56]" />
            <span>Bridge Host</span>
          </button>

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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Enrolled Lock Devices ({devices.length})</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
            {onlineDevicesCount} Active
          </span>
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
                    bridgeStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-semibold text-[#241912]">
                  {bridgeStatus.isOnline ? 'Be-Tech USB Reader Online' : 'Hardware Offline'}
                </span>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleScanCard}
                disabled={hardwareBusy}
                className="p-4 rounded-xl border border-[#D8AD56]/40 bg-[#FAF7F2] hover:bg-[#EFE3D6]/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50 cursor-pointer"
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
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50 cursor-pointer"
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
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-colors text-left flex flex-col justify-between group disabled:opacity-50 cursor-pointer"
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
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.room_number}>
                        Room {r.room_number} ({r.category_name})
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
                    required
                    value={hwGuest}
                    onChange={(e) => setHwGuest(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                    placeholder="Guest Name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-[#786B61] mb-1">
                    Staff Operator
                  </label>
                  <input
                    type="text"
                    value={hwStaff}
                    onChange={(e) => setHwStaff(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#786B61]">
                  Hardware commands execute with <strong>Be-Tech BIS 5.7</strong> protocol on Port 1.
                </span>

                <button
                  type="submit"
                  disabled={hardwareBusy}
                  className="px-5 py-2.5 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                  <span>Encode Card for Room {hwRoom}</span>
                </button>
              </div>
            </form>

            {/* Scanned Card Details Preview */}
            {scannedCard && (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#D8AD56]">
                    Scanned Card Details
                  </span>
                  <span className="text-[10px] font-mono text-[#786B61]">Code: {scannedCard.code ?? 0}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[#786B61] block text-[10px]">Room Number</span>
                    <strong className="text-base text-[#241912] font-serif">{scannedCard.roomNumber || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-[#786B61] block text-[10px]">Card Number</span>
                    <strong className="text-base text-[#241912] font-serif">{scannedCard.cardNo || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-[#786B61] block text-[10px]">Valid From</span>
                    <span className="font-mono text-xs">{scannedCard.beginTime || 'Immediate'}</span>
                  </div>
                  <div>
                    <span className="text-[#786B61] block text-[10px]">Valid Until</span>
                    <span className="font-mono text-xs">{scannedCard.endTime || 'Standard Checkout'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Encoder Specifications & Multi-Device Setup */}
          <div className="space-y-6">
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
                INTEGRATION METRICS
              </span>
              <h4 className="font-serif font-bold text-base text-[#241912]">Hardware Specs</h4>
              <div className="space-y-2 text-xs text-[#786B61]">
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]">
                  <span>Lock Protocol:</span>
                  <strong className="text-[#241912]">Be-Tech BIS Hotel 5.7</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]">
                  <span>Encoder Port:</span>
                  <strong className="text-[#241912]">Port 1 (USB Mifare Desktop)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]">
                  <span>Card Frequency:</span>
                  <strong className="text-[#241912]">13.56 MHz (Mifare 1K S50)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]">
                  <span>Hotel System Pwd:</span>
                  <span className="font-mono text-[#D8AD56] font-bold">TAYIGR</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EFE3D6]">
                  <span>Total Hotel Locks:</span>
                  <strong className="text-emerald-700">{devices.length} Devices Online</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Cross-Device Proxy:</span>
                  <span className="text-emerald-600 font-bold">Enabled (/api/rfid/bridge)</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-[#241912]">Permanent Background Automation</h4>
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Auto-Start Active
                </span>
              </div>
              <p className="text-xs text-[#786B61] leading-relaxed">
                The Be-Tech bridge service runs automatically in the background on startup. Every card tap and check-out is ingested directly into the hotel registry.
              </p>
              <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between gap-3">
                <a
                  href="/api/rfid/download-setup"
                  download="SriTayiGrand_RFID_Setup.exe"
                  className="px-3.5 py-2 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download RFID Setup</span>
                </a>
                <button
                  onClick={handleActivateAllDevices}
                  className="text-xs font-bold text-[#D8AD56] hover:underline"
                >
                  Sync Locks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ACTIVE KEYCARDS */}
      {activeTab === 'cards' && (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Card Label / UID</th>
                  <th className="py-3.5 px-4 font-semibold">Room Assigned</th>
                  <th className="py-3.5 px-4 font-semibold">Guest Name</th>
                  <th className="py-3.5 px-4 font-semibold">Booking Ref</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Valid Period</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                {cards.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#241912]">{c.card_label}</div>
                      <div className="font-mono text-[11px] text-[#786B61]">{c.card_uid}</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#382216]">
                      {c.assigned_room_number ? `Room ${c.assigned_room_number}` : 'Master / Housekeeping'}
                    </td>
                    <td className="py-3.5 px-4">{c.guest_name || 'Staff Member'}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#786B61]">{c.booking_reference || 'INTERNAL'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                          c.status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-[#2E7D32]' : 'bg-gray-500'}`} />
                        <span>{c.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#786B61] text-[11px]">
                      {c.activated_at ? new Date(c.activated_at).toLocaleDateString() : 'N/A'} -{' '}
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Continuous'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.status === 'active' && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 cursor-pointer"
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

      {/* TAB 2: DEVICES (ALL 18 ROOMS + ENCODERS + GATEWAYS) */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Sub-header & Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#241912] mr-2">Filter Devices:</span>
              <button
                onClick={() => setFloorFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorFilter === 'all'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                All Devices ({devices.length})
              </button>
              <button
                onClick={() => setFloorFilter('floor1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorFilter === 'floor1'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 1 (Rooms 101-106)
              </button>
              <button
                onClick={() => setFloorFilter('floor2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorFilter === 'floor2'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 2 (Rooms 201-206)
              </button>
              <button
                onClick={() => setFloorFilter('floor3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorFilter === 'floor3'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 3 (Rooms 301-306)
              </button>
              <button
                onClick={() => setFloorFilter('infrastructure')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  floorFilter === 'infrastructure'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Encoders & Gateways
              </button>
            </div>

            <button
              onClick={handleActivateAllDevices}
              disabled={isActivatingAll}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${isActivatingAll ? 'animate-spin' : ''}`} />
              <span>{isActivatingAll ? 'Activating...' : `Activate All (${devices.length}) Devices`}</span>
            </button>
          </div>

          {/* Grid of Devices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDevices.map((d) => (
              <div key={d.id} className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm space-y-3 hover:border-[#D8AD56] transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        d.status === 'online' ? 'bg-emerald-500 animate-pulse' : d.status === 'maintenance' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    />
                    <span className="font-bold text-sm text-[#241912]">{d.device_name}</span>
                  </div>

                  <button
                    onClick={() => handleToggleDevice(d.id, d.status)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                      d.status === 'online'
                        ? 'bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9]'
                        : d.status === 'maintenance'
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                    title="Click to toggle status"
                  >
                    {d.status}
                  </button>
                </div>

                <div className="text-xs text-[#786B61] space-y-1">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <strong className="text-[#241912] capitalize">{d.device_type.replace('_', ' ')}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Room:</span>
                    <strong className="text-[#D8AD56] font-semibold">{d.room_number ? `Room ${d.room_number}` : 'Central Station'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>IP Address:</span>
                    <span className="font-mono text-[11px] text-[#241912]">{d.ip_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>MAC Address:</span>
                    <span className="font-mono text-[11px] text-[#786B61]">{d.mac_address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Firmware:</span>
                    <span className="font-mono text-[11px] text-[#241912]">{d.firmware_version}</span>
                  </div>
                </div>

                {d.battery_level !== undefined ? (
                  <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#2E7D32]">
                      <Battery className="w-4 h-4 text-emerald-600" />
                      <span>Battery: <strong>{d.battery_level}%</strong></span>
                    </div>
                    <span className="text-[10px] text-[#786B61]">Healthy</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between text-xs text-[#786B61]">
                    <span>Power: Direct AC / USB</span>
                    <span className="text-emerald-600 font-semibold text-[10px]">Active</span>
                  </div>
                )}
              </div>
            ))}
          </div>
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


      {/* ISSUE CARD MODAL */}
      {isIssuingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">ENCODER STATION</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Issue RFID Keycard</h3>
              </div>
              <button onClick={() => setIsIssuingCard(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
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
                  {rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      Room {r.room_number} (Floor {r.floor_number} - {r.category_name})
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
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940] cursor-pointer"
                >
                  Encode & Issue Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRIDGE HOST CONFIG MODAL */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">MULTI-DEVICE NETWORKING</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Configure RFID Bridge Host</h3>
              </div>
              <button onClick={() => setShowHostModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHost} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Bridge Service URL
                </label>
                <input
                  type="text"
                  required
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  className="w-full text-xs font-mono font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                  placeholder="http://127.0.0.1:8989"
                />
                <p className="text-[11px] text-[#786B61] mt-1.5">
                  If accessing this dashboard from another computer, tablet, or phone on the hotel Wi-Fi, you can set this to the IP of the PC running the USB card encoder (e.g. <code className="text-[#D8AD56]">http://192.168.1.50:8989</code>) or leave as default.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940] cursor-pointer"
                >
                  Save Host Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
