import { AuditReportData } from './night-audit-service';
import PDFDocument from 'pdfkit';

export class PdfGenerationService {
  /**
   * Generates a professional PDF report from Audit Data.
   */
  public async generateReportPdf(data: AuditReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Sri Tayi Grand - Night Audit Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Business Date: ${data.businessDate}`, { align: 'center' });
      doc.moveDown();

      // Occupancy
      doc.fontSize(16).text('Occupancy Summary');
      doc.fontSize(10).text(`Total Rooms: ${data.occupancy.totalRooms}`);
      doc.text(`Occupied: ${data.occupancy.occupiedRooms}`);
      doc.text(`Available: ${data.occupancy.availableRooms}`);
      doc.text(`Occupancy Rate: ${data.occupancy.occupancyRate.toFixed(2)}%`);
      doc.moveDown();

      // Revenue
      doc.fontSize(16).text('Revenue Summary');
      doc.fontSize(10).text(`Total Revenue: ₹${data.revenue.totalRevenue.toFixed(2)}`);
      doc.text(`Room Revenue: ₹${data.revenue.roomRevenue.toFixed(2)}`);
      doc.text(`Extra Charges: ₹${data.revenue.extraCharges.toFixed(2)}`);
      doc.moveDown();

      // Collections
      doc.fontSize(16).text('Collections');
      doc.fontSize(10).text(`Total Collections: ₹${data.collections.total.toFixed(2)}`);
      doc.text(`Cash: ₹${data.collections.cash.toFixed(2)}`);
      doc.text(`UPI: ₹${data.collections.upi.toFixed(2)}`);
      doc.text(`Card: ₹${data.collections.card.toFixed(2)}`);
      doc.moveDown();

      // Featured Reviews
      if (data.featuredReviews && data.featuredReviews.length > 0) {
        doc.fontSize(16).text('Featured Guest Reviews');
        data.featuredReviews.forEach((review) => {
          doc.moveDown();
          doc.fontSize(10).text(`"${review.excerpt || review.full_text}"`, { italic: true });
          doc.fontSize(8).text(`- ${review.reviewer_name}`);
        });
      }

      doc.end();
    });
  }
}

