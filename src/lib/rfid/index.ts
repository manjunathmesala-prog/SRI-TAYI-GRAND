import { repo } from '@/lib/db/repository';
import { RFIDCard, RFIDDevice, RFIDAccessEvent } from '@/types';

export interface IRFIDProvider {
  name: string;
  isHardwareConnected: boolean;
  issueKeycard(roomNumber: string, validUntil: string): Promise<{ cardUid: string }>;
  revokeKeycard(cardUid: string): Promise<boolean>;
  getLockStatus(deviceId: string): Promise<{ battery: number; isOnline: boolean }>;
}

export class MockRFIDProvider implements IRFIDProvider {
  name = 'Sri Tayi Grand RFID Test Emulator (Safe Mode)';
  isHardwareConnected = false;

  async issueKeycard(roomNumber: string): Promise<{ cardUid: string }> {
    const hex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
    return {
      cardUid: `E0-04-${roomNumber}-${hex.slice(0, 2)}-${hex.slice(2, 4)}`,
    };
  }

  async revokeKeycard(_cardUid: string): Promise<boolean> {
    return true;
  }

  async getLockStatus(_deviceId: string): Promise<{ battery: number; isOnline: boolean }> {
    return {
      battery: 92,
      isOnline: true,
    };
  }
}

const currentProvider: IRFIDProvider = new MockRFIDProvider();

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
    source: currentProvider.isHardwareConnected ? 'encoder' : 'manual_simulation',
    reason: `Keycard encoded & issued to ${guestName} for stay ${bookingRef}`,
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
      source: currentProvider.isHardwareConnected ? 'encoder' : 'manual_simulation',
      reason: `Keycard revoked: ${reason}`,
    });
  }
  return card;
}

export function simulateDoorTap(cardUid: string, roomNumber: string): RFIDAccessEvent {
  const activeCards = repo.getRFIDCards();
  const matchedCard = activeCards.find(
    (c) => c.card_uid.toLowerCase() === cardUid.toLowerCase() && c.status === 'active'
  );

  const isValidForRoom = matchedCard && matchedCard.assigned_room_number === roomNumber;

  const event = repo.logRFIDEvent({
    card_uid: cardUid,
    device_name: `Lock-Room-${roomNumber}`,
    room_number: roomNumber,
    event_type: isValidForRoom ? 'access_granted' : 'access_denied',
    reason: isValidForRoom
      ? 'Verified guest active keycard'
      : matchedCard
      ? `Keycard not authorized for Room ${roomNumber} (Assigned to Room ${matchedCard.assigned_room_number})`
      : 'Card UID inactive, expired or unregistered',
    source: 'manual_simulation',
  });

  return event;
}
