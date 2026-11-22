import { AuditReportData } from './night-audit-service';

export interface WhatsAppSendResult {
  success: boolean;
  status: 'sent' | 'failed' | 'configuration_required';
  error?: string;
  messageId?: string;
}

export class WhatsAppDeliveryService {
  /**
   * Dispatches automated summary via official Meta WhatsApp Business Cloud API.
   * Requires WHATSAPP_API_TOKEN (or WA_API_TOKEN) and WHATSAPP_PHONE_NUMBER_ID.
   * Truthfully reports 'configuration_required' when credentials are unconfigured.
   */
  public async sendSummary(recipientPhone: string, data: AuditReportData): Promise<WhatsAppSendResult> {
    const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WA_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID;

    if (!apiToken || !phoneNumberId) {
      console.warn('[WHATSAPP SERVICE] WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured in environment.');
      return {
        success: false,
        status: 'configuration_required',
        error: 'WhatsApp Business API credentials (WHATSAPP_API_TOKEN) pending in environment.',
      };
    }

    // Clean recipient phone number (digits only, e.g. +91 98765 43210 -> 919876543210)
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid destination phone number: ${recipientPhone}`,
      };
    }

    const messageText = `🏨 *SRI TAYI GRAND – DAILY NIGHT AUDIT*
📅 *Business Date:* ${data.businessDate}
⏰ *Audit Time:* ${data.generatedAt || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

📊 *OPERATIONAL HIGHLIGHTS:*
• Room Occupancy: ${data.overview?.occupancyRate ?? data.occupancy?.occupancyRate ?? 0}% (${data.overview?.occupiedRooms ?? data.occupancy?.occupiedRooms ?? 0}/${data.overview?.totalRooms ?? data.occupancy?.totalRooms ?? 0} Rooms)
• Gross Revenue: ₹${(data.revenue?.grossRevenue ?? data.revenue?.totalRevenue ?? 0).toLocaleString('en-IN')}
• Total Collections: ₹${(data.collections?.totalCollections ?? data.collections?.total ?? 0).toLocaleString('en-IN')}
  - Cash: ₹${(data.collections?.cash ?? 0).toLocaleString('en-IN')}
  - Digital / UPI: ₹${(data.collections?.upi ?? 0).toLocaleString('en-IN')}
• Operational Expenses: ₹${(data.expenses?.dailyTotal ?? 0).toLocaleString('en-IN')}
• Guest Outstanding: ₹${(data.collections?.outstandingBalance ?? data.outstanding ?? 0).toLocaleString('en-IN')}

Official confidential multi-page audit report generated and archived.
Sri Tayi Grand, Kadiri – Automated Audit System`;

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        const errMsg = resData.error?.message || response.statusText;
        console.error('[WHATSAPP SERVICE] Meta API error:', errMsg);
        return {
          success: false,
          status: 'failed',
          error: errMsg,
        };
      }

      const msgId = resData.messages?.[0]?.id;
      console.log(`[WHATSAPP SERVICE] Successfully delivered to ${cleanPhone}, msgId: ${msgId}`);
      return {
        success: true,
        status: 'sent',
        messageId: msgId,
      };
    } catch (err: any) {
      console.error('[WHATSAPP SERVICE] Network error:', err.message);
      return {
        success: false,
        status: 'failed',
        error: err.message || 'WhatsApp gateway communication error',
      };
    }
  }

  public getServiceHealth(): 'operational' | 'configuration_required' {
    const apiToken = process.env.WHATSAPP_API_TOKEN || process.env.WA_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID;
    return apiToken && phoneNumberId ? 'operational' : 'configuration_required';
  }
}

