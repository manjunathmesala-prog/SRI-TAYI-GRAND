import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditService } from '@/lib/services/night-audit-service';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const businessDate = body.businessDate || new Date().toISOString().split('T')[0];

    // Optional override recipients for instant one-off test
    let overrideRecipients = undefined;
    if (body.testEmail) {
      overrideRecipients = [{ channel: 'email' as const, address: String(body.testEmail).trim(), name: 'Test Recipient' }];
    } else if (body.testPhone) {
      overrideRecipients = [{ channel: 'whatsapp' as const, address: String(body.testPhone).trim(), name: 'Test Recipient' }];
    }

    const result = await auditService.runNightAudit(businessDate, overrideRecipients);

    return NextResponse.json({
      success: true,
      message: `Night Audit report generated and dispatched for ${businessDate}`,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
