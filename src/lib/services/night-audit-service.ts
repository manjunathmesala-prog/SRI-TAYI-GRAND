import { repo } from '../db/repository';
import { Booking, PaymentRecord, Expense, FolioCharge, GoogleReview, NightAuditRecipient } from '@/types';
import { parseISO, isSameDay } from 'date-fns';
import { PdfGenerationService } from './pdf-service';
import { EmailDeliveryService } from './email-service';
import { WhatsAppDeliveryService } from './whatsapp-service';

export interface AuditReportData {
  businessDate: string;
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    occupancyRate: number;
  };
  revenue: {
    roomRevenue: number;
    hallRevenue: number;
    extraCharges: number;
    totalRevenue: number;
  };
  collections: {
    cash: number;
    upi: number;
    card: number;
    total: number;
  };
  expenses: {
    dailyTotal: number;
  };
  outstanding: number;
  featuredReviews: GoogleReview[];
}

export class NightAuditService {
  private pdfService = new PdfGenerationService();
  private emailService = new EmailDeliveryService();
  private waService = new WhatsAppDeliveryService();

  public async generateAuditData(businessDate: string): Promise<AuditReportData> {
    const targetDate = parseISO(businessDate);
    const bookings = repo.getBookings();
    const payments = repo.getPayments();
    const expenses = repo.getExpenses();
    const rooms = repo.getRooms();
    const folioCharges = repo.getFolioCharges();
    const allReviews = repo.getReviews(true);

    // 1. Room Occupancy
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter(r => r.operational_status === 'occupied').length;
    const availableRooms = totalRooms - occupiedRooms;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // 2. Revenue
    const activeBookings = bookings.filter(b => {
      if (b.status === 'cancelled' || b.status === 'no_show') return false;
      if (!b.check_in_date || !b.check_out_date) return false;
      try {
        const inDate = parseISO(b.check_in_date);
        const outDate = parseISO(b.check_out_date);
        return inDate <= targetDate && outDate >= targetDate;
      } catch {
        return false;
      }
    });
    
    const roomRevenue = activeBookings.reduce((sum, b) => {
      try {
        const inDate = parseISO(b.check_in_date);
        const outDate = parseISO(b.check_out_date);
        const diffMs = outDate.getTime() - inDate.getTime();
        const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const amount = Number(b.subtotal_amount) || Number(b.total_amount) || 0;
        return sum + (amount / nights);
      } catch {
        return sum;
      }
    }, 0);

    const hallRevenue = 0;
    
    const extraCharges = (folioCharges || [])
      .filter(f => {
        if (!f || !f.created_at) return false;
        try {
          return isSameDay(parseISO(f.created_at), targetDate);
        } catch {
          return false;
        }
      })
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const totalRevenue = roomRevenue + hallRevenue + extraCharges;

    // 3. Collections
    const dailyPayments = (payments || []).filter(p => {
      if (!p || !p.created_at) return false;
      try {
        return isSameDay(parseISO(p.created_at), targetDate);
      } catch {
        return false;
      }
    });
    
    const collections = {
      cash: dailyPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      upi: dailyPayments.filter(p => p.payment_method === 'upi').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      card: dailyPayments.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      total: dailyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    };

    // 4. Expenses
    const dailyExpenses = (expenses || []).filter(e => {
      const dateVal = e.expense_date || e.created_at;
      if (!dateVal) return false;
      try {
        return isSameDay(parseISO(dateVal), targetDate);
      } catch {
        return false;
      }
    });
    const expenseTotal = dailyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // 5. Outstanding
    const outstanding = bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'checked_out')
      .reduce((sum, b) => sum + Math.max(0, (Number(b.total_amount) || 0) - (Number(b.paid_amount) || 0)), 0);

    // 6. Featured Reviews (up to 3 for report)
    const featuredReviews = (allReviews || []).filter(r => r && r.is_featured).slice(0, 3);

    return {
      businessDate,
      occupancy: { totalRooms, occupiedRooms, availableRooms, occupancyRate },
      revenue: { roomRevenue, hallRevenue, extraCharges, totalRevenue },
      collections,
      expenses: { dailyTotal: expenseTotal },
      outstanding,
      featuredReviews
    };
  }


  public async runNightAudit(
    businessDate: string,
    overrideRecipients?: Partial<NightAuditRecipient>[]
  ): Promise<{
    success: boolean;
    businessDate: string;
    data: AuditReportData;
    deliveries: { address: string; channel: string; status: 'sent' | 'failed' | 'disabled'; error?: string; messageId?: string }[];
  }> {
    const settings = repo.getSettings();
    const config = settings.night_audit_config;

    // If disabled and not explicitly triggered with override recipients
    if (config && !config.enabled && !overrideRecipients) {
      console.log('[NIGHT AUDIT] Automated daily audit is currently paused in settings.');
      const data = await this.generateAuditData(businessDate);
      return { success: true, businessDate, data, deliveries: [] };
    }

    // 1. Calculate Audit Data
    const data = await this.generateAuditData(businessDate);
    
    // 2. Generate PDF
    const pdf = await this.pdfService.generateReportPdf(data);
    
    // 3. Determine Recipients
    const deliveries: { address: string; channel: string; status: 'sent' | 'failed' | 'disabled'; error?: string; messageId?: string }[] = [];

    const activeRecipients = overrideRecipients || (config?.recipients?.filter((r) => r.is_active) ?? [
      { channel: 'email', address: 'admin@sritayigrand.com', name: 'Admin' }
    ]);

    const isEmailEnabled = config ? config.email_enabled : true;
    const isWhatsappEnabled = config ? config.whatsapp_enabled : false;

    for (const r of activeRecipients) {
      const dest = r.address || r.recipient_address;
      if (!dest) continue;
      if (r.channel === 'email') {
        if (!isEmailEnabled && !overrideRecipients) {
          deliveries.push({ address: dest, channel: 'email', status: 'disabled' });
          continue;
        }
        const sendResult = await this.emailService.sendReport(dest, data, pdf);
        deliveries.push({
          address: dest,
          channel: 'email',
          status: sendResult.success ? 'sent' : 'failed',
          ...(sendResult.error ? { error: sendResult.error } : {}),
          ...(sendResult.messageId ? { messageId: sendResult.messageId } : {}),
        });
      } else if (r.channel === 'whatsapp') {
        if (!isWhatsappEnabled && !overrideRecipients) {
          deliveries.push({ address: dest, channel: 'whatsapp', status: 'disabled' });
          continue;
        }
        const sent = await this.waService.sendSummary(dest, data);
        deliveries.push({ address: dest, channel: 'whatsapp', status: sent ? 'sent' : 'failed' });
      }
    }

    return {
      success: true,
      businessDate,
      data,
      deliveries,
    };
  }
}
