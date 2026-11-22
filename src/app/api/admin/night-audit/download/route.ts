import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditService } from '@/lib/services/night-audit-service';
import { PdfGenerationService } from '@/lib/services/pdf-service';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();
const pdfService = new PdfGenerationService();

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date');
    const filenameParam = url.searchParams.get('filename');

    const reportsDir = path.join(process.cwd(), 'public', 'reports', 'night-audit');

    // 1. Direct filename download if safe
    if (filenameParam && !filenameParam.includes('..') && !filenameParam.includes('/') && !filenameParam.includes('\\')) {
      const targetPath = path.join(reportsDir, filenameParam);
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

    // 2. Generate on-the-fly for business date
    const businessDate = dateParam || new Date().toISOString().split('T')[0];
    const data = await auditService.generateAuditData(businessDate);
    const pdfBuffer = await pdfService.generateReportPdf(data);

    const safeFilename = `Sri_Tayi_Grand_Night_Audit_${businessDate}.pdf`;

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
