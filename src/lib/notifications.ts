import { EmailDeliveryService } from './services/email-service';

const emailService = new EmailDeliveryService();

export interface NotificationPayload {
  recipient: string;
  type: 'email' | 'whatsapp' | 'sms';
  template: string;
  data: Record<string, unknown>;
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  console.log(`[NOTIFICATION DISPATCH] [${payload.type.toUpperCase()}] to ${payload.recipient}:`, {
    template: payload.template,
    data: payload.data,
  });

  if (payload.type === 'email' && payload.recipient) {
    try {
      const subject = payload.data?.subject
        ? String(payload.data.subject)
        : `Sri Tayi Grand - Notification (${payload.template.replace(/_/g, ' ').toUpperCase()})`;

      const content = Object.entries(payload.data)
        .filter(([k]) => k !== 'subject')
        .map(([k, v]) => `<p style="margin: 4px 0;"><strong>${k}:</strong> ${String(v)}</p>`)
        .join('');

      const html = `<div style="font-family: sans-serif; padding: 20px; background: #FAF7F2; border: 1px solid #EFE3D6; border-radius: 8px;">
        <h2 style="color: #241912; margin-top: 0;">SRI TAYI GRAND</h2>
        <p style="color: #786A5B; font-size: 13px;">Official Hotel Notification</p>
        <div style="background: #ffffff; padding: 16px; border-radius: 6px; margin-top: 12px; border: 1px solid #EFE3D6;">
          ${content}
        </div>
        <p style="font-size: 11px; color: #786A5B; margin-top: 16px;">
          Sri Tayi Grand &bull; Bypass Road, Kadiri &bull; Andhra Pradesh &bull; Powered by Vaynex Cloud (<a href="mailto:audit@byvaynex.com" style="color: #d97706;">audit@byvaynex.com</a>)
        </p>
      </div>`;

      await emailService.sendEmail({
        to: payload.recipient,
        subject,
        html,
        text: JSON.stringify(payload.data, null, 2),
      });
    } catch (err: any) {
      console.warn('[NOTIFICATION DISPATCH] Email send failed:', err?.message);
    }
  }

  // Always returns true so failures never block critical booking transactions
  return true;
}

