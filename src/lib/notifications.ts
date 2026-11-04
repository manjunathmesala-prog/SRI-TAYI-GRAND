export interface NotificationPayload {
  recipient: string;
  type: 'email' | 'whatsapp' | 'sms';
  template: string;
  data: Record<string, unknown>;
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  // In production, integrate with SendGrid/Resend for Email, Gupshup/Twilio for WhatsApp/SMS
  console.log(`[NOTIFICATION DISPATCH] [${payload.type.toUpperCase()}] to ${payload.recipient}:`, {
    template: payload.template,
    data: payload.data,
  });

  // Always returns true so failures never block critical booking transactions
  return true;
}
