import { NextResponse } from 'next/server';
import { NightAuditService } from '@/lib/services/night-audit-service';
export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

export async function POST(req: Request) {
  // 1. Secure API Route Protection (HMAC / Secret Token Check)
  const authHeader = req.headers.get('x-audit-secret');
  if (authHeader !== process.env.NIGHT_AUDIT_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { businessDate } = await req.json();
  if (!businessDate) {
    return NextResponse.json({ success: false, error: 'Missing businessDate' }, { status: 400 });
  }

  try {
    // Execute Audit
    await auditService.runNightAudit(businessDate);
    return NextResponse.json({ success: true, message: `Audit triggered for ${businessDate}` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
