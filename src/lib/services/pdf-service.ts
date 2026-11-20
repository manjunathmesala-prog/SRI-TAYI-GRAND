import { AuditReportData } from './night-audit-service';

function escapePdfText(str: string): string {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' '); // Strip non-ASCII to prevent stream encoding errors
}

export class PdfGenerationService {
  /**
   * Generates a professional, standards-compliant PDF 1.4 report.
   * Completely self-contained: zero external font files or binary dependencies,
   * guaranteeing 100% reliability on Vercel Serverless and all platforms.
   */
  public async generateReportPdf(data: AuditReportData): Promise<Buffer> {
    const streamCmds: string[] = [];

    // Helper functions
    const setColor = (r: number, g: number, b: number) => streamCmds.push(`${r} ${g} ${b} rg`);
    const setStrokeColor = (r: number, g: number, b: number) => streamCmds.push(`${r} ${g} ${b} RG`);
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      streamCmds.push(`${x1} ${y1} m`);
      streamCmds.push(`${x2} ${y2} l`);
      streamCmds.push('S');
    };
    const drawText = (font: 'F1' | 'F2' | 'F3', size: number, x: number, y: number, text: string) => {
      streamCmds.push('BT');
      streamCmds.push(`/${font} ${size} Tf`);
      streamCmds.push(`${x} ${y} Td`);
      streamCmds.push(`(${escapePdfText(text)}) Tj`);
      streamCmds.push('ET');
    };

    // Header Banner
    setColor(0.08, 0.18, 0.36); // STG Royal Navy
    streamCmds.push('40 760 515 50 re');
    streamCmds.push('f');

    // Header Title
    setColor(1, 1, 1); // White
    drawText('F1', 18, 55, 788, 'SRI TAYI GRAND');
    drawText('F2', 11, 55, 770, 'DAILY NIGHT AUDIT REPORT');
    drawText('F2', 10, 410, 778, `Date: ${data.businessDate}`);

    // Section 1: Occupancy
    setColor(0.08, 0.18, 0.36);
    drawText('F1', 12, 40, 725, '1. ROOM OCCUPANCY');
    setStrokeColor(0.8, 0.85, 0.9);
    drawLine(40, 718, 555, 718);

    setColor(0.2, 0.25, 0.3);
    drawText('F2', 10, 50, 700, `Total Rooms: ${data.occupancy.totalRooms}`);
    drawText('F2', 10, 180, 700, `Occupied: ${data.occupancy.occupiedRooms}`);
    drawText('F2', 10, 310, 700, `Available: ${data.occupancy.availableRooms}`);
    drawText('F1', 10, 440, 700, `Occupancy Rate: ${data.occupancy.occupancyRate.toFixed(2)}%`);

    // Section 2: Revenue
    setColor(0.08, 0.18, 0.36);
    drawText('F1', 12, 40, 665, '2. REVENUE SUMMARY');
    drawLine(40, 658, 555, 658);

    setColor(0.2, 0.25, 0.3);
    drawText('F2', 10, 50, 640, `Room Revenue: Rs. ${data.revenue.roomRevenue.toFixed(2)}`);
    drawText('F2', 10, 220, 640, `Extra Charges: Rs. ${data.revenue.extraCharges.toFixed(2)}`);
    drawText('F1', 10, 400, 640, `Total Revenue: Rs. ${data.revenue.totalRevenue.toFixed(2)}`);

    // Section 3: Collections
    setColor(0.08, 0.18, 0.36);
    drawText('F1', 12, 40, 605, '3. COLLECTIONS');
    drawLine(40, 598, 555, 598);

    setColor(0.2, 0.25, 0.3);
    drawText('F2', 10, 50, 580, `Cash: Rs. ${data.collections.cash.toFixed(2)}`);
    drawText('F2', 10, 180, 580, `UPI: Rs. ${data.collections.upi.toFixed(2)}`);
    drawText('F2', 10, 310, 580, `Card: Rs. ${data.collections.card.toFixed(2)}`);
    drawText('F1', 10, 440, 580, `Total: Rs. ${data.collections.total.toFixed(2)}`);

    // Section 4: Expenses & Outstanding
    setColor(0.08, 0.18, 0.36);
    drawText('F1', 12, 40, 545, '4. EXPENSES & OUTSTANDING');
    drawLine(40, 538, 555, 538);

    setColor(0.2, 0.25, 0.3);
    drawText('F2', 10, 50, 520, `Daily Expenses: Rs. ${data.expenses.dailyTotal.toFixed(2)}`);
    drawText('F1', 10, 280, 520, `Guest Outstanding Balance: Rs. ${data.outstanding.toFixed(2)}`);

    // Section 5: Featured Reviews
    let currentY = 485;
    if (data.featuredReviews && data.featuredReviews.length > 0) {
      setColor(0.08, 0.18, 0.36);
      drawText('F1', 12, 40, currentY, '5. FEATURED GUEST REVIEWS');
      drawLine(40, currentY - 7, 555, currentY - 7);
      currentY -= 25;

      for (const rev of data.featuredReviews.slice(0, 3)) {
        setColor(0.3, 0.35, 0.4);
        const textSnippet = (rev.excerpt || rev.full_text || '').slice(0, 95);
        drawText('F3', 9, 50, currentY, `"${textSnippet}..."`);
        currentY -= 14;
        setColor(0.5, 0.55, 0.6);
        drawText('F1', 8, 60, currentY, `- ${rev.reviewer_name || 'Guest'} (${rev.rating_label || '5 stars'})`);
        currentY -= 20;
      }
    }

    // Footer
    setStrokeColor(0.85, 0.85, 0.85);
    drawLine(40, 60, 555, 60);
    setColor(0.5, 0.55, 0.6);
    drawText('F2', 8, 40, 45, 'Sri Tayi Grand, Kadiri - Confidential Daily Night Audit - Automatically Dispatched');

    const contentStream = streamCmds.join('\n') + '\n';
    const streamBuf = Buffer.from(contentStream, 'utf8');
    const streamLen = streamBuf.length;

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>\nendobj\n`,
      `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${contentStream}endstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
      '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      '7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n',
    ];

    const header = '%PDF-1.4\n';
    const offsets: number[] = [];
    let currentOffset = Buffer.byteLength(header, 'utf8');

    let body = '';
    for (const obj of objects) {
      offsets.push(currentOffset);
      body += obj;
      currentOffset += Buffer.byteLength(obj, 'utf8');
    }

    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      xref += `${String(off).padStart(10, '0')} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${currentOffset}\n%%EOF\n`;
    return Buffer.from(header + body + xref + trailer, 'utf8');
  }
}
