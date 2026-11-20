import { NextResponse } from 'next/server';
import { NightAuditService } from '@/lib/services/night-audit-service';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auditSecret = process.env.NIGHT_AUDIT_SECRET;

  // In development without configured secrets, permit execution
  if (!cronSecret && !auditSecret) {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  const xAuditSecret = req.headers.get('x-audit-secret');

  if (xAuditSecret && auditSecret && xAuditSecret === auditSecret) {
    return true;
  }

  if (authHeader) {
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
    if (auditSecret && authHeader === `Bearer ${auditSecret}`) return true;
  }

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const businessDate = url.searchParams.get('businessDate') || new Date().toISOString().split('T')[0];

  try {
    await auditService.runNightAudit(businessDate);
    return NextResponse.json({
      success: true,
      message: `Automated Night Audit executed successfully for ${businessDate}`,
      businessDate,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let businessDate = new Date().toISOString().split('T')[0];
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.businessDate) {
      businessDate = body.businessDate;
    }
  } catch {
    // Fallback to today
  }

  try {
    await auditService.runNightAudit(businessDate);
    return NextResponse.json({
      success: true,
      message: `Automated Night Audit executed successfully for ${businessDate}`,
      businessDate,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
