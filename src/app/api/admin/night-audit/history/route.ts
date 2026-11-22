import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffRole } from '@/lib/auth';
import { loadDailyAuditRunsFromSupabase } from '@/lib/db/supabase-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 15));

    const runs = await loadDailyAuditRunsFromSupabase(limit);

    return NextResponse.json({
      success: true,
      runs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
