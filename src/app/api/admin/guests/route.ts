import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function sanitizeCsvField(field: unknown): string {
  const str = String(field ?? '');
  // Prefix dangerous formula triggers with a single quote to force plain text rendering
  const formulaTriggers = ['=', '+', '-', '@', '\t', '\r'];
  const sanitized = formulaTriggers.includes(str.charAt(0)) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const guests = repo.getGuests();
    const isCsvExport = req.nextUrl.searchParams.get('export') === 'csv';

    if (isCsvExport) {
      const headers = ['ID', 'Full Name', 'Phone', 'Email', 'VIP Tier', 'Total Stays', 'Total Spend (INR)', 'City', 'State', 'Blacklisted', 'Preferences'];
      const rows = guests.map((g) => [
        sanitizeCsvField(g.id),
        sanitizeCsvField(g.full_name),
        sanitizeCsvField(g.phone),
        sanitizeCsvField(g.email),
        sanitizeCsvField(g.vip_tier || 'regular'),
        String(g.total_stays || 0),
        String(g.total_spend || 0),
        sanitizeCsvField(g.city),
        sanitizeCsvField(g.state),
        g.is_blacklisted ? 'YES' : 'NO',
        sanitizeCsvField((g.preferences || []).join(', ')),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="sri-tayi-grand-guests.csv"',
        },
      });
    }

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
