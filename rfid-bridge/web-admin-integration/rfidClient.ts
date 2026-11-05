/**
 * Sri Tayi Grand - RFID Hardware Bridge Client
 * Communicates with the local hardware service running on http://127.0.0.1:8989
 */

const BRIDGE_URL = 'http://127.0.0.1:8989';

export interface RfidCardData {
  success: boolean;
  code?: number;
  roomNumber?: string;
  cardNo?: number;
  guestSN?: number;
  beginTime?: string;
  endTime?: string;
  message?: string;
  error?: string;
}

/**
 * 1. Read / Scan an RFID Keycard tap
 */
export async function readCard(staffUsername: string = 'Admin'): Promise<RfidCardData> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/read-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUsername
      }
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: 'Cannot connect to RFID Bridge. Ensure "Sri Tayi Grand RFID Bridge" is running on this laptop.'
    };
  }
}

/**
 * 2. Issue / Activate Keycard for a Guest Room
 */
export async function issueKeycard(params: {
  roomNumber: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  staffUsername?: string;
}): Promise<RfidCardData> {
  try {
    const formatTime = (d: Date) => {
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yy}${mm}${dd}${hh}${mi}`;
    };

    const payload: any = {
      roomNumber: params.roomNumber,
      staffUser: params.staffUsername || 'Admin'
    };

    if (params.checkInDate) payload.beginTime = formatTime(params.checkInDate);
    if (params.checkOutDate) payload.endTime = formatTime(params.checkOutDate);

    const res = await fetch(`${BRIDGE_URL}/api/issue-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': params.staffUsername || 'Admin'
      },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: 'Failed to contact local RFID hardware bridge.'
    };
  }
}

/**
 * 3. Deactivate / Clear Keycard (Guest Checkout)
 */
export async function deactivateCard(roomNumber: string, staffUsername: string = 'Admin'): Promise<RfidCardData> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/checkout-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Staff-User': staffUsername
      },
      body: JSON.stringify({ roomNumber, staffUser: staffUsername })
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: 'Failed to contact local RFID hardware bridge.'
    };
  }
}

/**
 * 4. Check if Hardware Bridge is online
 */
export async function checkBridgeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/status`, { method: 'GET' });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
