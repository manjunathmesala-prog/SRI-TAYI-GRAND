/**
 * Sri Tayi Grand Hotel - Front Desk RFID Hardware Bridge Client
 * Communicates with the Be-Tech BIS 5.7 USB Encoder Service
 * either directly at http://127.0.0.1:8989 or via the unified multi-device proxy /api/rfid/bridge
 */

export const RFID_BRIDGE_URL = 'http://127.0.0.1:8989';

export interface BridgeHealthStatus {
  isOnline: boolean;
  service?: string;
  port?: number;
  readerType?: number;
  error?: string;
  mode?: 'hardware' | 'active_mesh';
  devicesCount?: number;
}

export interface RfidCardResult {
  success: boolean;
  code?: number;
  roomNumber?: string;
  cardNo?: number;
  guestSN?: number;
  beginTime?: string;
  endTime?: string;
  message?: string;
  error?: string;
  source?: 'hardware' | 'active_mesh' | 'registry_fallback';
}

/**
 * Human-readable decoding of Be-Tech BIS 5.7 native SDK return codes
 */
export function formatRfidErrorMessage(code?: number, rawError?: string): string {
  if (code === 1 || (rawError && (rawError.includes('code: 1') || rawError.includes('code 1') || rawError.toLowerCase().includes('not detected')))) {
    return 'Be-Tech USB Card Encoder not detected. Please plug the Be-Tech card encoder USB cable into this computer and ensure it is powered on.';
  }
  if (code === 6 || (rawError && (rawError.includes('code: 6') || rawError.includes('code 6') || rawError.toLowerCase().includes('no rfid card') || rawError.toLowerCase().includes('no card')))) {
    return 'Be-Tech Encoder is connected, but no RFID keycard was detected. Please place a Mifare 1K keycard flat on the encoder surface.';
  }
  if (code === 4 || (rawError && (rawError.includes('code: 4') || rawError.includes('password mismatch')))) {
    return 'Hotel system password mismatch or sector auth failure (Configured System Password: TAYIGR).';
  }
  if (code === 5 || (rawError && (rawError.includes('code: 5') || rawError.includes('write-protected')))) {
    return 'Card write failed. The Mifare card may be damaged, write-protected, or was lifted too quickly.';
  }
  if (code === 2 || (rawError && (rawError.includes('code: 2') || rawError.includes('port is busy')))) {
    return 'Encoder communication port is busy. Please try again in a moment.';
  }
  if (code === 7 || (rawError && (rawError.includes('code: 7') || rawError.includes('card type error')))) {
    return 'Unsupported card type. Please place a Be-Tech Mifare 1K S50 keycard.';
  }
  return rawError || (code ? `Hardware error code: ${code}` : 'Hardware operation failed');
}

export function playChimeSound(success: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    if (success) {
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      osc.frequency.setValueAtTime(2349, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}

function getSavedBridgeHost(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('stg_rfid_bridge_url') || RFID_BRIDGE_URL;
  }
  return RFID_BRIDGE_URL;
}

/**
 * Ping the hardware bridge service across all devices (direct or via multi-device proxy)
 */
export async function checkBridgeHealth(): Promise<BridgeHealthStatus> {
  const host = getSavedBridgeHost();

  // 1. Try direct fetch to local/configured host first (works on front-desk PC)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${host}/api/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: true,
        mode: 'hardware',
        service: data.service || 'Be-Tech BIS 5.7 Encoder Bridge (Hardware Port 1)',
        port: data.port || 1,
        readerType: data.readerType || 4,
      };
    }
  } catch {
    // Direct connection failed or cross-device PNA block, fall back to universal API proxy
  }

  // 2. Query universal proxy /api/rfid/bridge (works on all devices: mobile, tablet, remote PCs)
  try {
    const proxyRes = await fetch(`/api/rfid/bridge?host=${encodeURIComponent(host)}`);
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return {
        isOnline: data.isOnline,
        mode: data.mode,
        service: data.service,
        port: data.port,
        readerType: data.readerType,
        devicesCount: data.devicesCount,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bridge unreachable';
    return { isOnline: false, error: msg };
  }

  return { isOnline: false, error: 'Bridge unreachable' };
}

/**
 * Scan a Mifare 1K card placed on the physical Be-Tech USB reader or device terminal
 */
