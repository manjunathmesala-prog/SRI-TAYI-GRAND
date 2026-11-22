import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyStaffRole } from '@/lib/auth';
import { retryFailedAuditDispatchInSupabase, recordAuditDispatchLogToSupabase, getSupabasePgPool } from '@/lib/db/supabase-sync';
import { EmailDeliveryService } from '@/lib/services/email-service';
import { WhatsAppDeliveryService } from '@/lib/services/whatsapp-service';
import { NightAuditService } from '@/lib/services/night-audit-service';

export const dynamic = 'force-dynamic';

const emailService = new EmailDeliveryService();
const waService = new WhatsAppDeliveryService();
const auditService = new NightAuditService();

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dispatchLogId = body.dispatchLogId;

    if (!dispatchLogId) {
      return NextResponse.json({ success: false, error: 'dispatchLogId is required' }, { status: 400 });
    }

    const db = getSupabasePgPool();
    if (!db) {
      return NextResponse.json({ success: false, error: 'Database pool unavailable' }, { status: 503 });
    }

    const client = await db.connect();
    let dispatchLog: any = null;
    let auditRun: any = null;

    try {
      const dRes = await client.query(`SELECT * FROM audit_dispatch_logs WHERE id = $1;`, [dispatchLogId]);
      if (dRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Dispatch log not found' }, { status: 404 });
      }
      dispatchLog = dRes.rows[0];

      const rRes = await client.query(`SELECT * FROM daily_audit_runs WHERE id = $1;`, [dispatchLog.audit_run_id]);
      if (rRes.rows.length > 0) {
        auditRun = rRes.rows[0];
      }
    } finally {
      client.release();
    }

    // Set to retried state in DB
    await retryFailedAuditDispatchInSupabase(dispatchLogId);

    const businessDate = auditRun?.business_date ? new Date(auditRun.business_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const data = auditRun?.summary_json || await auditService.generateAuditData(businessDate);

    let sendResult: any = { success: false, status: 'failed', error: 'Unknown retry failure' };

    if (dispatchLog.channel === 'email') {
      let pdfBuffer: Buffer | null = null;
      if (auditRun?.pdf_filename) {
        const fullPath = path.join(process.cwd(), 'public', 'reports', 'night-audit', auditRun.pdf_filename);
        if (fs.existsSync(fullPath)) {
          pdfBuffer = fs.readFileSync(fullPath);
        }
      }
      if (!pdfBuffer) {
        const { PdfGenerationService } = await import('@/lib/services/pdf-service');
        const pdfGen = new PdfGenerationService();
        pdfBuffer = await pdfGen.generateReportPdf(data);
      }

      sendResult = await emailService.sendReport(dispatchLog.destination, data, pdfBuffer);
      await recordAuditDispatchLogToSupabase({
        id: dispatchLogId,
        audit_run_id: dispatchLog.audit_run_id,
        recipient_id: dispatchLog.recipient_id,
        recipient_name: dispatchLog.recipient_name,
        channel: 'email',
        destination: dispatchLog.destination,
        status: sendResult.success ? 'delivered' : (sendResult.status === 'configuration_required' ? 'configuration_required' : 'failed'),
        provider: sendResult.provider,
        provider_message_id: sendResult.messageId,
        error_message: sendResult.error,
        retry_count: (dispatchLog.retry_count || 0) + 1,
      });
    } else if (dispatchLog.channel === 'whatsapp') {
      sendResult = await waService.sendSummary(dispatchLog.destination, data);
      await recordAuditDispatchLogToSupabase({
        id: dispatchLogId,
        audit_run_id: dispatchLog.audit_run_id,
        recipient_id: dispatchLog.recipient_id,
        recipient_name: dispatchLog.recipient_name,
        channel: 'whatsapp',
        destination: dispatchLog.destination,
        status: sendResult.success ? 'delivered' : (sendResult.status === 'configuration_required' ? 'configuration_required' : 'failed'),
        provider: 'whatsapp_cloud',
        provider_message_id: sendResult.messageId,
        error_message: sendResult.error,
        retry_count: (dispatchLog.retry_count || 0) + 1,
      });
    }

    return NextResponse.json({
      success: sendResult.success,
      status: sendResult.status,
      message: sendResult.success ? 'Report delivery retry successful' : `Delivery retry failed: ${sendResult.error}`,
      dispatchLogId,
      error: sendResult.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
