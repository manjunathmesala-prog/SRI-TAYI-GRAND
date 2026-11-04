/**
 * Sri Tayi Grand Hotel - Front Desk RFID Hardware Bridge Client
 * Communicates directly with the local Be-Tech BIS 5.7 USB Encoder Service
 * running at http://127.0.0.1:8989
 */

export const RFID_BRIDGE_URL = 'http://127.0.0.1:8989';

export interface BridgeHealthStatus {
  isOnline: boolean;
  service?: string;
  port?: number;
  readerType?: number;
  error?: string;
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
  source?: 'hardware' | 'emulator';
}

/**
 * Ping the local Be-Tech hardware bridge service
 */
export async function checkBridgeHealth(): Promise<BridgeHealthStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${RFID_BRIDGE_URL}/api/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        isOnline: data.status === 'ok',
        service: data.service || 'Be-Tech BIS 5.7 Encoder Bridge',
        port: data.port || 1,
        readerType: data.readerType || 4,
      };
    }
    return { isOnline: false, error: `HTTP ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bridge unreachable';
    return { isOnline: false, error: msg };
  }
}

/**
 * Scan a Mifare 1K card placed on the physical Be-Tech USB reader
 */
export async function readPhysicalCard(staffUser: string = 'Front Desk'): Promise<RfidCardResult> {
  try {
    const res = await fetch(`${RFID_BRIDGE_URL}/api/read-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUser,
      },
    });

    const data = await res.json();
    return {
      ...data,
      source: 'hardware',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach RFID Bridge';
    return {
      success: false,
      error: `Bridge connection error: ${msg}. Make sure Start_RFID_Bridge.bat is running on this PC.`,
      source: 'hardware',
    };
  }
}

/**
 * Encode and activate a Mifare keycard for a guest room
 */
export async function issuePhysicalKeycard(params: {
  roomNumber: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  staffUser?: string;
}): Promise<RfidCardResult> {
  try {
    const formatTime = (d: Date) => {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yy}${mm}${dd}${hh}${mi}`;
    };

    const payload: {
      roomNumber: string;
      staffUser: string;
      beginTime?: string;
      endTime?: string;
    } = {
      roomNumber: params.roomNumber,
      staffUser: params.staffUser || 'Front Desk',
    };

    if (params.checkInDate) payload.beginTime = formatTime(params.checkInDate);
    if (params.checkOutDate) payload.endTime = formatTime(params.checkOutDate);

    const res = await fetch(`${RFID_BRIDGE_URL}/api/issue-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': params.staffUser || 'Front Desk',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return {
      ...data,
      source: 'hardware',
    };
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
  try {
    const res = await fetch(`${RFID_BRIDGE_URL}/api/checkout-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUser,
      },
      body: JSON.stringify({ roomNumber, staffUser }),
    });

    const data = await res.json();
    return {
      ...data,
      source: 'hardware',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bridge unreachable';
    return {
      success: false,
      error: `Hardware bridge error: ${msg}`,
      source: 'hardware',
    };
  }
}
