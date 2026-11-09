import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const guests = repo.getGuests();
    return NextResponse.json({
      success: true,
      guests,
      count: guests.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, reason, updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Guest ID is required.' }, { status: 400 });
    }

    if (action === 'toggle_blacklist') {
      const guest = repo.toggleGuestBlacklist(id, reason);
      if (!guest) {
        return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, guest });
    }

    if (action === 'update_profile' || updates) {
      const guest = repo.updateGuestProfile(id, updates || body);
      if (!guest) {
        return NextResponse.json({ success: false, error: 'Guest not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, guest });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
