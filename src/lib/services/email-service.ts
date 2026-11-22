import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { AuditReportData } from './night-audit-service';

// Fixed Official Vaynex Email Sender Configuration
export const OFFICIAL_SENDER_NAME = 'Sri Tayi Grand Audit';
export const OFFICIAL_SENDER_EMAIL = 'audit@byvaynex.com';
export const OFFICIAL_FROM_HEADER = `${OFFICIAL_SENDER_NAME} <${OFFICIAL_SENDER_EMAIL}>`;
export const OFFICIAL_REPLY_TO = 'contact@sritayigrand.com';

export interface EmailSendResult {
  success: boolean;
  status?: 'sent' | 'failed' | 'configuration_required';
  error?: string;
  messageId?: string;
  provider?: 'smtp' | 'resend';
}

export class EmailDeliveryService {
  private resend: Resend | null = null;
  private smtpTransporter: Transporter | null = null;

  public getServiceHealth(): 'operational' | 'configuration_required' {
    const hasSmtp = Boolean(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD);
    const hasResend = Boolean(process.env.RESEND_API_KEY);
    return hasSmtp || hasResend ? 'operational' : 'configuration_required';
  }

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

  private generateHtmlSummary(data: AuditReportData): string {
    const grossRev = (data.revenue?.grossRevenue ?? data.revenue?.totalRevenue ?? 0).toLocaleString('en-IN');
    const totColl = (data.collections?.totalCollections ?? data.collections?.total ?? 0).toLocaleString('en-IN');
    const cashColl = (data.collections?.cash ?? 0).toLocaleString('en-IN');
    const upiColl = (data.collections?.upi ?? 0).toLocaleString('en-IN');
    const occRate = data.overview?.occupancyRate ?? data.occupancy?.occupancyRate ?? 0;
    const occRooms = data.overview?.occupiedRooms ?? data.occupancy?.occupiedRooms ?? 0;
    const totRooms = data.overview?.totalRooms ?? data.occupancy?.totalRooms ?? 0;
    const expTotal = (data.expenses?.dailyTotal ?? 0).toLocaleString('en-IN');
    const outstanding = (data.collections?.outstandingBalance ?? data.outstanding ?? 0).toLocaleString('en-IN');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sri Tayi Grand - Night Audit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 24px; color: #241912; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #EFE3D6; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #241912; color: #FAF7F2; padding: 28px 24px; border-bottom: 3px solid #D8AD56; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #D8AD56; }
    .header p { margin: 0; font-size: 13px; color: #EFE3D6; opacity: 0.9; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: rgba(216,173,86,0.2); color: #D8AD56; border: 1px solid #D8AD56; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
    .content { padding: 24px; }
    .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 20px; }
    .col { display: table-cell; width: 50%; padding: 8px; vertical-align: top; }
    .card { background: #FAF7F2; border: 1px solid #EFE3D6; border-radius: 12px; padding: 14px; }
    .card-label { font-size: 11px; text-transform: uppercase; font-weight: 600; color: #786A5B; margin-bottom: 4px; }
    .card-val { font-size: 18px; font-weight: 700; color: #241912; }
    .table-container { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    .table-container th { text-align: left; padding: 10px 12px; background: #FAF7F2; border-bottom: 2px solid #EFE3D6; color: #786A5B; font-size: 11px; text-transform: uppercase; }
    .table-container td { padding: 10px 12px; border-bottom: 1px solid #EFE3D6; }
    .footer { padding: 20px 24px; background: #FAF7F2; border-top: 1px solid #EFE3D6; text-align: center; font-size: 11px; color: #786A5B; }
    .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #EFE3D6; color: #241912; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Official End-of-Day Audit</span>
      <h1>SRI TAYI GRAND</h1>
      <p>Automated Daily Night Audit Certificate | Business Date: <strong>${data.businessDate}</strong></p>
    </div>
    
    <div class="content">
      <p style="font-size: 13px; line-height: 1.5; color: #4A3E31; margin-top: 0;">
        Dear Authorized Stakeholder,<br>
        The daily automated audit for <strong>${data.businessDate}</strong> has been compiled from live operational transactions. The comprehensive multi-page official certificate is attached to this email.
      </p>

      <div class="grid">
        <div class="col">
          <div class="card">
            <div class="card-label">Gross Revenue</div>
            <div class="card-val" style="color: #43001F;">₹${grossRev}</div>
          </div>
        </div>
        <div class="col">
          <div class="card">
            <div class="card-label">Total Collections</div>
            <div class="card-val" style="color: #047857;">₹${totColl}</div>
          </div>
        </div>
      </div>

      <div class="grid">
        <div class="col">
          <div class="card">
            <div class="card-label">Room Occupancy</div>
            <div class="card-val">${occRate}% <span style="font-size: 12px; font-weight: normal; color: #786A5B;">(${occRooms}/${totRooms})</span></div>
          </div>
        </div>
        <div class="col">
          <div class="card">
            <div class="card-label">Daily Expenses</div>
            <div class="card-val" style="color: #b91c1c;">₹${expTotal}</div>
          </div>
        </div>
      </div>

      <table class="table-container">
        <thead>
          <tr>
            <th>Collection Channel</th>
            <th style="text-align: right;">Amount (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cash Counter Received</td>
            <td style="text-align: right; font-weight: 600;">₹${cashColl}</td>
          </tr>
          <tr>
            <td>Digital (UPI + Razorpay + Card)</td>
            <td style="text-align: right; font-weight: 600;">₹${upiColl}</td>
          </tr>
          <tr>
            <td>Guest Unsettled / Outstanding Balance</td>
            <td style="text-align: right; font-weight: 600; color: #d97706;">₹${outstanding}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 24px; padding: 14px; background: #fff8e6; border: 1px solid #fde68a; border-radius: 10px; font-size: 12px; color: #92400e;">
        <strong>Attached Document:</strong> Complete 9-section official PDF audit certificate (Sections A–I: Overview, Bookings, Revenues, Payment Reconciliation, Cash Shift Status, Convention Hall, Itemized Expenses, Manager Audit, Reviews).
      </div>
    </div>

    <div class="footer">
      Sri Tayi Grand &bull; Bypass Road, Kadiri &bull; Andhra Pradesh &bull; Tel: 084942 23379<br>
      Official Daily Night Audit Report &bull; Powered by Vaynex Cloud Infrastructure (<a href="mailto:audit@byvaynex.com" style="color:#d97706; text-decoration:none;">audit@byvaynex.com</a>)
    </div>
  </div>
</body>
</html>`;
  }

  public async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{ filename: string; content: Buffer | string }>;
  }): Promise<EmailSendResult> {
    // Strictly enforce official Vaynex sender address
    const fromAddress = OFFICIAL_FROM_HEADER; // "Sri Tayi Grand Audit <audit@byvaynex.com>"

    // 1. Primary Dispatch Provider: Verified Resend Production API (audit@byvaynex.com)
    const resendClient = this.getResendClient();
    if (resendClient) {
      try {
        const sendResponse = await resendClient.emails.send({
          from: fromAddress,
          replyTo: OFFICIAL_REPLY_TO,
          to: options.to,
          subject: options.subject,
          text: options.text || '',
          html: options.html,
          attachments: options.attachments,
        });

        if (sendResponse.error) {
          const errorMsg = sendResponse.error.message || JSON.stringify(sendResponse.error);
          console.error('[EMAIL SERVICE: RESEND] Error:', errorMsg);
          return { success: false, status: 'failed', error: errorMsg, provider: 'resend' };
        }

        console.log(`[EMAIL SERVICE: RESEND] Sent from ${fromAddress} to ${options.to}, id: ${sendResponse.data?.id}`);
        return { success: true, status: 'sent', messageId: sendResponse.data?.id, provider: 'resend' };
      } catch (resendErr: any) {
        console.error('[EMAIL SERVICE: RESEND] Failed:', resendErr?.message);
        // Fall back to SMTP below if Resend encounters network failure
      }
    }

    // 2. Secondary Fallback: SMTP (if configured)
    const smtp = this.getSmtpTransporter();
    if (smtp) {
      try {
        const info = await smtp.sendMail({
          from: fromAddress,
          replyTo: OFFICIAL_REPLY_TO,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: options.attachments,
        });
        console.log(`[EMAIL SERVICE: SMTP] Sent from ${fromAddress} to ${options.to}, id: ${info.messageId}`);
        return { success: true, status: 'sent', messageId: info.messageId, provider: 'smtp' };
      } catch (smtpErr: any) {
        console.error('[EMAIL SERVICE: SMTP] Failed to send via SMTP:', smtpErr?.message);
      }
    }

    return {
      success: false,
      status: 'configuration_required',
      error: 'No operational email provider configured. Please set RESEND_API_KEY (audit@byvaynex.com).',
    };
  }

  public async sendReport(
    recipient: string,
    data: AuditReportData,
    pdfBuffer: Buffer
  ): Promise<EmailSendResult> {
    const subject = `Sri Tayi Grand | Daily Night Audit Report | ${data.businessDate}`;
    const bodyText = `Please find the official Night Audit Report for ${data.businessDate} attached.\n\nHotel: Sri Tayi Grand, Kadiri\nBusiness Date: ${data.businessDate}\nGross Revenue: Rs. ${(data.revenue?.grossRevenue ?? data.revenue?.totalRevenue ?? 0).toFixed(2)}\nTotal Collections: Rs. ${(data.collections?.totalCollections ?? data.collections?.total ?? 0).toFixed(2)}\nOccupancy: ${data.overview?.occupancyRate ?? data.occupancy?.occupancyRate ?? 0}%`;
    const htmlBody = this.generateHtmlSummary(data);
    const attachments = [{ filename: `Sri_Tayi_Grand_Night_Audit_${data.businessDate}.pdf`, content: pdfBuffer }];

    return this.sendEmail({
      to: recipient,
      subject,
      text: bodyText,
      html: htmlBody,
      attachments,
    });
  }
}

