import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditService } from '@/lib/services/night-audit-service';
import { PdfGenerationService } from '@/lib/services/pdf-service';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();
const pdfService = new PdfGenerationService();

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const filenameParam = url.searchParams.get('filename');
    const auditIdParam = url.searchParams.get('auditId');

    // 1. Direct filename download if safe
    if (filenameParam && !filenameParam.includes('..') && !filenameParam.includes('/') && !filenameParam.includes('\\')) {
      const candidatePaths = [
        path.join(os.tmpdir(), 'reports', 'night-audit', filenameParam),
        path.join(process.cwd(), 'public', 'reports', 'night-audit', filenameParam),
      ];

      for (const targetPath of candidatePaths) {
        if (fs.existsSync(targetPath)) {
          const fileBuf = fs.readFileSync(targetPath);
          return new NextResponse(new Uint8Array(fileBuf), {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filenameParam}"`,
            },
          });
        }
      }

      // If file not on ephemeral serverless disk, load snapshot from Supabase DB
      try {
        const db = getSupabasePgPool();
        if (db) {
          const client = await db.connect();
          try {
            const res = await client.query(`
              SELECT summary_json, business_date 
              FROM daily_audit_runs 
              WHERE pdf_filename = $1 OR id = $2
              LIMIT 1;
            `, [filenameParam, auditIdParam || filenameParam]);

            if (res.rows.length > 0 && res.rows[0].summary_json && Object.keys(res.rows[0].summary_json).length > 0) {
              const pdfBuffer = await pdfService.generateReportPdf(res.rows[0].summary_json);
              return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': `attachment; filename="${filenameParam}"`,
                },
              });
            }
          } finally {
            client.release();
          }
        }
      } catch (dbErr: any) {
        console.warn('[DOWNLOAD ROUTE DB SNAPSHOT LOOKUP WARN]', dbErr.message);
      }
    }

    // 2. Generate on-the-fly for business date
    const businessDate = dateParam || new Date().toISOString().split('T')[0];
    const data = await auditService.generateAuditData(businessDate);
    const pdfBuffer = await pdfService.generateReportPdf(data);

    const safeFilename = filenameParam || `Sri_Tayi_Grand_Night_Audit_${businessDate}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