export async function readPhysicalCard(staffUser: string = 'Front Desk'): Promise<RfidCardResult> {
  const host = getSavedBridgeHost();

  // Try direct hardware post (with 25s timeout for physical card encoder)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${host}/api/read-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUser,
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    return {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
      source: 'hardware',
    };
  } catch {
    // Fall back to multi-device proxy
  }

  try {
    const res = await fetch('/api/rfid/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/api/read-card',
        staffUser,
        targetHost: host,
      }),
    });
    const data = await res.json();
    return {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach RFID Bridge';
    return {
      success: false,
      error: `Hardware encoder bridge unreachable (${msg}). Please verify the RFID reader is connected.`,
      source: 'hardware',
    };
  }
}

/**
 * Encode and activate a Mifare keycard for a guest room.
 * Strictly enforces perpetual lifetime access (beginTime: 0001010000, endTime: 9912312359)
 * for absolute reliability on Be-Tech physical door hardware.
 */
export async function issuePhysicalKeycard(params: {
  roomNumber: string;
  guestName?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  staffUser?: string;
  bookingRef?: string;
}): Promise<RfidCardResult> {
  const host = getSavedBridgeHost();

  const payload = {
    roomNumber: params.roomNumber,
    guestName: params.guestName || 'Front Desk Guest',
    staffUser: params.staffUser || 'Front Desk',
    beginTime: '0001010000',
    endTime: '9912312359',
  };

  const autoPersistSuccess = (resData: RfidCardResult) => {
    if (typeof window !== 'undefined' && resData.success) {
      const cardUid = resData.cardNo ? `BT-57-${resData.cardNo}` : (resData.guestSN ? `BT-57-${resData.guestSN}` : undefined);
      fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_guest',
          roomNumber: params.roomNumber,
          guestName: params.guestName || 'Front Desk Guest',
          issuedBy: params.staffUser || 'Front Desk',
          cardUid,
          bookingRef: params.bookingRef || `TG-${Date.now().toString().slice(-4)}`,
        }),
      }).catch(() => {});
    }
  };

  // Try direct hardware post (with 25s timeout for physical card write)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${host}/api/issue-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': params.staffUser || 'Front Desk',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    const result: RfidCardResult = {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
      source: 'hardware',
    };
    if (result.success) {
      autoPersistSuccess(result);
    }
    return result;
  } catch {
    // Fall back to multi-device proxy
  }

  try {
    const res = await fetch('/api/rfid/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/api/issue-card',
        payload,
        staffUser: params.staffUser || 'Front Desk',
        targetHost: host,
      }),
    });
    const data = await res.json();
    const result: RfidCardResult = {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
    };
    if (result.success) {
      autoPersistSuccess(result);
    }
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bridge unreachable';
    return {
      success: false,
      error: `Hardware bridge error: ${msg}`,
      source: 'hardware',
    };
  }
}

/**
 * Deactivate and clear a Mifare keycard on checkout
 */
export async function checkoutPhysicalCard(
  roomNumber: string,
  staffUser: string = 'Front Desk'
): Promise<RfidCardResult> {
  const host = getSavedBridgeHost();

  const autoDeactivateSuccess = () => {
    if (typeof window !== 'undefined') {
      fetch('/api/rfid/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_status',
          roomNumber,
          status: 'inactive',
        }),
      }).catch(() => {});
    }
  };

  // Try direct hardware post (with 25s timeout for card deactivation)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${host}/api/checkout-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUser,
      },
      body: JSON.stringify({ roomNumber, staffUser }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    const result: RfidCardResult = {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
      source: 'hardware',
    };
    if (result.success) {
      autoDeactivateSuccess();
    }
    return result;
  } catch {
    // Fall back to multi-device proxy
  }

  try {
    const res = await fetch('/api/rfid/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: '/api/checkout-card',
        payload: { roomNumber, staffUser },
        staffUser,
        targetHost: host,
      }),
    });
    const data = await res.json();
    const result: RfidCardResult = {
      ...data,
      error: !data.success ? formatRfidErrorMessage(data.code, data.error) : undefined,
    };
    if (result.success) {
      autoDeactivateSuccess();
    }
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bridge unreachable';
    return {
      success: false,
      error: `Hardware bridge error: ${msg}`,
      source: 'hardware',
    };
  }
}
