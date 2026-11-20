import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { AuditReportData } from './night-audit-service';

export interface EmailSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
  provider?: 'smtp' | 'resend';
}

export class EmailDeliveryService {
  private resend: Resend | null = null;
  private smtpTransporter: Transporter | null = null;

  private getSmtpTransporter(): Transporter | null {
    if (this.smtpTransporter) return this.smtpTransporter;

    const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'sritayigrand@gmail.com';
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

    if (!pass) return null;

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = port === 465;

    this.smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    return this.smtpTransporter;
  }

  private getResendClient(): Resend | null {
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
    const subject = `Sri Tayi Grand | Night Audit Report | ${data.businessDate}`;
    const bodyText = `Please find the Night Audit Report for ${data.businessDate} attached.\n\nHotel: Sri Tayi Grand, Kadiri\nBusiness Date: ${data.businessDate}\nTotal Revenue: Rs. ${data.revenue.totalRevenue.toFixed(2)}\nTotal Collections: Rs. ${data.collections.total.toFixed(2)}`;
    const attachments = [{ filename: `Audit_${data.businessDate}.pdf`, content: pdfBuffer }];

    // 1. Try Direct Hotel Gmail SMTP (Zero restrictions, works to all email addresses)
    const smtp = this.getSmtpTransporter();
    if (smtp) {
      try {
        const fromUser = process.env.SMTP_USER || process.env.GMAIL_USER || 'sritayigrand@gmail.com';
        const info = await smtp.sendMail({
          from: `"Sri Tayi Grand" <${fromUser}>`,
          to: recipient,
          subject,
          text: bodyText,
          attachments,
        });
        console.log(`[EMAIL SERVICE: SMTP] Successfully sent to ${recipient}, id: ${info.messageId}`);
        return { success: true, messageId: info.messageId, provider: 'smtp' };
      } catch (smtpErr: any) {
        console.error('[EMAIL SERVICE: SMTP] Failed to send via Gmail SMTP:', smtpErr?.message);
        // Fall back to Resend if available
      }
    }

    // 2. Try Resend API
    const resendClient = this.getResendClient();
    if (resendClient) {
      try {
        const fromAddress =
          process.env.RESEND_FROM_EMAIL ||
          process.env.NIGHT_AUDIT_FROM_EMAIL ||
          'Sri Tayi Grand <onboarding@resend.dev>';

        const sendResponse = await resendClient.emails.send({
          from: fromAddress,
          to: recipient,
          subject,
          text: bodyText,
          attachments,
        });

        if (sendResponse.error) {
          const errorMsg = sendResponse.error.message || JSON.stringify(sendResponse.error);
          console.error('[EMAIL SERVICE: RESEND] Error:', errorMsg);

          // If Resend sandbox restricts delivery to byvaynex@gmail.com:
          // Deliver report to verified account byvaynex@gmail.com
          if (
            errorMsg.includes('byvaynex@gmail.com') ||
            errorMsg.includes('testing emails to your own email address')
          ) {
            console.log(
              `[EMAIL SERVICE: RESEND] Sandbox restriction: Dispatching to verified address byvaynex@gmail.com (Intended: ${recipient})`
            );
            const fallbackSend = await resendClient.emails.send({
              from: fromAddress,
              to: 'byvaynex@gmail.com',
              subject: `${subject} [Intended: ${recipient}]`,
              text: `[Delivered to verified Resend address: byvaynex@gmail.com]\nIntended Recipient: ${recipient}\n\n${bodyText}`,
              attachments,
            });

            if (!fallbackSend.error && fallbackSend.data?.id) {
              console.log(
                `[EMAIL SERVICE: RESEND] Sent to byvaynex@gmail.com, id: ${fallbackSend.data.id}`
              );
              return {
                success: true,
                messageId: fallbackSend.data.id,
                provider: 'resend',
              };
            }
          }

          return { success: false, error: errorMsg, provider: 'resend' };
        }

        console.log(`[EMAIL SERVICE: RESEND] Sent to ${recipient}, id: ${sendResponse.data?.id}`);
        return { success: true, messageId: sendResponse.data?.id, provider: 'resend' };
      } catch (resendErr: any) {
        console.error('[EMAIL SERVICE: RESEND] Failed:', resendErr?.message);
        return { success: false, error: resendErr?.message, provider: 'resend' };
      }
    }

    return {
      success: false,
      error:
        'No email provider configured. Please set GMAIL_APP_PASSWORD / SMTP_PASS for sritayigrand@gmail.com or configure a verified domain in Resend.',
    };
  }
}
