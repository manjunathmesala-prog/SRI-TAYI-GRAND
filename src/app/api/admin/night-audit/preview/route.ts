import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditService } from '@/lib/services/night-audit-service';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const businessDate = url.searchParams.get('businessDate') || new Date().toISOString().split('T')[0];

    const data = await auditService.generateAuditData(businessDate);

    return NextResponse.json({
      success: true,
      businessDate,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const businessDate = body.businessDate || new Date().toISOString().split('T')[0];

    const data = await auditService.generateAuditData(businessDate);

    return NextResponse.json({
      success: true,
      businessDate,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
