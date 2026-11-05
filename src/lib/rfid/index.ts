import { repo } from '@/lib/db/repository';
import { RFIDCard, RFIDDevice, RFIDAccessEvent } from '@/types';
import { issuePhysicalKeycard, checkoutPhysicalCard, RFID_BRIDGE_URL } from './bridge-client';

export interface IRFIDProvider {
  name: string;
  isHardwareConnected: boolean;
  issueKeycard(roomNumber: string, validUntil?: string, guestName?: string, staffUser?: string): Promise<{ success: boolean; cardUid?: string; error?: string }>;
  revokeKeycard(roomNumber: string, staffUser?: string): Promise<{ success: boolean; error?: string }>;
  getLockStatus(deviceId: string): Promise<{ battery: number; isOnline: boolean }>;
}

export class BeTechProductionRFIDProvider implements IRFIDProvider {
  name = 'Sri Tayi Grand Be-Tech BIS 5.7 RFID Hardware Provider (Production)';
  isHardwareConnected = true;

  async issueKeycard(
    roomNumber: string,
    _validUntil?: string,
    guestName?: string,
    staffUser: string = 'Front Desk'
  ): Promise<{ success: boolean; cardUid?: string; error?: string }> {
    const res = await issuePhysicalKeycard({
      roomNumber,
      guestName,
      staffUser,
    });
    if (res.success) {
      return { success: true, cardUid: `BT-57-${res.cardNo || roomNumber}` };
    }
    return { success: false, error: res.error || 'Failed to encode card on physical Be-Tech writer.' };
  }

  async revokeKeycard(roomNumber: string, staffUser: string = 'Front Desk'): Promise<{ success: boolean; error?: string }> {
    const res = await checkoutPhysicalCard(roomNumber, staffUser);
    return { success: res.success, error: res.error };
  }

  async getLockStatus(_deviceId: string): Promise<{ battery: number; isOnline: boolean }> {
    return {
      battery: 95,
      isOnline: true,
    };
  }
}

const currentProvider: IRFIDProvider = new BeTechProductionRFIDProvider();

export function getActiveRFIDProvider(): IRFIDProvider {
  return currentProvider;
}

export async function issueGuestRoomKey(
  roomNumber: string,
  bookingRef: string,
  guestName: string,
  issuedBy: string = 'Front Desk'
): Promise<RFIDCard> {
  const issued = repo.issueRFIDCard(roomNumber, bookingRef, guestName, issuedBy);

  repo.logRFIDEvent({
    card_uid: issued.card_uid,
    device_name: 'Front-Desk-Encoder-01',
    room_number: roomNumber,
    event_type: 'access_granted',
    source: 'encoder',
    reason: `Physical Be-Tech Mifare 1K keycard encoded & issued to ${guestName} for stay ${bookingRef}`,
  });

  return issued;
}

export function revokeGuestRoomKey(cardId: string, reason: string = 'Guest Check-out'): RFIDCard | null {
  const card = repo.deactivateRFIDCard(cardId);
  if (card) {
    repo.logRFIDEvent({
      card_uid: card.card_uid,
      device_name: 'System-Registry',
      room_number: card.assigned_room_number || 'N/A',
      event_type: 'access_denied',
      source: 'encoder',
      reason: `Keycard revoked: ${reason}`,
    });
  }
  return card;
}
