import { NextRequest, NextResponse } from 'next/server';
import { NightAuditService } from '@/lib/services/night-audit-service';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auditSecret = process.env.NIGHT_AUDIT_SECRET;

  const authHeader = req.headers.get('authorization');
  const xAuditSecret = req.headers.get('x-audit-secret');

  // 1. Secret match
  if (xAuditSecret && auditSecret && xAuditSecret === auditSecret) {
    return true;
  }
  if (authHeader) {
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
    if (auditSecret && authHeader === `Bearer ${auditSecret}`) return true;
  }

  // 2. Staff Session match
  const staffAuth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
  if (staffAuth.authorized) {
    return true;
  }

  // 3. In local development without configured secrets, permit execution
  if (!cronSecret && !auditSecret && process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Valid CRON_SECRET, NIGHT_AUDIT_SECRET, or staff session required' }, { status: 401 });
  }

  const url = new URL(req.url);
  const businessDate = url.searchParams.get('businessDate') || new Date().toISOString().split('T')[0];
  const force = url.searchParams.get('force') === 'true';

  try {
    const result = await auditService.runNightAudit({
      businessDate,
      runType: 'scheduled',
      triggeredBy: 'Vercel Cron Engine (00:00 IST)',
      forceReaudit: force,
    });

    return NextResponse.json({
      success: true,
      message: result.isIdempotentReplay
        ? `Audit for ${businessDate} was already completed (idempotent replay)`
        : `Automated Night Audit executed successfully for ${businessDate}`,
      businessDate,
      auditId: result.auditId,
      pdfPath: result.pdfPath,
      pdfFilename: result.pdfFilename,
      sha256: result.sha256,
      isIdempotentReplay: Boolean(result.isIdempotentReplay),
      deliveries: result.deliveries,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Valid CRON_SECRET, NIGHT_AUDIT_SECRET, or staff session required' }, { status: 401 });
  }

  let businessDate = new Date().toISOString().split('T')[0];
  let triggeredBy = 'Operational Dispatch (Staff Trigger)';
  let runType: 'scheduled' | 'manual' = 'manual';
  let forceReaudit = false;
  let overrideRecipients = undefined;

  try {
    const body = await req.json().catch(() => ({}));
    if (body?.businessDate) {
      businessDate = body.businessDate;
    }
    if (body?.triggeredBy) {
      triggeredBy = body.triggeredBy;
    }
    if (body?.runType) {
      runType = body.runType;
    }
    if (body?.forceReaudit) {
      forceReaudit = Boolean(body.forceReaudit);
    }
    if (Array.isArray(body?.overrideRecipients)) {
      overrideRecipients = body.overrideRecipients;
    }
  } catch {
    // Fallback to today
  }

  try {
    const result = await auditService.runNightAudit({
      businessDate,
      runType,
      triggeredBy,
      forceReaudit,
      overrideRecipients,
    });

    return NextResponse.json({
      success: true,
      message: result.isIdempotentReplay
        ? `Audit for ${businessDate} was already completed (idempotent replay)`
        : `Night Audit (${runType}) executed successfully for ${businessDate}`,
      businessDate,
      auditId: result.auditId,
      pdfPath: result.pdfPath,
      pdfFilename: result.pdfFilename,
      sha256: result.sha256,
      isIdempotentReplay: Boolean(result.isIdempotentReplay),
      deliveries: result.deliveries,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
