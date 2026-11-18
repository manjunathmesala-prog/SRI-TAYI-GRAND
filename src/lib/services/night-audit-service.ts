import { repo } from '../db/repository.ts';
import { Booking, PaymentRecord, Expense, FolioCharge, GoogleReview } from '../../types.ts';
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
    const activeBookings = bookings.filter(b => 
      b.status !== 'cancelled' && 
      b.status !== 'no_show' &&
      parseISO(b.check_in_date) <= targetDate && 
      parseISO(b.check_out_date) >= targetDate
    );
    
    const roomRevenue = activeBookings.reduce((sum, b) => {
      const nights = Math.max(1, Math.round((parseISO(b.check_out_date).getTime() - parseISO(b.check_in_date).getTime()) / (1000 * 60 * 60 * 24)));
      return sum + (b.subtotal_amount / nights);
    }, 0);

    const hallRevenue = 0;
    
    const extraCharges = folioCharges
      .filter(f => isSameDay(parseISO(f.created_at), targetDate))
      .reduce((sum, f) => sum + f.amount, 0);

    const totalRevenue = roomRevenue + hallRevenue + extraCharges;

    // 3. Collections
    const dailyPayments = payments.filter(p => isSameDay(parseISO(p.created_at), targetDate));
    
    const collections = {
      cash: dailyPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      upi: dailyPayments.filter(p => p.payment_method === 'upi').reduce((sum, p) => sum + p.amount, 0),
      card: dailyPayments.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + p.amount, 0),
      total: dailyPayments.reduce((sum, p) => sum + p.amount, 0),
    };

    // 4. Expenses
    const dailyExpenses = expenses.filter(e => isSameDay(parseISO(e.expense_date), targetDate));
    const expenseTotal = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 5. Outstanding
    const outstanding = bookings
      .filter(b => b.status !== 'cancelled' && b.status !== 'checked_out')
      .reduce((sum, b) => sum + Math.max(0, b.total_amount - b.paid_amount), 0);

    // 6. Featured Reviews (up to 3 for report)
    const featuredReviews = allReviews.filter(r => r.is_featured).slice(0, 3);

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


  public async runNightAudit(businessDate: string): Promise<void> {
    // 1. Calculate Audit Data
    const data = await this.generateAuditData(businessDate);
    
    // 2. Generate PDF
    const pdf = await this.pdfService.generateReportPdf(data);
    
    // 3. Queue Deliveries
    // In production, fetch actual recipients from db
    const recipients = [{ email: 'admin@sritayigrand.com', whatsapp: '+919999999999' }];
    
    for (const r of recipients) {
      if (r.email) await this.emailService.sendReport(r.email, data, pdf);
      if (r.whatsapp) await this.waService.sendSummary(r.whatsapp, data);
    }
  }
}
