import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * RFID Card Management API
 * Endpoint: /api/rfid/cards
 * Supports listing, activating, deactivating, extending validity, creating Super Admin, Cleaner, and Customer cards,
 * and resetting to a pristine production state with zero mock data.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'super_admin' | 'cleaner' | 'guest' | null

    const allCards = repo.getRFIDCards();
    const cards = type && type !== 'all' ? allCards.filter((c) => c.card_type === type) : allCards;
    const rooms = repo.getRooms();

    return NextResponse.json({
      success: true,
      cards,
      rooms,
      metrics: {
        total: allCards.length,
        active: allCards.filter((c) => c.status === 'active').length,
        superAdmin: allCards.filter((c) => c.card_type === 'super_admin' && c.status === 'active').length,
        cleaner: allCards.filter((c) => c.card_type === 'cleaner' && c.status === 'active').length,
        guest: allCards.filter((c) => c.card_type === 'guest' && c.status === 'active').length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to query RFID cards';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create_super_admin': {
        const cardLabel = body.cardLabel || body.card_label || 'Super Admin Master Key';
        const holderName = body.holderName || body.holder_name || 'Executive Admin';
        const issuedBy = body.issuedBy || body.issued_by || 'System Admin';
        const cardUid = body.cardUid || body.card_uid;

        const card = repo.issueSuperAdminCard(cardLabel, holderName, issuedBy, cardUid);
        return NextResponse.json({
          success: true,
          message: `Super Admin Lifetime Card created for ${card.holder_name}`,
          card,
        });
      }

      case 'create_cleaner': {
        const cardLabel = body.cardLabel || body.card_label || 'Housekeeping Cleaning Card';
        const holderName = body.holderName || body.holder_name || 'Housekeeping Staff';
        const issuedBy = body.issuedBy || body.issued_by || 'Front Desk';
        const cardUid = body.cardUid || body.card_uid;

        const card = repo.issueCleanerCard(cardLabel, holderName, issuedBy, cardUid);
        return NextResponse.json({
          success: true,
          message: `Housekeeping Cleaning Card created for ${card.holder_name}`,
          card,
        });
      }

      case 'create_guest': {
        const roomNumber = body.roomNumber || body.room_number;
        const bookingRef = body.bookingRef || body.booking_reference || body.booking_ref || `TG-${Date.now().toString().slice(-4)}`;
        const guestName = body.guestName || body.guest_name || 'Walk-in Guest';
        const issuedBy = body.issuedBy || body.issued_by || 'Front Desk';
        const expiresAt = body.expiresAt || body.expires_at;

        if (!roomNumber) {
          return NextResponse.json(
            { success: false, error: 'Room number is required for guest card' },
            { status: 400 }
          );
        }

        const cardUid = body.cardUid || body.card_uid;
        const card = repo.issueRFIDCard(
          roomNumber,
          bookingRef,
          guestName,
          issuedBy,
          expiresAt,
          cardUid
        );
        return NextResponse.json({
          success: true,
          message: `Guest card issued for Room ${roomNumber} (${card.guest_name})`,
          card,
        });
      }

      case 'extend_validity': {
        const cardId = body.cardId || body.card_id || body.cardUid || body.card_uid;
        const hours = body.hours !== undefined ? body.hours : 2;
        const customExpiry = body.customExpiry || body.custom_expiry;
        const staffUser = body.staffUser || body.staff_user || 'Front Desk';

        if (!cardId) {
          return NextResponse.json(
            { success: false, error: 'Card ID or Card UID is required' },
            { status: 400 }
          );
        }

        const hoursNum = typeof hours === 'number' ? hours : parseInt(hours || '2', 10);
        const updated = repo.extendGuestCardValidity(cardId, hoursNum, customExpiry, staffUser);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Card not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Validity for ${updated.card_label} extended until ${new Date(updated.expires_at || '').toLocaleString('en-IN')}`,
          card: updated,
        });
      }

      case 'toggle_status': {
        const cardId = body.cardId || body.card_id || body.cardUid || body.card_uid;
        const status = body.status;

        if (!cardId) {
          return NextResponse.json(
            { success: false, error: 'Card ID or Card UID is required' },
            { status: 400 }
          );
        }

        const updated = repo.toggleRFIDCardStatus(cardId, status);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: 'Card not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Card ${updated.card_label} is now ${updated.status.toUpperCase()}`,
          card: updated,
        });
      }

      case 'delete_card': {
        const cardId = body.cardId || body.card_id || body.cardUid || body.card_uid;
        if (!cardId) {
          return NextResponse.json(
            { success: false, error: 'Card ID or Card UID is required' },
            { status: 400 }
          );
        }

        const deleted = repo.deleteRFIDCard(cardId);
        return NextResponse.json({
          success: deleted,
          message: deleted ? 'Card removed from system' : 'Card not found',
        });
      }

      case 'purge_mock_data':
      case 'reset_production': {
        repo.purgeAllRFIDCards();
        repo.purgeAllRFIDEvents();
        return NextResponse.json({
          success: true,
          message: 'All mock and cached RFID cards and logs purged. System is 100% clean and production ready.',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported card action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'RFID card management error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
