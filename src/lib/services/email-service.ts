import { Resend } from 'resend';
import { AuditReportData } from './night-audit-service';

export class EmailDeliveryService {
  private resend: Resend | null = null;

  private getClient(): Resend | null {
    if (!this.resend && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    return this.resend;
  }

  public async sendReport(recipient: string, data: AuditReportData, pdfBuffer: Buffer): Promise<boolean> {
    try {
      const client = this.getClient();
      if (!client) {
        console.warn('[EMAIL SERVICE] RESEND_API_KEY is not configured; skipping email delivery.');
        return false;
      }

      await client.emails.send({
        from: 'Sri Tayi Grand <onboarding@resend.dev>', // Note: Use your verified domain in production
        to: recipient,
        subject: `Sri Tayi Grand | Night Audit Report | ${data.businessDate}`,
        text: `Please find the Night Audit Report for ${data.businessDate} attached.`,
        attachments: [{ filename: `Audit_${data.businessDate}.pdf`, content: pdfBuffer }],
      });
      return true;
    } catch (error) {
      console.error('[EMAIL SERVICE] Failed to send report:', error);
      return false;
    }
  }
}
