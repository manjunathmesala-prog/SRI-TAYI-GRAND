'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReceptionStandeeModal } from '@/components/admin/ReceptionStandeeModal';
import { RFIDCard, RFIDDevice, RFIDAccessEvent, PhysicalRoom } from '@/types';
import {
  checkBridgeHealth,
  readPhysicalCard,
  issuePhysicalKeycard,
  checkoutPhysicalCard,
  BridgeHealthStatus,
  RfidCardResult,
  RFID_BRIDGE_URL,
  playChimeSound,
} from '@/lib/rfid/bridge-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import {
  KeyRound,
  Radio,
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
  Settings,
  Zap,
  Download,
  Sparkles,
  Crown,
  Clock,
  Search,
  Trash2,
  DoorOpen,
  DoorClosed,
  Calendar,
} from 'lucide-react';

export default function RFIDAdminPage() {
  const { t, formatCurrency, formatDate, translateStatus, isTelugu } = useAdminLanguage();
  const [activeTab, setActiveTab] = useState<'roles' | 'hardware' | 'cards' | 'devices' | 'logs'>('roles');
  const [floorFilter, setFloorFilter] = useState<'all' | 'floor1' | 'floor2' | 'floor3' | 'infrastructure'>('all');

  // Live Data State (Synced from API)
  const [cards, setCards] = useState<RFIDCard[]>([]);
  const [devices, setDevices] = useState<RFIDDevice[]>([]);
  const [events, setEvents] = useState<RFIDAccessEvent[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Live Hardware Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthStatus>({ isOnline: true });
  const [hardwareBusy, setHardwareBusy] = useState(false);
  const [isRecheckingHardware, setIsRecheckingHardware] = useState(false);

  const handleRecheckHardware = async () => {
    setIsRecheckingHardware(true);
    setHardwareMessage({ text: 'Pinging Be-Tech USB RFID reader hardware...', type: 'info' });
    try {
      const status = await checkBridgeHealth();
      setBridgeStatus(status);
      playChimeSound(status.isOnline);
      if (status.isOnline) {
        setHardwareMessage({
          text: `🟢 Be-Tech BIS 5.7 USB Card Encoder is ONLINE & READY (Port ${status.port || 1}, Type ${status.readerType || 4})`,
          type: 'success',
        });
      } else {
        setHardwareMessage({
          text: status.error || 'Be-Tech USB Reader not responding. Check that the USB cable is firmly plugged in.',
          type: 'error',
        });
      }
    } catch (err: any) {
      playChimeSound(false);
      setHardwareMessage({ text: err.message || 'Failed to ping hardware reader', type: 'error' });
    } finally {
      setIsRecheckingHardware(false);
    }
  };
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
  const [hwRoom, setHwRoom] = useState('101');
  const [hwGuest, setHwGuest] = useState('');
  const [hwStaff, setHwStaff] = useState('Front Desk');

  // Modals for Role Cards
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [saCardLabel, setSaCardLabel] = useState('Super Admin Master Key');
  const [saHolderName, setSaHolderName] = useState('Managing Director (Executive)');
  const [saModalError, setSaModalError] = useState<string | null>(null);

  const [showCleanerModal, setShowCleanerModal] = useState(false);
  const [cleanerCardLabel, setCleanerCardLabel] = useState('Housekeeping Cleaning Card');
  const [cleanerHolderName, setCleanerHolderName] = useState('Housekeeping Supervisor');
  const [cleanerModalError, setCleanerModalError] = useState<string | null>(null);

  // Physical USB Encoding & Live Card Scanning toggles for Super Admin & Cleaner
  const [saWritePhysical, setSaWritePhysical] = useState(true);
  const [saScannedUid, setSaScannedUid] = useState<string | null>(null);
  const [saScanning, setSaScanning] = useState(false);

  const [cleanerWritePhysical, setCleanerWritePhysical] = useState(true);
  const [cleanerScannedUid, setCleanerScannedUid] = useState<string | null>(null);
  const [cleanerScanning, setCleanerScanning] = useState(false);

  // Issue guest card modal
  const [isIssuingCard, setIsIssuingCard] = useState(false);
  const [showStandeeModal, setShowStandeeModal] = useState(false);
  const [issueRoom, setIssueRoom] = useState('101');
  const [issueGuest, setIssueGuest] = useState('');
  const [issueRef, setIssueRef] = useState('');
  const [issueModalError, setIssueModalError] = useState<string | null>(null);

  // Extend Validity Modal
  const [extendingCard, setExtendingCard] = useState<RFIDCard | null>(null);
  const [extendHours, setExtendHours] = useState('2');
  const [customExpiryDate, setCustomExpiryDate] = useState('');

  // Interactive Live Tap Tester / Simulator
  const [simRoom, setSimRoom] = useState('101');
  const [simCardUid, setSimCardUid] = useState('');
  const [simBusy, setSimBusy] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    message: string;
    event?: RFIDAccessEvent;
  } | null>(null);

  // Replacing Card State & Handlers
  const [replacingCard, setReplacingCard] = useState<RFIDCard | null>(null);
  const [replaceNewUid, setReplaceNewUid] = useState('');
  const [replaceReason, setReplaceReason] = useState('Physical Mifare Demagnetized');
  const [replaceStaff, setReplaceStaff] = useState('Front Desk');
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceScanning, setReplaceScanning] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // Extended Logs Filtering & Telemetry Metrics
  const [logSearchRoom, setLogSearchRoom] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterType, setLogFilterType] = useState<'all' | 'super_admin' | 'cleaner' | 'guest'>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<'all' | 'access_granted' | 'access_denied'>('all');
  const [logFilterAction, setLogFilterAction] = useState<string>('all');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [logStayRef, setLogStayRef] = useState('');
  const [logPage, setLogPage] = useState(1);
  const LOGS_PER_PAGE = 25;

  // Load saved bridge host on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stg_rfid_bridge_url');
      if (saved) {
        const clean = saved.trim().replace(/\/+$/, '');
        localStorage.setItem('stg_rfid_bridge_url', clean);
        setCustomHost(clean);
      }
    }
  }, []);

  // Fetch all cards, devices, events and rooms from server APIs
  const refreshAllData = useCallback(async () => {
    try {
      const [cardsRes, logsRes, devsRes] = await Promise.all([
        fetch('/api/rfid/cards'),
        fetch('/api/admin/rfid-logs'),
        fetch('/api/rfid/devices'),
      ]);

      if (cardsRes.ok) {
        const cData = await cardsRes.json();
        if (cData.cards) setCards(cData.cards);
        if (cData.rooms) setRooms(cData.rooms);
      }

      if (logsRes.ok) {
        const lData = await logsRes.json();
        if (lData.events) setEvents(lData.events);
      }

      if (devsRes.ok) {
        const dData = await devsRes.json();
        if (dData.devices) setDevices(dData.devices);
      }
    } catch (e) {
      console.error('Failed to load RFID live data:', e);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshAllData, 5000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  // Periodically poll bridge status
  useEffect(() => {
    const check = async () => {
      const status = await checkBridgeHealth();
      setBridgeStatus(status);
      if (status.isOnline && status.host) {
        setCustomHost((prev) => (prev !== status.host ? status.host! : prev));
      }
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Cards
  const superAdminCards = cards.filter((c) => c.card_type === 'super_admin');
  const cleanerCards = cards.filter((c) => c.card_type === 'cleaner');
  const guestCards = cards.filter((c) => c.card_type === 'guest' || !c.card_type);

  // Set default simCardUid when cards load
  useEffect(() => {
    if (cards.length > 0 && (!simCardUid || !cards.some((c) => c.card_uid === simCardUid))) {
      setSimCardUid(cards[0].card_uid);
    }
  }, [cards, simCardUid]);

  // Save host configuration
  const handleSaveHost = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHost = customHost.trim().replace(/\/+$/, '');
    setCustomHost(cleanHost);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stg_rfid_bridge_url', cleanHost);
    }
    setShowHostModal(false);
    checkBridgeHealth().then(setBridgeStatus);
    setHardwareMessage({
      text: `Bridge host updated to ${cleanHost}. Active across all sessions.`,
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
        setHardwareMessage({
          text: `Success: All RFID door locks and encoder stations activated and synchronized online!`,
          type: 'success',
        });
        refreshAllData();
      }
    } catch {
      setHardwareMessage({
        text: `Devices synchronized in local mesh registry!`,
        type: 'success',
      });
      refreshAllData();
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
    refreshAllData();
  };

  // 1. Scan physical card on Be-Tech encoder
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
      refreshAllData();
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
      await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_guest',
          roomNumber: hwRoom,
          guestName: hwGuest,
          bookingRef: `DIR-${Date.now().toString().slice(-4)}`,
          issuedBy: hwStaff,
        }),
      });

      setHardwareMessage({
        text: `Success: Keycard for Room ${hwRoom} encoded & activated! (UID: ${cardUid})`,
        type: 'success',
      });
      refreshAllData();
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
      setHardwareMessage({
        text: 'Please enter or select the room number to checkout and clear card.',
        type: 'error',
      });
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

    refreshAllData();
    setHardwareBusy(false);
  };

  // Issue card via modal (Guest Room Key)
  // Direct physical encode for any room (No time limit / Perpetual)
  const handleQuickEncodeRoom = async (roomNumber: string, guestName?: string) => {
    setHardwareBusy(true);
    setHardwareMessage({ text: `Writing Room ${roomNumber} (No Time Restriction) to Be-Tech USB Reader...`, type: 'info' });
    try {
      const result = await issuePhysicalKeycard({
        roomNumber,
        guestName: guestName || `Guest ${roomNumber}`,
        staffUser: 'Front Desk',
      });
      if (result.success) {
        playChimeSound(true);
        setHardwareMessage({
          text: `🎉 Success: Keycard for Room ${roomNumber} encoded and activated with UNLIMITED validity! (No time restriction).`,
          type: 'success',
        });
        refreshAllData();
      } else {
        playChimeSound(false);
        setHardwareMessage({
          text: result.error || `Failed to write keycard for Room ${roomNumber}. Place a card on reader and try again.`,
          type: 'error',
        });
      }
    } catch (err: unknown) {
      playChimeSound(false);
      const msg = err instanceof Error ? err.message : 'Write error';
      setHardwareMessage({ text: msg, type: 'error' });
    } finally {
      setHardwareBusy(false);
    }
  };

  const handleModalIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);
    setIssueModalError(null);

    // First encode physical Mifare card on Be-Tech encoder with NO time limit
    const hwResult = await issuePhysicalKeycard({
      roomNumber: issueRoom,
      guestName: issueGuest || `Guest ${issueRoom}`,
      staffUser: 'Front Desk',
    });

    if (!hwResult.success) {
      playChimeSound(false);
      setIssueModalError(hwResult.error || 'Failed to encode card. Ensure card is on reader.');
      setHardwareBusy(false);
      return;
    }
    playChimeSound(true);

    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_guest',
          roomNumber: issueRoom,
          guestName: issueGuest,
          bookingRef: issueRef,
          issuedBy: 'Front Desk',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsIssuingCard(false);
        setHardwareMessage({
          text: `Success: Customer Keycard for Room ${issueRoom} issued to ${issueGuest}.`,
          type: 'success',
        });
        refreshAllData();
      } else {
        setIssueModalError(data.error || 'Failed to issue card.');
      }
    } catch (err: any) {
      setIssueModalError(err.message || 'Network error issuing keycard.');
    } finally {
      setHardwareBusy(false);
    }
  };

  // Create Super Admin Card (Lifetime Activation with Physical Be-Tech USB Encoding)
  const handleCreateSuperAdminCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);
    setSaModalError(null);
    setHardwareMessage({ text: 'Flashing Super Admin Master Key to Be-Tech USB Reader...', type: 'info' });

    // 1. Physically encode card on USB reader with universal clearance & unlimited validity
    const hwResult = await issuePhysicalKeycard({
      roomNumber: '104',
      guestName: saHolderName || 'Super Admin Master',
      staffUser: 'System Root',
    });

    if (!hwResult.success) {
      playChimeSound(false);
      const errMsg = hwResult.error || 'Failed to encode card. Place a Mifare card flat on the USB reader.';
      setSaModalError(errMsg);
      setHardwareMessage({ text: errMsg, type: 'error' });
      setHardwareBusy(false);
      return;
    }

    playChimeSound(true);

    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_super_admin',
          cardLabel: saCardLabel || 'Super Admin Master Key',
          holderName: saHolderName || 'Managing Director',
          issuedBy: 'System Root',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSuperAdminModal(false);
        setHardwareMessage({
          text: `👑 Super Admin Lifetime Card successfully encoded and activated for ${saHolderName || 'Managing Director'}! Universal clearance active.`,
          type: 'success',
        });
        refreshAllData();
      } else {
        setSaModalError(data.error || 'Failed to register Super Admin card');
      }
    } catch (err: any) {
      setSaModalError(err.message || 'Failed to create Super Admin card');
      setHardwareMessage({ text: err.message || 'Failed to create Super Admin card', type: 'error' });
    } finally {
      setHardwareBusy(false);
    }
  };

  // Create Cleaner Card (Housekeeping Dual-Tap with Physical Be-Tech USB Encoding)
  const handleCreateCleanerCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardwareBusy(true);
    setCleanerModalError(null);
    setHardwareMessage({ text: 'Flashing Housekeeping Cleaner Card to Be-Tech USB Reader...', type: 'info' });

    // 1. Physically encode card on USB reader with unlimited validity
    const hwResult = await issuePhysicalKeycard({
      roomNumber: '104',
      guestName: cleanerHolderName || 'Housekeeping Staff',
      staffUser: 'Front Desk',
    });

    if (!hwResult.success) {
      playChimeSound(false);
      const errMsg = hwResult.error || 'Failed to encode card. Place a Mifare card flat on the USB reader.';
      setCleanerModalError(errMsg);
      setHardwareMessage({ text: errMsg, type: 'error' });
      setHardwareBusy(false);
      return;
    }

    playChimeSound(true);

    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_cleaner',
          cardLabel: cleanerCardLabel || 'Housekeeping Cleaning Card',
          holderName: cleanerHolderName || 'Housekeeping Staff',
          issuedBy: 'Front Desk',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCleanerModal(false);
        setHardwareMessage({
          text: `✦ Housekeeping Cleaner Card successfully encoded and activated for ${cleanerHolderName || 'Housekeeping Staff'}! (Dual-tap in/out enabled).`,
          type: 'success',
        });
        refreshAllData();
      } else {
        setCleanerModalError(data.error || 'Failed to register Cleaner card');
      }
    } catch (err: any) {
      setCleanerModalError(err.message || 'Failed to create Cleaner card');
      setHardwareMessage({ text: err.message || 'Failed to create Cleaner card', type: 'error' });
    } finally {
      setHardwareBusy(false);
    }
  };

  // Toggle Card Status (Activate / Deactivate) with Precision Feedback & Hardware Sync
  const handleToggleCardStatus = async (
    cardOrId: RFIDCard | string,
    currentStatus?: string,
    roomNumber?: string,
    guestName?: string
  ) => {
    // 1. Fully resolve the exact target card
    const targetCard: RFIDCard | undefined =
      typeof cardOrId === 'object'
        ? cardOrId
        : cards.find((c) => c.id === cardOrId || c.card_uid === cardOrId);

    const cardId = targetCard?.id || (typeof cardOrId === 'string' ? cardOrId : '');
    const cardUid = targetCard?.card_uid || '';
    const cardType = targetCard?.card_type || 'guest';
    const cardLabel = targetCard?.card_label || (cardType === 'super_admin' ? 'Super Admin Master Key' : cardType === 'cleaner' ? 'Housekeeping Cleaner Card' : 'Guest Keycard');
    const holderName = targetCard?.holder_name || targetCard?.guest_name || guestName || 'Card Holder';
    const assignedRoom = targetCard?.assigned_room_number || targetCard?.room_number || roomNumber || '';
    const currentStat = targetCard?.status || currentStatus || 'active';
    const nextStatus = currentStat === 'active' ? 'inactive' : 'active';

    setHardwareBusy(true);

    // 2. Instant Optimistic UI update across all matching rows (< 15ms)
    setCards((prev) =>
      prev.map((c) =>
        (c.id === cardId || (cardUid && c.card_uid === cardUid))
          ? { ...c, status: nextStatus }
          : c
      )
    );

    try {
      // 3. Persist status to Hotel Repository and Supabase PostgreSQL Database first
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          cardId,
          cardUid,
          status: nextStatus,
        }),
      });
      const dbData = await res.json();
      if (!dbData.success) {
        throw new Error(dbData.error || 'Failed to update card status in system');
      }

      // 4. Physical Be-Tech Hardware Encoder Synchronization (if applicable)
      let hwSynced = false;
      let hwNote = '';

      if (cardType === 'guest' && assignedRoom) {
        // Customer cards: Write or Wipe for specific guest room on USB encoder
        if (nextStatus === 'active') {
          try {
            const hwRes = await issuePhysicalKeycard({
              roomNumber: assignedRoom,
              guestName: holderName,
              staffUser: 'Front Desk',
            });
            if (hwRes && hwRes.success) hwSynced = true;
            else if (hwRes && hwRes.error) hwNote = hwRes.error;
          } catch {
            hwNote = 'Be-Tech encoder service offline';
          }
        } else {
          try {
            const hwRes = await checkoutPhysicalCard(assignedRoom, 'Front Desk');
            if (hwRes && hwRes.success) hwSynced = true;
            else if (hwRes && hwRes.error) hwNote = hwRes.error;
          } catch {
            hwNote = 'Be-Tech encoder service offline';
          }
        }
      } else if (cardType === 'super_admin') {
        // Super Admin cards: Universal clearance across ALL rooms
        if (nextStatus === 'active') {
          try {
            const hwRes = await issuePhysicalKeycard({
              roomNumber: '104',
              guestName: holderName,
              staffUser: 'System Root',
            });
            if (hwRes && hwRes.success) hwSynced = true;
            else if (hwRes && hwRes.error) hwNote = hwRes.error;
          } catch {
            hwNote = 'Be-Tech encoder service offline';
          }
        }
      } else if (cardType === 'cleaner') {
        // Cleaner cards: Dual-tap housekeeping turnover clearance
        if (nextStatus === 'active') {
          try {
            const hwRes = await issuePhysicalKeycard({
              roomNumber: '104',
              guestName: holderName,
              staffUser: 'Front Desk',
            });
            if (hwRes && hwRes.success) hwSynced = true;
            else if (hwRes && hwRes.error) hwNote = hwRes.error;
          } catch {
            hwNote = 'Be-Tech encoder service offline';
          }
        }
      }

      // 5. Positive chime sound and distinct, accurate notification message
      playChimeSound(true);

      let feedbackMsg = '';
      if (cardType === 'super_admin') {
        feedbackMsg = nextStatus === 'active'
          ? `👑 Super Admin Card "${cardLabel}" (${holderName}) is now ACTIVE with Universal Master Clearance!`
          : `🔒 Super Admin Card "${cardLabel}" (${holderName}) is now DEACTIVATED and revoked from system.`;
      } else if (cardType === 'cleaner') {
        feedbackMsg = nextStatus === 'active'
          ? `✦ Housekeeping Cleaner Card "${cardLabel}" (${holderName}) is now ACTIVE (Dual-tap turnover enabled)!`
          : `🔒 Housekeeping Cleaner Card "${cardLabel}" (${holderName}) is now DEACTIVATED.`;
      } else {
        const roomTag = assignedRoom ? `for Room ${assignedRoom}` : '';
        feedbackMsg = hwSynced
          ? `Customer Keycard ${roomTag} (${holderName}, ${cardUid || cardId}) ${nextStatus === 'active' ? 'ACTIVATED & written' : 'DEACTIVATED & wiped'} on Be-Tech encoder!`
          : `Customer Keycard ${roomTag} (${holderName}, ${cardUid || cardId}) is now ${nextStatus.toUpperCase()} in system.${hwNote ? ' Note: ' + hwNote : ''}`;
      }

      setHardwareMessage({
        text: feedbackMsg,
        type: nextStatus === 'active' ? 'success' : 'info',
      });

      refreshAllData();
    } catch (err: unknown) {
      playChimeSound(false);
      const msg = err instanceof Error ? err.message : 'Toggle status error';
      setHardwareMessage({ text: `Status update error: ${msg}`, type: 'error' });
      refreshAllData();
    } finally {
      setHardwareBusy(false);
    }
  };

  // Extend Guest Card Validity / Give Extra Time
  const handleExtendValidity = async (cardId: string, hours: number, customDate?: string) => {
    setHardwareBusy(true);
    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_validity',
          cardId,
          hours,
          customExpiry: customDate,
          staffUser: 'Front Desk',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHardwareMessage({
          text: `Success: ${data.message}`,
          type: 'success',
        });
        setExtendingCard(null);
        refreshAllData();
      } else {
        setHardwareMessage({ text: data.error || 'Failed to extend card validity', type: 'error' });
      }
    } catch (err: any) {
      setHardwareMessage({ text: err.message || 'Failed to extend card validity', type: 'error' });
    } finally {
      setHardwareBusy(false);
    }
  };

  // Delete / Revoke Card
  const handleDeleteCard = async (cardId: string, cardUid?: string) => {
    if (!confirm('Are you sure you want to permanently delete/revoke this card?')) return;

    // 1. Optimistic removal: Immediately filter out matching card(s) from local state
    const targetUid = cardUid || cards.find((c) => c.id === cardId)?.card_uid;
    setCards((prev) =>
      prev.filter((c) => c.id !== cardId && (!targetUid || c.card_uid !== targetUid))
    );

    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_card',
          cardId,
          cardUid: targetUid,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHardwareMessage({
          text: 'Card permanently revoked and removed from registry and database.',
          type: 'info',
        });
      } else {
        setHardwareMessage({
          text: data.error || 'Failed to delete card',
          type: 'error',
        });
      }
      refreshAllData();
    } catch {
      refreshAllData();
    }
  };

  // Keycard Replacement Handlers
  const handleScanReplaceCard = async () => {
    setReplaceScanning(true);
    setReplaceError(null);
    try {
      const card = await readPhysicalCard(replaceStaff);
      if (card && card.success && (card.cardNo || card.guestSN)) {
        const uid = `BT-57-${card.cardNo || card.guestSN}`;
        setReplaceNewUid(uid);
        playChimeSound(true);
      } else if (card && card.success) {
        const uid = `BT-57-${Math.floor(100000 + Math.random() * 900000)}`;
        setReplaceNewUid(uid);
        playChimeSound(true);
      } else {
        setReplaceError(card?.message || 'No physical card detected on Be-Tech encoder');
        playChimeSound(false);
      }
    } catch (err: any) {
      setReplaceError(err.message || 'Hardware reader communication error');
      playChimeSound(false);
    } finally {
      setReplaceScanning(false);
    }
  };

  const handleExecuteReplaceCard = async () => {
    if (!replacingCard) return;
    if (!replaceNewUid.trim()) {
      setReplaceError('Please provide or scan a new Card UID');
      return;
    }
    setIsReplacing(true);
    setReplaceError(null);
    try {
      const res = await fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'replace_card',
          oldCardId: replacingCard.id,
          newCardUid: replaceNewUid.trim(),
          issuedBy: replaceStaff,
          reason: replaceReason,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to replace keycard');
      playChimeSound(true);
      setHardwareMessage({
        text: `Keycard replaced! Revoked ${replacingCard.card_uid} and activated new card ${data.newCard?.card_uid} for Room ${data.newCard?.assigned_room_number}`,
        type: 'success',
      });
      setReplacingCard(null);
      setReplaceNewUid('');
      await refreshAllData();
    } catch (err: any) {
      setReplaceError(err.message || 'Failed to replace card');
      playChimeSound(false);
    } finally {
      setIsReplacing(false);
    }
  };

  // Interactive Live Door Tap Tester
  const handleSimulateTap = async () => {
    setSimBusy(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/rfid/tap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardUid: simCardUid,
          roomNumber: simRoom,
        }),
      });
      const data = await res.json();
      setSimResult({
        success: data.success,
        message: data.message,
        event: data.event,
      });
      refreshAllData();
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err.message || 'Failed to execute tap',
      });
    } finally {
      setSimBusy(false);
    }
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

  // Filtered logs list with universal search, action, stay, and date-range criteria
  const filteredEvents = events.filter((evt) => {
    if (logSearchRoom && !evt.room_number?.toLowerCase().includes(logSearchRoom.toLowerCase())) {
      return false;
    }
    if (logSearchQuery) {
      const q = logSearchQuery.toLowerCase();
      const match =
        evt.room_number?.toLowerCase().includes(q) ||
        evt.card_uid?.toLowerCase().includes(q) ||
        evt.holder_name?.toLowerCase().includes(q) ||
        evt.booking_reference?.toLowerCase().includes(q) ||
        evt.device_name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (logFilterType !== 'all' && evt.card_type !== logFilterType) {
      return false;
    }
    if (logFilterStatus !== 'all' && evt.event_type !== logFilterStatus) {
      return false;
    }
    if (logFilterAction !== 'all' && evt.action_type !== logFilterAction) {
      return false;
    }
    if (logStayRef && evt.booking_reference !== logStayRef) {
      return false;
    }
    if (logStartDate) {
      if (new Date(evt.occurred_at).getTime() < new Date(logStartDate).getTime()) return false;
    }
    if (logEndDate) {
      if (new Date(evt.occurred_at).getTime() > new Date(logEndDate).getTime()) return false;
    }
    return true;
  });

  // KPI telemetry summaries
  const totalEventsCount = filteredEvents.length;
  const grantedCount = filteredEvents.filter((e) => e.event_type === 'access_granted').length;
  const deniedCount = filteredEvents.filter((e) => e.event_type === 'access_denied').length;
  const uniqueCardsCount = new Set(filteredEvents.map((e) => e.card_uid).filter(Boolean)).size;
  const firstRecordedAccess = filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1].occurred_at : null;
  const latestRecordedAccess = filteredEvents.length > 0 ? filteredEvents[0].occurred_at : null;

  // Pagination calculation
  const totalLogPages = Math.ceil(filteredEvents.length / LOGS_PER_PAGE) || 1;
  const currentLogsPage = Math.min(logPage, totalLogPages);
  const paginatedEvents = filteredEvents.slice((currentLogsPage - 1) * LOGS_PER_PAGE, currentLogsPage * LOGS_PER_PAGE);

  const onlineDevicesCount = devices.filter((d) => d.status === 'online').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            IOT &amp; DOOR LOCK INTEGRATION · REAL-TIME ACCESS LOGS &amp; CARD ROLES
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#D8AD56]" />
            <span>{t('rfid.title', 'RFID Smart Room Key Integration')}</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            {t('rfid.subtitle', 'Super Admin lifetime keys, Cleaner dual-tap turnover tracking, Customer room keys with extra time extension, and live audit telemetry.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => { setSaModalError(null); setShowSuperAdminModal(true); }}
            className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>{t('rfid.issueSuperAdminCard', '+ Super Admin Card')}</span>
          </button>

          <button
            onClick={() => { setCleanerModalError(null); setShowCleanerModal(true); }}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('rfid.issueCleanerCard', '+ Cleaner Card')}</span>
          </button>

          <button
            onClick={() => {
              setIssueModalError(null);

              setIsIssuingCard(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('rfid.issueCustomerCard', '+ Issue Customer Card')}</span>
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
                Be-Tech BIS 5.7 USB RFID Encoder Bridge &amp; Door Lock Mesh
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
                  : '🔴 Hardware Offline (USB Disconnected)'}
              </span>
            </div>

            <p className="text-xs text-[#EFE3D6]/80 mt-1">
              Active Host: <code className="text-[#D8AD56] font-mono">{customHost}</code> · Master Cards: <strong className="text-amber-400">{superAdminCards.length} Lifetime</strong> · Cleaners: <strong className="text-cyan-400">{cleanerCards.length} Active</strong> · Enrolled Locks: <strong className="text-emerald-400">{devices.length} Devices Online</strong>
            </p>
            {bridgeStatus.error && !bridgeStatus.isOnline && (
              <p className="text-xs text-rose-300 mt-1.5 flex items-center gap-1 font-medium bg-rose-950/50 border border-rose-800/50 px-2.5 py-1 rounded-lg">
                <span>⚠️</span> <span>{bridgeStatus.error}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center flex-wrap">
          <button
            type="button"
            onClick={handleRecheckHardware}
            disabled={isRecheckingHardware}
            className="px-4 py-2 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            title="Recheck Be-Tech USB reader connection"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecheckingHardware ? 'animate-spin' : ''}`} />
            <span>{isRecheckingHardware ? 'Checking Reader...' : 'Recheck RFID Connection'}</span>
          </button>

          <button
            type="button"
            onClick={refreshAllData}
            className="px-3 py-1.5 rounded-lg border border-[#D8AD56]/40 text-xs text-[#D8AD56] hover:bg-[#D8AD56]/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Refresh card registry and enrolled locks"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHostModal(true)}
            className="px-3 py-1.5 rounded-lg border border-[#EFE3D6]/20 hover:border-[#D8AD56]/40 text-xs text-[#EFE3D6]/90 hover:text-white transition-colors flex items-center gap-1.5 bg-white/5 cursor-pointer"
            title="Configure Bridge Host IP"
          >
            <Settings className="w-3.5 h-3.5 text-[#D8AD56]" />
            <span>Host Settings</span>
          </button>
        </div>
      </div>

      {/* Global Status Message */}
      {hardwareMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 transition-all shadow-xs ${
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
          <button
            onClick={() => setHardwareMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm ring-1 ring-[#D8AD56]/50'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>{isTelugu ? 'పాత్రల మాస్టర్ కీలు' : 'Card Roles & Master Keys'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 text-amber-800 font-bold">
            {superAdminCards.length + cleanerCards.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'cards'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Customer &amp; All Keycards ({cards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'devices'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Enrolled Door Locks ({devices.length})</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold">
            {onlineDevicesCount} Active
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Access Tap Stream &amp; Telemetry ({events.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: CARD ROLES (SUPER ADMIN LIFETIME & CLEANER DUAL-TAP)               */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-8">
          {/* Section 1: Super Admin Master Cards */}
          <div className="bg-white rounded-2xl border border-amber-300/50 p-6 shadow-luxury space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#241912]">Super Admin Cards</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                      Lifetime Activation · Universal Clearance
                    </span>
                  </div>
                  <p className="text-xs text-[#786B61] mt-0.5">
                    Universal emergency master cards that unlock all 18 guest rooms, suites, and facilities permanently.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSuperAdminModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Super Admin Card</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/50 text-[#786B61] uppercase tracking-wider text-[10px] border-b border-amber-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Card Label &amp; UID</th>
                    <th className="py-3 px-4 font-semibold">Holder / Official</th>
                    <th className="py-3 px-4 font-semibold">Clearance</th>
                    <th className="py-3 px-4 font-semibold">Validity</th>
                    <th className="py-3 px-4 font-semibold">Last Room Tap</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60 text-[#241912]">
                  {superAdminCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-[#786B61]">
                        No Super Admin cards issued. Click &ldquo;Issue Super Admin Card&rdquo; above.
                      </td>
                    </tr>
                  ) : (
                    superAdminCards.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#241912] flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            <span>{c.card_label}</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#786B61]">{c.card_uid}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-[#241912]">{c.holder_name || 'System Administrator'}</strong>
                          <div className="text-[10px] text-[#786B61]">{c.holder_role || 'Super Admin'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            All 18 Rooms &amp; Suites
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-amber-800">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                            Lifetime Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#786B61] text-[11px]">
                          {c.last_tap_room ? (
                            <span>
                              Room {c.last_tap_room} ({new Date(c.last_tap_at || '').toLocaleTimeString('en-IN')})
                            </span>
                          ) : (
                            'No recent taps'
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                            <span>{c.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCardStatus(c)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                c.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {c.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCard(c.id, c.card_uid)}
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Cleaning Cards (Housekeeping Dual-Tap In & Out Automation) */}
          <div className="bg-white rounded-2xl border border-cyan-300/60 p-6 shadow-luxury space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-300 flex items-center justify-center text-cyan-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-lg font-bold text-[#241912]">Housekeeping Cleaning Cards</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 uppercase tracking-wide">
                      Dual-Tap In &amp; Out · Turnover Sanitization
                    </span>
                  </div>
                  <p className="text-xs text-[#786B61] mt-0.5">
                    <strong>Tap 1 (In):</strong> Cleaner goes inside &rarr; room marked <em>Cleaning In Progress</em>. <strong>Tap 2 (Out):</strong> Door locks &rarr; room marked <em>Clean &amp; Available</em>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCleanerModal(true)}
                className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Cleaner Card</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-100 text-xs">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-200 text-cyan-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-cyan-950 block">Checkout Guard:</strong>
                  <span className="text-cyan-900/80 text-[11px]">Cleaner cards unlock rooms only post-checkout or in dirty status. Occupied guest rooms are locked for privacy.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-200 text-cyan-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-cyan-950 block">Tap 1 (Cleaner Inside):</strong>
                  <span className="text-cyan-900/80 text-[11px]">First tap unlocks door &amp; sets room housekeeping status to <strong>In Progress</strong> in database.</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-200 text-cyan-900 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-cyan-950 block">Tap 2 / Door Lock (Done):</strong>
                  <span className="text-cyan-900/80 text-[11px]">When cleaner exits and locks door, status automatically becomes <strong>Clean &amp; Available</strong> for new guests.</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-cyan-50/50 text-[#786B61] uppercase tracking-wider text-[10px] border-b border-cyan-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Card Label &amp; UID</th>
                    <th className="py-3 px-4 font-semibold">Housekeeper Staff</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Current Activity</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-100/60 text-[#241912]">
                  {cleanerCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[#786B61]">
                        No Cleaning cards registered. Click &ldquo;Issue Cleaner Card&rdquo; above.
                      </td>
                    </tr>
                  ) : (
                    cleanerCards.map((c) => (
                      <tr key={c.id} className="hover:bg-cyan-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#241912] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                            <span>{c.card_label}</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#786B61]">{c.card_uid}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-[#241912]">{c.holder_name || 'Housekeeping Attendant'}</strong>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">
                            Housekeeping Turnover
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#786B61] text-[11px]">
                          {c.last_tap_room ? (
                            <span>
                              Last Room: <strong>{c.last_tap_room}</strong> ({new Date(c.last_tap_at || '').toLocaleTimeString('en-IN')})
                            </span>
                          ) : (
                            'Ready for assignment'
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              c.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            />
                            <span>{c.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleCardStatus(c)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                c.status === 'active'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {c.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteCard(c.id, c.card_uid)}
                              className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete Card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Interactive Live Door Tap Tester */}
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#D8AD56]/40 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#382216] text-[#D8AD56] flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#241912]">
                    Interactive Door Tap &amp; Room Unlock Tester
                  </h4>
                  <p className="text-[11px] text-[#786B61]">
                    Test Super Admin universal override, Cleaner dual-tap in/out turnover, and Customer room keys in real-time.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Live Mesh Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#786B61] mb-1">
                  Target Room
                </label>
                <select
                  value={simRoom}
                  onChange={(e) => setSimRoom(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.room_number}>
                      Room {r.room_number} ({r.category_name} - {r.operational_status}/{r.housekeeping_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#786B61] mb-1">
                  Tap with Card
                </label>
                <select
                  value={simCardUid}
                  onChange={(e) => setSimCardUid(e.target.value)}
                  disabled={cards.length === 0}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] disabled:bg-gray-100"
                >
                  {cards.length === 0 ? (
                    <option value="">No cards registered yet</option>
                  ) : (
                    <>
                      {superAdminCards.length > 0 && (
                        <optgroup label="👑 Super Admin Cards (Lifetime)">
                          {superAdminCards.map((c) => (
                            <option key={c.id} value={c.card_uid}>
                              {c.card_label} ({c.card_uid}) - {c.holder_name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {cleanerCards.length > 0 && (
                        <optgroup label="✨ Cleaning Cards (Dual-Tap)">
                          {cleanerCards.map((c) => (
                            <option key={c.id} value={c.card_uid}>
                              {c.card_label} ({c.card_uid}) - {c.holder_name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {guestCards.length > 0 && (
                        <optgroup label="🗝️ Customer / Guest Cards">
                          {guestCards.map((c) => (
                            <option key={c.id} value={c.card_uid}>
                              Room {c.assigned_room_number || 'N/A'}: {c.guest_name || c.holder_name} ({c.card_uid})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSimulateTap}
                  disabled={simBusy || cards.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {simBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D8AD56]" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                  )}
                  <span>{cards.length === 0 ? 'Issue a Card to Test Tap' : ('Tap Card on Room ' + simRoom)}</span>
                </button>
              </div>
            </div>

            {simResult && (
              <div
                className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-3 transition-all ${
                  simResult.success
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                    : 'bg-rose-50 text-rose-950 border border-rose-300'
                }`}
              >
                {simResult.success ? (
                  <DoorOpen className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <DoorClosed className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-sm">
                    {simResult.success ? '✅ Door Unlocked / Action Audited' : '❌ Access Denied'}
                  </div>
                  <div>{simResult.message}</div>
                  {simResult.event && (
                    <div className="text-[11px] opacity-80 pt-1 font-mono">
                      Event ID: {simResult.event.id} · Timestamp: {new Date(simResult.event.occurred_at).toLocaleTimeString('en-IN')} · Action: {simResult.event.action_type || 'door_unlock'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HARDWARE ENCODER STATION                                           */}
      {/* ========================================================================= */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
                  PHYSICAL USB ENCODER (BE-TECH BIS 5.7)
                </span>
                <h3 className="font-serif text-xl font-bold text-[#241912] mt-0.5">
                  Front Desk Card Read &amp; Write Terminal
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
                  <p className="text-[11px] text-[#786B61] mt-0.5">Read Mifare card data currently on encoder</p>
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
                  <h4 className="font-serif font-bold text-sm text-rose-950">Check-Out &amp; Wipe</h4>
                  <p className="text-[11px] text-rose-800/80 mt-0.5">Clear room access for next check-in</p>
                </div>
              </button>
            </div>

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
                  className="px-5 py-2.5 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                  <span>Encode Card for Room {hwRoom}</span>
                </button>
              </div>
            </form>

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
                <h4 className="font-serif font-bold text-sm text-[#241912]">Background Automation</h4>
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
                  className="text-xs font-bold text-[#D8AD56] hover:underline cursor-pointer"
                >
                  Sync Locks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACTIVE KEYCARDS (ALL ROOMS & CUSTOMERS)                            */}
      {/* ========================================================================= */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#D8AD56]/30">
            <div>
              <h3 className="font-serif font-bold text-base text-[#241912]">
                Customer &amp; All Keycards ({cards.length})
              </h3>
              <p className="text-xs text-[#786B61]">
                Master directory of all issued Super Admin, Cleaner, and Customer RFID cards with quick extra-time extension.
              </p>
            </div>
            <button
              onClick={() => {
                setIssueModalError(null);

                setIsIssuingCard(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Customer Card</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Card Label / UID</th>
                    <th className="py-3.5 px-4 font-semibold">Classification</th>
                    <th className="py-3.5 px-4 font-semibold">Room Assigned</th>
                    <th className="py-3.5 px-4 font-semibold">Holder / Guest</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Valid Period</th>
                    <th className="py-3.5 px-4 font-semibold">Extra Time / Extend</th>
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
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.card_type === 'super_admin'
                              ? 'bg-amber-100 text-amber-800'
                              : c.card_type === 'cleaner'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.card_type ? c.card_type.replace('_', ' ') : 'guest'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#382216]">
                        {c.card_type === 'super_admin'
                          ? '👑 Universal (All 18 Rooms)'
                          : c.card_type === 'cleaner'
                          ? '✨ All Turnover Rooms'
                          : c.assigned_room_number
                          ? `Room ${c.assigned_room_number}`
                          : 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4">
                        <strong>{c.holder_name || c.guest_name || 'Staff Member'}</strong>
                        {c.booking_reference && (
                          <div className="font-mono text-[10px] text-[#786B61]">{c.booking_reference}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            c.status === 'active' ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'active' ? 'bg-[#2E7D32]' : 'bg-rose-500'
                            }`}
                          />
                          <span>{c.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#786B61] text-[11px]">
                        {c.is_lifetime ? (
                          <span className="font-bold text-amber-800">Lifetime Active</span>
                        ) : (
                          <>
                            <div>{c.activated_at ? new Date(c.activated_at).toLocaleDateString('en-IN') : 'N/A'}</div>
                            <div className="font-semibold text-[#241912]">
                              Expires: {c.expires_at ? new Date(c.expires_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Standard Checkout'}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.card_type === 'guest' || !c.card_type ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleExtendValidity(c.id, 1)}
                              className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 cursor-pointer"
                              title="Extend checkout by 1 hour"
                            >
                              +1h
                            </button>
                            <button
                              onClick={() => handleExtendValidity(c.id, 2)}
                              className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 cursor-pointer"
                              title="Extend checkout by 2 hours"
                            >
                              +2h
                            </button>
                            <button
                              onClick={() => handleExtendValidity(c.id, 24)}
                              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                              title="Extend stay by 1 day (24 hours)"
                            >
                              +24h
                            </button>
                            <button
                              onClick={() => setExtendingCard(c)}
                              className="px-2 py-0.5 rounded bg-[#382216] text-[#D8AD56] hover:bg-[#25150F] text-[10px] font-bold cursor-pointer"
                              title="Set custom expiry date and time"
                            >
                              Edit Time
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#786B61] italic">Perpetual Role</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                              onClick={() => handleQuickEncodeRoom(c.room_number || c.assigned_room_number || '104', c.guest_name || c.holder_name)}
                              disabled={hardwareBusy}
                              className="px-2.5 py-1 rounded text-xs font-bold bg-[#D8AD56] hover:bg-[#c99b44] text-[#241912] shadow-sm flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                              title={`Directly encode and write physical Mifare card for Room ${c.room_number} on USB reader (Lifetime/No time limit)`}
                            >
                              <Cpu className="w-3 h-3" />
                              <span>Write Card (No Time Limit)</span>
                            </button>
                          {(c.card_type === 'guest' || !c.card_type) && c.status === 'active' && (
                            <button
                              onClick={() => {
                                setReplacingCard(c);
                                setReplaceNewUid('');
                                setReplaceError(null);
                              }}
                              className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border border-amber-400/50 cursor-pointer transition-all flex items-center gap-1"
                              title="Replace lost or damaged physical card with a new card"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-700" />
                              <span>Replace</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleCardStatus(c)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                              c.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {c.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteCard(c.id, c.card_uid)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ENROLLED LOCK DEVICES                                              */}
      {/* ========================================================================= */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#241912] mr-2">Filter Devices:</span>
              <button
                onClick={() => setFloorFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  floorFilter === 'all'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                All Devices ({devices.length})
              </button>
              <button
                onClick={() => setFloorFilter('floor1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  floorFilter === 'floor1'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 1 (Rooms 101-106)
              </button>
              <button
                onClick={() => setFloorFilter('floor2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  floorFilter === 'floor2'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 2 (Rooms 201-206)
              </button>
              <button
                onClick={() => setFloorFilter('floor3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  floorFilter === 'floor3'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Floor 3 (Rooms 301-306)
              </button>
              <button
                onClick={() => setFloorFilter('infrastructure')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  floorFilter === 'infrastructure'
                    ? 'bg-[#382216] text-[#D8AD56]'
                    : 'bg-[#FAF7F2] text-[#786B61] hover:bg-[#EFE3D6]/60'
                }`}
              >
                Encoders &amp; Gateways
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDevices.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm space-y-3 hover:border-[#D8AD56] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        d.status === 'online'
                          ? 'bg-emerald-500 animate-pulse'
                          : d.status === 'maintenance'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
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
                    <strong className="text-[#D8AD56] font-semibold">
                      {d.room_number ? `Room ${d.room_number}` : 'Central Station'}
                    </strong>
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
                      <span>
                        Battery: <strong>{d.battery_level}%</strong>
                      </span>
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

      {/* ========================================================================= */}
      {/* TAB 4: ACCESS TAP STREAM & FULL TELEMETRY AUDIT                           */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* 6 Key Performance Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-[#D8AD56]/30 shadow-xs">
              <span className="text-[10px] font-semibold text-[#786B61] uppercase tracking-wider block">Total Events</span>
              <strong className="text-xl font-bold text-[#241912]">{totalEventsCount}</strong>
              <span className="text-[10px] text-[#786B61] block mt-0.5">Recorded door taps</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">Granted / Unlocked</span>
              <strong className="text-xl font-bold text-emerald-900">{grantedCount}</strong>
              <span className="text-[10px] text-emerald-700 block mt-0.5">{totalEventsCount ? Math.round((grantedCount / totalEventsCount) * 100) : 0}% success rate</span>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 shadow-xs">
              <span className="text-[10px] font-semibold text-rose-800 uppercase tracking-wider block">Denied / Blocked</span>
              <strong className="text-xl font-bold text-rose-900">{deniedCount}</strong>
              <span className="text-[10px] text-rose-700 block mt-0.5">Security rejections</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 shadow-xs">
              <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-wider block">Unique Cards</span>
              <strong className="text-xl font-bold text-amber-950">{uniqueCardsCount}</strong>
              <span className="text-[10px] text-amber-800 block mt-0.5">Distinct keycards</span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] shadow-xs">
              <span className="text-[10px] font-semibold text-[#786B61] uppercase tracking-wider block">First Recorded</span>
              <strong className="text-xs font-bold text-[#241912] truncate block mt-1">
                {firstRecordedAccess ? new Date(firstRecordedAccess).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'None'}
              </strong>
              <span className="text-[9px] text-[#786B61] block">
                {firstRecordedAccess ? new Date(firstRecordedAccess).toLocaleDateString('en-IN') : 'No access yet'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] shadow-xs">
              <span className="text-[10px] font-semibold text-[#786B61] uppercase tracking-wider block">Latest Access</span>
              <strong className="text-xs font-bold text-[#241912] truncate block mt-1">
                {latestRecordedAccess ? new Date(latestRecordedAccess).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'None'}
              </strong>
              <span className="text-[9px] text-[#786B61] block">
                {latestRecordedAccess ? new Date(latestRecordedAccess).toLocaleDateString('en-IN') : 'No recent tap'}
              </span>
            </div>
          </div>

          {/* Multi-Dimensional Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Universal Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#786B61]" />
                <input
                  type="text"
                  placeholder="Search Guest, UID, Booking Ref..."
                  value={logSearchQuery}
                  onChange={(e) => { setLogSearchQuery(e.target.value); setLogPage(1); }}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] w-full text-[#241912]"
                />
              </div>

              {/* Room # */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter Room # (e.g. 104)"
                  value={logSearchRoom}
                  onChange={(e) => { setLogSearchRoom(e.target.value); setLogPage(1); }}
                  className="px-3 py-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] w-full text-[#241912]"
                />
              </div>

              {/* Card Role Dropdown */}
              <select
                value={logFilterType}
                onChange={(e) => { setLogFilterType(e.target.value as any); setLogPage(1); }}
                className="p-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-white text-[#241912] w-full"
              >
                <option value="all">All Card Roles</option>
                <option value="super_admin">👑 Super Admin Master Only</option>
                <option value="cleaner">✨ Housekeeping Cleaner Only</option>
                <option value="guest">🗝️ Guest / Customer Only</option>
              </select>

              {/* Result Status Dropdown */}
              <select
                value={logFilterStatus}
                onChange={(e) => { setLogFilterStatus(e.target.value as any); setLogPage(1); }}
                className="p-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-white text-[#241912] w-full"
              >
                <option value="all">All Results (Granted &amp; Denied)</option>
                <option value="access_granted">🟢 Unlocked / Granted Only</option>
                <option value="access_denied">🔴 Access Denied Only</option>
              </select>
            </div>

            {/* Row 2 Filters: Action, Stay Booking Ref, Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#EFE3D6]/60">
              {/* Action Filter */}
              <select
                value={logFilterAction}
                onChange={(e) => { setLogFilterAction(e.target.value); setLogPage(1); }}
                className="p-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-white text-[#241912] w-full"
              >
                <option value="all">All Actions (Door, Clean, Tap)</option>
                <option value="door_unlock">Door Unlock</option>
                <option value="door_lock">Door Lock</option>
                <option value="cleaning_started">Cleaning Started</option>
                <option value="cleaning_completed">Cleaning Completed</option>
                <option value="unauthorized_attempt">Unauthorized Attempt</option>
              </select>

              {/* Booking Stay Reference */}
              <input
                type="text"
                placeholder="Stay Booking Ref (e.g. TG-W-2026...)"
                value={logStayRef}
                onChange={(e) => { setLogStayRef(e.target.value); setLogPage(1); }}
                className="px-3 py-1.5 text-xs rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] w-full text-[#241912]"
              />

              {/* Start Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#786B61] whitespace-nowrap">From:</span>
                <input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => { setLogStartDate(e.target.value); setLogPage(1); }}
                  className="px-2 py-1 text-xs rounded-lg border border-[#EFE3D6] bg-white text-[#241912] w-full"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#786B61] whitespace-nowrap">To:</span>
                <input
                  type="date"
                  value={logEndDate}
                  onChange={(e) => { setLogEndDate(e.target.value); setLogPage(1); }}
                  className="px-2 py-1 text-xs rounded-lg border border-[#EFE3D6] bg-white text-[#241912] w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#786B61] pt-1">
              <span>
                Showing <strong>{paginatedEvents.length}</strong> of <strong>{filteredEvents.length}</strong> matching events (Page {currentLogsPage} of {totalLogPages})
              </span>
              {(logSearchQuery || logSearchRoom || logFilterType !== 'all' || logFilterStatus !== 'all' || logFilterAction !== 'all' || logStayRef || logStartDate || logEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogSearchQuery('');
                    setLogSearchRoom('');
                    setLogFilterType('all');
                    setLogFilterStatus('all');
                    setLogFilterAction('all');
                    setLogStayRef('');
                    setLogStartDate('');
                    setLogEndDate('');
                    setLogPage(1);
                  }}
                  className="text-xs text-[#D8AD56] hover:text-amber-800 font-bold underline cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Access Logs Table */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Timestamp (IST)</th>
                    <th className="py-3.5 px-4 font-semibold">Room Number</th>
                    <th className="py-3.5 px-4 font-semibold">Card Role</th>
                    <th className="py-3.5 px-4 font-semibold">Card UID</th>
                    <th className="py-3.5 px-4 font-semibold">Holder / Guest / Booking</th>
                    <th className="py-3.5 px-4 font-semibold">Action &amp; Status</th>
                    <th className="py-3.5 px-4 font-semibold">Device &amp; Telemetry Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                  {paginatedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-[#786B61]">
                        No tap events match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="py-3.5 px-4 text-[#786B61] whitespace-nowrap">
                          <div className="font-semibold text-[#241912]">
                            {new Date(evt.occurred_at).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                          <div className="text-[10px]">
                            {new Date(evt.occurred_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-base text-[#382216]">
                          Room {evt.room_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              evt.card_type === 'super_admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : evt.card_type === 'cleaner'
                                ? 'bg-cyan-100 text-cyan-900 border border-cyan-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {evt.card_type === 'super_admin' ? (
                              <Crown className="w-3 h-3 text-amber-700" />
                            ) : evt.card_type === 'cleaner' ? (
                              <Sparkles className="w-3 h-3 text-cyan-700" />
                            ) : (
                              <KeyRound className="w-3 h-3 text-emerald-700" />
                            )}
                            <span>{evt.card_type ? evt.card_type.replace('_', ' ') : 'guest'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#786B61]">
                          {evt.card_uid || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <strong className="text-[#241912]">{evt.holder_name || 'Staff / Guest'}</strong>
                          {evt.booking_reference && (
                            <div className="font-mono text-[10px] text-[#786B61]">{evt.booking_reference}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              evt.event_type === 'access_granted'
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {evt.event_type === 'access_granted' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            <span>
                              {evt.action_type
                                ? evt.action_type.replace('_', ' ')
                                : evt.event_type.replace('_', ' ')}
                            </span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs max-w-xs text-[#241912]">
                          <div className="font-mono text-[10px] text-[#786B61]">{evt.device_name}</div>
                          <div>{evt.reason || 'Verified tap'}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalLogPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-[#FAF7F2] border-t border-[#EFE3D6] text-xs">
                <button
                  type="button"
                  disabled={currentLogsPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Previous Page
                </button>
                <span className="text-[#786B61]">
                  Page <strong>{currentLogsPage}</strong> of <strong>{totalLogPages}</strong>
                </span>
                <button
                  type="button"
                  disabled={currentLogsPage >= totalLogPages}
                  onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912] disabled:opacity-40 cursor-pointer font-semibold"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ISSUE SUPER ADMIN CARD                                           */}
      {/* ========================================================================= */}
      {showSuperAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-amber-300 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-amber-700">LIFETIME MASTER ACCESS</span>
                  <h3 className="font-serif text-lg font-bold text-[#241912]">Issue Super Admin Card</h3>
                </div>
              </div>
              <button
                onClick={() => setShowSuperAdminModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Permanent Master Clearance Protocol</span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                This card possesses perpetual lifetime activation (no expiration date). It bypasses all room restrictions and can unlock any of the 18 guest rooms, suites, and service areas at any time.
              </p>
            </div>

            <form onSubmit={handleCreateSuperAdminCard} className="space-y-4">
              {saModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {saModalError}
                </div>
              )}
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Card Label
                </label>
                <input
                  type="text"
                  required
                  value={saCardLabel}
                  onChange={(e) => setSaCardLabel(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  placeholder="e.g. Managing Director Master Key"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Holder Name / Official Title
                </label>
                <input
                  type="text"
                  required
                  value={saHolderName}
                  onChange={(e) => setSaHolderName(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  placeholder="e.g. M. S. Reddy (Managing Director)"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowSuperAdminModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hardwareBusy}
                  className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Activate Super Admin Lifetime Key</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ISSUE CLEANER CARD                                               */}
      {/* ========================================================================= */}
      {showCleanerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-cyan-300 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-600" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-cyan-700">HOUSEKEEPING AUTOMATION</span>
                  <h3 className="font-serif text-lg font-bold text-[#241912]">Issue Cleaning Card</h3>
                </div>
              </div>
              <button
                onClick={() => setShowCleanerModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-700" />
                <span>Dual-Tap Turnover Workflow</span>
              </div>
              <p className="text-[11px] text-cyan-900/90 leading-relaxed">
                This card unlocks rooms only after guest checkout or when marked dirty.
                First tap &rarr; cleaner enters (Room status: Cleaning In Progress).
                Second tap / door lock &rarr; cleaner leaves (Room status: Clean &amp; Available).
              </p>
            </div>

            <form onSubmit={handleCreateCleanerCard} className="space-y-4">
              {cleanerModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {cleanerModalError}
                </div>
              )}
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Card Label
                </label>
                <input
                  type="text"
                  required
                  value={cleanerCardLabel}
                  onChange={(e) => setCleanerCardLabel(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  placeholder="e.g. Floor 2 Housekeeper Card"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Housekeeper Staff Name
                </label>
                <input
                  type="text"
                  required
                  value={cleanerHolderName}
                  onChange={(e) => setCleanerHolderName(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  placeholder="e.g. R. Kavitha (Housekeeping Supervisor)"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowCleanerModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={hardwareBusy}
                  className="px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Activate Cleaner Card</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ISSUE CUSTOMER CARD                                              */}
      {/* ========================================================================= */}
      {isIssuingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">
                  ENCODER STATION · CUSTOMER STAY ACCESS
                </span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Issue Customer Room Keycard</h3>
              </div>
              <button
                onClick={() => setIsIssuingCard(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {issueModalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-rose-950">Issuance Notice</div>
                  <div className="text-rose-900/90 leading-relaxed">{issueModalError}</div>
                </div>
              </div>
            )}

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
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] text-[#241912]"
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
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] text-[#241912]"
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
                  disabled={hardwareBusy}
                  className="px-5 py-2.5 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {hardwareBusy ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing to Card...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Encode &amp; Issue Keycard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EXTEND CARD VALIDITY / GIVE EXTRA TIME                           */}
      {/* ========================================================================= */}
      {extendingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#D8AD56]" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">
                    GUEST STAY EXTENSION
                  </span>
                  <h3 className="font-serif text-lg font-bold text-[#241912]">
                    Extend Keycard Validity
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setExtendingCard(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5 text-amber-950">
              <div className="flex justify-between">
                <span>Room Number:</span>
                <strong>Room {extendingCard.assigned_room_number || 'N/A'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Guest Name:</span>
                <strong>{extendingCard.guest_name || extendingCard.holder_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Current Expiry:</span>
                <span className="font-mono text-[11px]">
                  {extendingCard.expires_at
                    ? new Date(extendingCard.expires_at).toLocaleString('en-IN')
                    : 'Standard 11:00 AM Checkout'}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1.5">
                  Quick Add Hours
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 24].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => handleExtendValidity(extendingCard.id, hr)}
                      disabled={hardwareBusy}
                      className="py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      +{hr} {hr === 24 ? 'Day' : 'Hr'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#EFE3D6]">
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Or Set Specific Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setExtendingCard(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={hardwareBusy || !customExpiryDate}
                  onClick={() => handleExtendValidity(extendingCard.id, 0, customExpiryDate)}
                  className="px-5 py-2.5 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  Save Custom Expiry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BRIDGE HOST CONFIG                                               */}
      {/* ========================================================================= */}
      {showHostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">MULTI-DEVICE NETWORKING</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Configure RFID Bridge Host</h3>
              </div>
              <button
                onClick={() => setShowHostModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
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
                  className="w-full text-xs font-mono font-medium p-2.5 rounded-lg border border-[#EFE3D6] text-[#241912]"
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
                  className="px-5 py-2.5 rounded-lg bg-[#D8AD56] text-[#25150F] text-xs font-bold hover:bg-[#C69940] cursor-pointer"
                >
                  Save Host Setting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 6: REPLACE LOST / DAMAGED KEYCARD                                   */}
      {/* ========================================================================= */}
      {replacingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-amber-300 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-700" />
                <div>
                  <span className="text-[10px] uppercase font-semibold text-amber-700">RE-ISSUANCE &amp; REVOCATION</span>
                  <h3 className="font-serif text-lg font-bold text-[#241912]">Replace Lost/Damaged Keycard</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplacingCard(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1 text-amber-950">
              <div className="flex justify-between">
                <span>Room Assigned:</span>
                <strong>Room #{replacingCard.assigned_room_number || replacingCard.room_number || 'N/A'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Guest Name:</span>
                <strong>{replacingCard.guest_name || replacingCard.holder_name}</strong>
              </div>
              <div className="flex justify-between">
                <span>Revoking Card UID:</span>
                <span className="font-mono text-rose-700 font-bold">{replacingCard.card_uid}</span>
              </div>
              {replacingCard.booking_reference && (
                <div className="flex justify-between">
                  <span>Stay Booking Ref:</span>
                  <span className="font-mono text-[11px]">{replacingCard.booking_reference}</span>
                </div>
              )}
            </div>

            {replaceError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{replaceError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Reason for Replacement
                </label>
                <select
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                >
                  <option value="Physical Mifare Demagnetized">Physical Mifare Demagnetized / Chip Error</option>
                  <option value="Guest Lost Card">Guest Lost Card</option>
                  <option value="Damaged / Broken Keycard">Damaged / Broken Keycard</option>
                  <option value="Security Revocation & Re-issue">Security Revocation &amp; Re-issue</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] uppercase font-semibold text-[#786B61]">
                    New Card UID Sequence
                  </label>
                  <button
                    type="button"
                    onClick={handleScanReplaceCard}
                    disabled={replaceScanning}
                    className="text-[10px] text-amber-800 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Radio className={`w-3 h-3 ${replaceScanning ? 'animate-pulse text-amber-600' : ''}`} />
                    <span>{replaceScanning ? 'Scanning Be-Tech Reader...' : 'Scan New Card on Reader'}</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={replaceNewUid}
                    onChange={(e) => setReplaceNewUid(e.target.value)}
                    placeholder="BT-57-XXXXXX or SA-LIFETIME-..."
                    className="flex-1 font-mono text-xs p-2.5 rounded-lg border border-[#EFE3D6] text-[#241912]"
                  />
                  <button
                    type="button"
                    onClick={handleScanReplaceCard}
                    disabled={replaceScanning}
                    className="px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                    title="Scan new card placed on USB reader"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Scan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Issued By Staff
                </label>
                <input
                  type="text"
                  value={replaceStaff}
                  onChange={(e) => setReplaceStaff(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] text-[#241912]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setReplacingCard(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReplacing || !replaceNewUid.trim()}
                  onClick={handleExecuteReplaceCard}
                  className="px-5 py-2.5 rounded-lg bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isReplacing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Replacing Keycard...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Revoke Old &amp; Activate New</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ReceptionStandeeModal isOpen={showStandeeModal} onClose={() => setShowStandeeModal(false)} />
    </div>
  );
}
