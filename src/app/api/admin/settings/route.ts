import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized: Staff session required' }, { status: 403 });
    }

    const settings = repo.getSettings();
    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Access denied: Manager or Super Admin role required' }, { status: 403 });
    }

    const body = await req.json();
    const updated = repo.updateSettings(body);

    return NextResponse.json({
      success: true,
      message: 'Hotel settings updated and synchronized to Supabase cloud.',
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
