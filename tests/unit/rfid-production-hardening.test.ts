import { describe, it, expect, beforeAll } from 'vitest';
import { repo } from '@/lib/db/repository';
import { getGlobalRfidHistory, getRfidTapsForRoomAndStay } from '@/lib/rfid/tap-logger';

describe('RFID Module Final Production Hardening & Verification Suite', () => {
  const testRoom = '104';
  const testGuest = 'Sri V. Ramachandra';
  const testBookingRef = `TG-TEST-RFID-${Date.now()}`;
  let primaryCardUid: string;
  let replacementCardUid: string;

  beforeAll(() => {
    primaryCardUid = `BT-57-TST-${Math.floor(100000 + Math.random() * 900000)}`;
    replacementCardUid = `BT-57-REP-${Math.floor(100000 + Math.random() * 900000)}`;
  });

  describe('1. Card Lifecycle & Room/Guest Association', () => {
    it('issues an active RFID card linked to room, guest, and booking', () => {
      const card = repo.issueRFIDCard(
        testRoom,
        testBookingRef,
        testGuest,
        'Front Desk Staff',
        new Date(Date.now() + 86400000).toISOString(),
        primaryCardUid
      );

      expect(card).toBeDefined();
      expect(card.card_uid).toBe(primaryCardUid);
      expect(card.assigned_room_number).toBe(testRoom);
      expect(card.guest_name).toBe(testGuest);
      expect(card.booking_reference).toBe(testBookingRef);
      expect(card.status).toBe('active');
      expect(card.card_type).toBe('guest');

      // Verify presence in repository
      const retrieved = repo.getRFIDCards().find((c) => c.card_uid === primaryCardUid);
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('active');
    });

    it('toggles card status between active and inactive', () => {
      const card = repo.getRFIDCards().find((c) => c.card_uid === primaryCardUid);
      expect(card).toBeDefined();

      const deactivated = repo.toggleRFIDCardStatus(primaryCardUid, 'inactive');
      expect(deactivated?.status).toBe('inactive');
      expect(deactivated?.deactivated_at).toBeDefined();

      const reactivated = repo.toggleRFIDCardStatus(primaryCardUid, 'active');
      expect(reactivated?.status).toBe('active');
    });

    it('extends keycard validity for guest stay', () => {
      const extended = repo.extendGuestCardValidity(primaryCardUid, 4, undefined, 'Duty Manager');
      expect(extended).toBeDefined();
      expect(extended?.status).toBe('active');
      const expiryMs = new Date(extended!.expires_at!).getTime();
      expect(expiryMs).toBeGreaterThan(Date.now() + 3 * 3600 * 1000);
    });
  });

  describe('2. Card Replacement Workflow', () => {
    it('revokes old card and issues new replacement card preserving room, booking, and history', () => {
      const result = repo.replaceRFIDCard(
        primaryCardUid,
        replacementCardUid,
        'Front Desk Supervisor',
        'Physical Mifare Demagnetized'
      );

      expect(result.oldCard).toBeDefined();
      expect(result.oldCard.card_uid).toBe(primaryCardUid);
      expect(result.oldCard.status).toBe('inactive');
      expect(result.oldCard.deactivated_at).toBeDefined();
      expect(result.oldCard.notes).toContain('Deactivated on replacement');

      expect(result.newCard).toBeDefined();
      expect(result.newCard.card_uid).toBe(replacementCardUid);
      expect(result.newCard.assigned_room_number).toBe(testRoom);
      expect(result.newCard.booking_reference).toBe(testBookingRef);
      expect(result.newCard.guest_name).toBe(testGuest);
      expect(result.newCard.status).toBe('active');

      // Verify old card cannot unlock room
      const oldTap = repo.processDoorTap(primaryCardUid, testRoom);
      expect(oldTap.success).toBe(false);
      expect(oldTap.message).toContain('Access Denied');

      // Verify new card successfully unlocks room
      const newTap = repo.processDoorTap(replacementCardUid, testRoom);
      expect(newTap.success).toBe(true);
      expect(newTap.message).toContain('unlocked Room');
    });
  });

  describe('3. Door Lock Tap Access Evaluation', () => {
    it('permits authorized guest to unlock assigned room', () => {
      const tap = repo.processDoorTap(replacementCardUid, testRoom);
      expect(tap.success).toBe(true);
      expect(tap.cardType).toBe('guest');
      expect(tap.event.event_type).toBe('access_granted');
      expect(tap.event.action_type).toBe('door_unlock');
    });

    it('rejects cross-room access when guest attempts unauthorized room', () => {
      const wrongRoom = '201';
      const tap = repo.processDoorTap(replacementCardUid, wrongRoom);
      expect(tap.success).toBe(false);
      expect(tap.message).toContain(`belongs to Room ${testRoom}`);
      expect(tap.event.event_type).toBe('access_denied');
      expect(tap.event.action_type).toBe('unauthorized_attempt');
    });

    it('allows Super Admin Master Key universal clearance to any room', () => {
      const masterCardUid = `SA-LIFETIME-${Math.floor(100 + Math.random() * 900)}`;
      repo.issueSuperAdminCard('Managing Director Key', 'Managing Director', 'System Root', masterCardUid);

      const tap1 = repo.processDoorTap(masterCardUid, '101');
      expect(tap1.success).toBe(true);
      expect(tap1.cardType).toBe('super_admin');
      expect(tap1.message).toContain('Super Admin Master Clearance');

      const tap2 = repo.processDoorTap(masterCardUid, '308');
      expect(tap2.success).toBe(true);
    });

    it('rejects expired card past checkout boundary', () => {
      const expiredUid = `BT-57-EXP-${Date.now()}`;
      repo.issueRFIDCard(
        testRoom,
        'STG-EXP',
        'Departed Guest',
        'Staff',
        new Date(Date.now() - 3600 * 1000).toISOString(),
        expiredUid
      );

      const tap = repo.processDoorTap(expiredUid, testRoom);
      expect(tap.success).toBe(false);
      expect(tap.message).toContain('expired past guest checkout time');
    });
  });

  describe('4. Event Deduplication & Idempotent Processing', () => {
    it('suppresses duplicate event signatures generated within 1500ms', () => {
      const dedupCardUid = `BT-57-DEDUP-${Date.now()}`;
      const initialCount = repo.getRFIDEvents().length;

      const eventInput = {
        card_uid: dedupCardUid,
        card_type: 'guest' as const,
        card_label: 'Dedup Test Card',
        device_name: `Lock-Room-305`,
        room_number: '305',
        event_type: 'access_granted' as const,
        action_type: 'door_unlock' as const,
        holder_name: 'Deduplication Test Subject',
        source: 'lock_reader' as const,
        reason: 'Rapid physical double tap simulation',
      };

      // Call 1
      const evt1 = repo.logRFIDEvent(eventInput);
      // Call 2 immediately (within 10ms)
      const evt2 = repo.logRFIDEvent(eventInput);

      expect(evt1.id).toBe(evt2.id); // Same idempotent instance returned
      const finalCount = repo.getRFIDEvents().length;
      expect(finalCount).toBe(initialCount + 1); // Exactly 1 event added, not 2
    });
  });

  describe('5. Activity History Queries & Stay Boundary Linking', () => {
    it('filters global history by room, card, or search keyword', () => {
      const res = getGlobalRfidHistory({
        roomNumber: testRoom,
        limit: 10,
      });

      expect(res.success).toBe(true);
      expect(Array.isArray(res.taps)).toBe(true);
      if (res.taps.length > 0) {
        expect(res.taps.every((t) => t.roomNumber === testRoom)).toBe(true);
      }
    });

    it('aggregates summary metrics for a room and guest stay', () => {
      const stayHistory = getRfidTapsForRoomAndStay(testRoom);
      expect(stayHistory).toBeDefined();
      expect(stayHistory.metrics).toBeDefined();
      expect(typeof stayHistory.metrics.totalTaps).toBe('number');
      expect(typeof stayHistory.metrics.grantedTaps).toBe('number');
      expect(typeof stayHistory.metrics.deniedTaps).toBe('number');
    });
  });
});
