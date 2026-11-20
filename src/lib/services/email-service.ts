import { Resend } from 'resend';
import { AuditReportData } from './night-audit-service';

export interface EmailSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

export class EmailDeliveryService {
  private resend: Resend | null = null;

  private getClient(): Resend | null {
    if (!this.resend && process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
    return this.resend;
  }

  public async sendReport(
    recipient: string,
    data: AuditReportData,
    pdfBuffer: Buffer
  ): Promise<EmailSendResult> {
    try {
      const client = this.getClient();
      if (!client) {
        const errorMsg = 'RESEND_API_KEY is not configured in environment variables.';
        console.warn(`[EMAIL SERVICE] ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      const fromAddress =
        process.env.RESEND_FROM_EMAIL ||
        process.env.NIGHT_AUDIT_FROM_EMAIL ||
        'Sri Tayi Grand <onboarding@resend.dev>';

      const sendResponse = await client.emails.send({
        from: fromAddress,
        to: recipient,
        subject: `Sri Tayi Grand | Night Audit Report | ${data.businessDate}`,
        text: `Please find the Night Audit Report for ${data.businessDate} attached.\n\nHotel: Sri Tayi Grand, Kadiri\nBusiness Date: ${data.businessDate}\nTotal Revenue: Rs. ${data.revenue.totalRevenue.toFixed(2)}\nTotal Collections: Rs. ${data.collections.total.toFixed(2)}`,
        attachments: [{ filename: `Audit_${data.businessDate}.pdf`, content: pdfBuffer }],
      });

      if (sendResponse.error) {
        const errorMsg = sendResponse.error.message || JSON.stringify(sendResponse.error);
        console.error('[EMAIL SERVICE] Resend returned error:', errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log(`[EMAIL SERVICE] Successfully dispatched report to ${recipient}, id: ${sendResponse.data?.id}`);
      return { success: true, messageId: sendResponse.data?.id };
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown email delivery error';
      console.error('[EMAIL SERVICE] Failed to send report:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }
}
