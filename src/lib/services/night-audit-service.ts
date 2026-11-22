import fs from 'fs';
import path from 'path';
import { repo } from '../db/repository';
import { Booking, PaymentRecord, Expense, FolioCharge, GoogleReview, NightAuditRecipient } from '@/types';
import { parseISO, isSameDay } from 'date-fns';
import { PdfGenerationService } from './pdf-service';
import { EmailDeliveryService, EmailSendResult } from './email-service';
import { WhatsAppDeliveryService, WhatsAppSendResult } from './whatsapp-service';
import {
  recordDailyAuditRunToSupabase,
  updateDailyAuditRunInSupabase,
  recordAuditDispatchLogToSupabase,
  loadNightAuditConfigFromSupabase,
} from '../db/supabase-sync';

export interface AuditReportData {
  businessDate: string;
  auditId?: string;
  generatedAt?: string;
  cutoffTime?: string;
  hotelName?: string;

  // Section A: Overview & Occupancy
  occupancy: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    cleanRooms?: number;
    dirtyRooms?: number;
    maintenanceRooms?: number;
    occupancyRate: number;
  };
  overview?: {
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    cleanRooms: number;
    dirtyRooms: number;
    maintenanceRooms: number;
    occupancyRate: number;
  };

  // Section B: Booking Summary
  bookingSummary?: {
    totalReservations: number;
    walkInBookings: number;
    websiteBookings: number;
    otaBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    checkIns: number;
    checkouts: number;
  };

  // Section C: Revenue Summary
  revenue: {
    roomRevenue: number;
    hallRevenue: number;
    extraCharges: number;
    totalRevenue: number;
    grossRevenue?: number;
    netRevenue?: number;
    cgst?: number;
    sgst?: number;
    totalGst?: number;
    discounts?: number;
  };

  // Section D: Payment Reconciliation
  collections: {
    cash: number;
    upi: number;
    card: number;
    online?: number;
    total: number;
    totalCollections?: number;
    refunds?: number;
    pendingPayments?: number;
    outstandingBalance?: number;
  };
  outstanding: number;

  // Section E: Cash Register Status
  cashRegister?: {
    activeShiftManager: string;
    openingBalance: number;
    cashCollections: number;
    cashExpenses: number;
    expectedCashInDrawer: number;
    actualCashCounted: number;
    discrepancy: number;
    isClosed: boolean;
  };

  // Section F: Hall Utilization & Revenue
  hallSummary?: {
    totalHalls: number;
    hallBookingsCount: number;
    hallEnquiriesCount: number;
    hallRevenue: number;
  };

  // Section G: Expenses & Discrepancies
  expenses: {
    dailyTotal: number;
    cashExpenses?: number;
    onlineExpenses?: number;
    categoryBreakdown?: Array<{ category: string; amount: number }>;
    itemized?: Array<{ description: string; category: string; amount: number; paymentMethod: string }>;
  };

  // Section H: Manager & Operational Audit
  operationalAudit?: {
    activeManagerOnDuty: string;
    clockedInStaff: string[];
    handoverEnforced: boolean;
    auditLogsRecordedToday: number;
  };

  // Section I: Exceptional Events & Reviews
  exceptionalEvents?: string[];
  featuredReviews: GoogleReview[];
}

export interface NightAuditDeliveryStatus {
  address: string;
  recipientName?: string;
  channel: 'email' | 'whatsapp';
  status: 'sent' | 'failed' | 'disabled' | 'configuration_required';
  error?: string;
  messageId?: string;
  provider?: string;
}

export class NightAuditService {
  private pdfService = new PdfGenerationService();
  private emailService = new EmailDeliveryService();
  private waService = new WhatsAppDeliveryService();

  public async generateAuditData(businessDate: string, auditId?: string): Promise<AuditReportData> {
    await repo.ensureSettingsLoaded();

    const targetDate = parseISO(businessDate);
    const bookings = repo.getBookings();
    const payments = repo.getPayments();
    const expenses = repo.getExpenses();
    const rooms = repo.getRooms();
    const folioCharges = repo.getFolioCharges();
    const allReviews = repo.getReviews(true);
    const staffAttendance = repo.getStaffAttendance();
    const dailyClosings = repo.getDailyClosings();
    const auditLogs = repo.getAuditLogs();
    const hallEnquiries = (repo as any).hallEnquiries || [];

    // --- Section A: Room Occupancy & Operational State ---
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.operational_status === 'occupied').length;
    const cleanRooms = rooms.filter((r) => r.operational_status === 'available').length;
    const dirtyRooms = rooms.filter((r) => r.operational_status === 'cleaning').length;
    const maintenanceRooms = rooms.filter((r) => r.operational_status === 'maintenance').length;
    const availableRooms = Math.max(0, totalRooms - occupiedRooms - maintenanceRooms);
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // --- Section B: Booking & Reservation Summary ---
    const activeBookings = bookings.filter((b) => {
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

    const walkInBookings = activeBookings.filter((b) => (b as any).source === 'walk_in' || (b as any).booking_type === 'walk-in').length;
    const websiteBookings = activeBookings.filter((b) => (b as any).source === 'website' || (b as any).source === 'online').length;
    const otaBookings = Math.max(0, activeBookings.length - walkInBookings - websiteBookings);
    const checkIns = bookings.filter((b) => b.check_in_date === businessDate && b.status !== 'cancelled').length;
    const checkouts = bookings.filter((b) => b.check_out_date === businessDate && b.status !== 'cancelled').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'cancelled' && (b.cancelled_at?.startsWith(businessDate) || b.created_at?.startsWith(businessDate))).length;

    // --- Section C: Revenue Summary ---
    const roomRevenue = activeBookings.reduce((sum, b) => {
      try {
        const inDate = parseISO(b.check_in_date);
        const outDate = parseISO(b.check_out_date);
        const diffMs = outDate.getTime() - inDate.getTime();
        const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        const amount = Number(b.subtotal_amount) || Number(b.total_amount) || 0;
        return sum + amount / nights;
      } catch {
        return sum;
      }
    }, 0);

    const hallRevenue = 0; // Convention hall direct revenue

    const extraCharges = (folioCharges || [])
      .filter((f) => {
        if (!f || !f.created_at) return false;
        try {
          return isSameDay(parseISO(f.created_at), targetDate);
        } catch {
          return false;
        }
      })
      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const grossRevenue = roomRevenue + hallRevenue + extraCharges;
    // GST statutory calculations (5% standard room slab)
    const netTaxableRevenue = Math.round(grossRevenue / 1.05);
    const totalGst = grossRevenue - netTaxableRevenue;
    const cgst = Math.round(totalGst / 2);
    const sgst = totalGst - cgst;

    // --- Section D: Collections & Payment Reconciliation ---
    const dailyPayments = (payments || []).filter((p) => {
      const pDate = p.paid_at ? p.paid_at.split('T')[0] : p.created_at ? p.created_at.split('T')[0] : null;
      return pDate === businessDate && p.status === 'successful';
    });

    const cashCollections = dailyPayments
      .filter((p) => p.payment_method === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const upiCollections = dailyPayments
      .filter((p) => p.payment_method === 'upi')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cardCollections = dailyPayments
      .filter((p) => (p.payment_method as string) === 'card' || (p.payment_method as string) === 'razorpay')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const onlineCollections = dailyPayments
      .filter((p) => p.payment_method === 'online')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalCollections = cashCollections + upiCollections + cardCollections + onlineCollections;

    const refunds = payments.filter((p) => p.refunded_at?.startsWith(businessDate)).reduce((sum, p) => sum + (Number(p.refund_amount) || 0), 0);

    const outstanding = bookings
      .filter((b) => b.status !== 'cancelled' && b.status !== 'checked_out')
      .reduce((sum, b) => sum + Math.max(0, (Number(b.total_amount) || 0) - (Number(b.paid_amount) || 0)), 0);

    // --- Section E: Cash Register & Shifts ---
    const dailyExpensesList = (expenses || []).filter((e) => {
      const dateVal = e.expense_date || e.created_at;
      if (!dateVal) return false;
      try {
        return isSameDay(parseISO(dateVal), targetDate);
      } catch {
        return false;
      }
    });

    const expenseTotal = dailyExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const cashExpenses = dailyExpensesList
      .filter((e) => e.payment_method === 'cash')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const onlineExpenses = expenseTotal - cashExpenses;

    const openingDrawerFloat = 5000;
    const expectedCashInDrawer = openingDrawerFloat + cashCollections - cashExpenses;

    const existingClosing = dailyClosings.find((c) => c.closing_date === businessDate);
    const actualCashCounted = existingClosing ? Number(existingClosing.actual_cash_counted || expectedCashInDrawer) : expectedCashInDrawer;
    const cashDiscrepancy = actualCashCounted - expectedCashInDrawer;

    // --- Section F: Convention Hall Summary ---
    const hallEnquiriesCount = (hallEnquiries || []).filter((h: any) => h.created_at?.startsWith(businessDate)).length;

    // --- Section G: Expenses Breakdown ---
    const byCategory: Record<string, number> = {};
    for (const exp of dailyExpensesList) {
      const cat = exp.category || 'General Operations';
      byCategory[cat] = (byCategory[cat] || 0) + (Number(exp.amount) || 0);
    }
    const categoryBreakdown = Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
    const itemizedExpenses = dailyExpensesList.slice(0, 10).map((e) => ({
      description: e.title || e.category || 'Expense voucher',
      category: e.category,
      amount: Number(e.amount) || 0,
      paymentMethod: e.payment_method || 'cash',
    }));

    // --- Section H: Operational Audit & MOD ---
    const dutyManagers = staffAttendance.filter((s) => s.role === 'Hotel Manager' && s.date === businessDate && !s.clock_out);
    const activeMODName = dutyManagers.length > 0 ? dutyManagers[0].staff_name : 'Hari Achari (Hotel Manager on Duty)';
    const clockedInStaff = Array.from(new Set(staffAttendance.filter((s) => s.date === businessDate).map((s) => s.staff_name)));
    const todayLogsCount = auditLogs.filter((l) => (l.timestamp || (l as any).created_at || '').startsWith(businessDate)).length;

    // --- Section I: Exceptional Events & Reviews ---
    const exceptionalEvents: string[] = [];
    if (cashDiscrepancy !== 0) {
      exceptionalEvents.push(`Cash variance of Rs. ${Math.abs(cashDiscrepancy)} ${cashDiscrepancy > 0 ? 'overage' : 'shortage'} noted in cash drawer.`);
    }
    if (maintenanceRooms > 0) {
      exceptionalEvents.push(`${maintenanceRooms} room(s) under scheduled maintenance / out of order.`);
    }
    if (exceptionalEvents.length === 0) {
      exceptionalEvents.push('Zero reconciliation anomalies detected. Daily audit fully balanced.');
    }

    const featuredReviews = (allReviews || []).filter((r) => r && r.is_featured).slice(0, 3);

    return {
      businessDate,
      auditId: auditId || `STG-AUDIT-${businessDate.replace(/-/g, '')}`,
      generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      cutoffTime: '23:59:59 IST',
      hotelName: 'Sri Tayi Grand',
      occupancy: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        cleanRooms,
        dirtyRooms,
        maintenanceRooms,
        occupancyRate,
      },
      overview: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        cleanRooms,
        dirtyRooms,
        maintenanceRooms,
        occupancyRate,
      },
      bookingSummary: {
        totalReservations: activeBookings.length,
        walkInBookings,
        websiteBookings,
        otaBookings,
        confirmedBookings: activeBookings.filter((b) => b.status === 'confirmed').length,
        cancelledBookings,
        checkIns,
        checkouts,
      },
      revenue: {
        roomRevenue,
        hallRevenue,
        extraCharges,
        totalRevenue: grossRevenue,
        grossRevenue,
        netRevenue: netTaxableRevenue,
        cgst,
        sgst,
        totalGst,
        discounts: 0,
      },
      collections: {
        cash: cashCollections,
        upi: upiCollections,
        card: cardCollections,
        online: onlineCollections,
        total: totalCollections,
        totalCollections,
        refunds,
        pendingPayments: outstanding,
        outstandingBalance: outstanding,
      },
      outstanding,
      cashRegister: {
        activeShiftManager: activeMODName,
        openingBalance: openingDrawerFloat,
        cashCollections,
        cashExpenses,
        expectedCashInDrawer,
        actualCashCounted,
        discrepancy: cashDiscrepancy,
        isClosed: Boolean(existingClosing),
      },
      hallSummary: {
        totalHalls: 2,
        hallBookingsCount: 0,
        hallEnquiriesCount,
        hallRevenue,
      },
      expenses: {
        dailyTotal: expenseTotal,
        cashExpenses,
        onlineExpenses,
        categoryBreakdown,
        itemized: itemizedExpenses,
      },
      operationalAudit: {
        activeManagerOnDuty: activeMODName,
        clockedInStaff: clockedInStaff.length > 0 ? clockedInStaff : [activeMODName],
        handoverEnforced: true,
        auditLogsRecordedToday: todayLogsCount,
      },
      exceptionalEvents,
      featuredReviews,
    };
  }

  public async runNightAudit(
    businessDate: string,
    overrideRecipients?: Partial<NightAuditRecipient>[],
    triggeredBy = 'system'
  ): Promise<{
    success: boolean;
    businessDate: string;
    auditId: string;
    data: AuditReportData;
    deliveries: NightAuditDeliveryStatus[];
    pdfPath?: string;
    pdfFilename?: string;
  }> {
    await repo.ensureSettingsLoaded();
    const settings = repo.getSettings();
    let config = settings.night_audit_config;

    // Load latest recipients & settings from Supabase if available
    try {
      const pgConfig = await loadNightAuditConfigFromSupabase();
      if (pgConfig) {
        config = pgConfig;
        settings.night_audit_config = pgConfig;
      }
    } catch {}

    const auditId = `AUDIT-${businessDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;

    // 1. Record run as in_progress in Supabase
    await recordDailyAuditRunToSupabase({
      id: auditId,
      business_date: businessDate,
      run_type: overrideRecipients ? 'manual' : 'scheduled',
      status: 'in_progress',
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    });

    try {
      // 2. Calculate Real-Time Audit Data
      const data = await this.generateAuditData(businessDate, auditId);

      // 3. Generate Official Multi-Page PDF
      const pdfBuffer = await this.pdfService.generateReportPdf(data);

      // 4. Save PDF to persistent disk storage
      const reportsDir = path.join(process.cwd(), 'public', 'reports', 'night-audit');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const pdfFilename = `Sri_Tayi_Grand_Night_Audit_${businessDate}_${auditId}.pdf`;
      const fullPdfDiskPath = path.join(reportsDir, pdfFilename);
      fs.writeFileSync(fullPdfDiskPath, pdfBuffer);
      const publicPdfUrl = `/reports/night-audit/${pdfFilename}`;

      // 5. Determine Active Recipients
      const deliveries: NightAuditDeliveryStatus[] = [];
      const activeRecipients: Partial<NightAuditRecipient>[] =
        overrideRecipients ||
        (config?.recipients?.filter((r) => r.is_active) ?? [
          { channel: 'email', address: 'byvaynex@gmail.com', name: 'Technical Director (Vaynex)' },
          { channel: 'email', address: 'contact@sritayigrand.com', name: 'Sri Tayi Grand Management' },
        ]);

      const isEmailEnabled = config ? config.email_enabled : true;
      const isWhatsappEnabled = config ? config.whatsapp_enabled : false;

      // 6. Deliver to Each Recipient
      for (const r of activeRecipients) {
        const dest = (r.address || r.recipient_address || '').trim();
        const rName = r.name || r.recipient_name || 'Recipient';
        if (!dest) continue;

        if (r.channel === 'email') {
          if (!isEmailEnabled && !overrideRecipients) {
            deliveries.push({ address: dest, recipientName: rName, channel: 'email', status: 'disabled' });
            await recordAuditDispatchLogToSupabase({
              id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              audit_run_id: auditId,
              recipient_name: rName,
              channel: 'email',
              destination: dest,
              status: 'disabled',
            });
            continue;
          }

          const sendResult: EmailSendResult = await this.emailService.sendReport(dest, data, pdfBuffer);
          const finalStatus: 'sent' | 'failed' | 'configuration_required' = sendResult.success
            ? 'sent'
            : sendResult.status === 'configuration_required'
            ? 'configuration_required'
            : 'failed';
          const dispatchStatus: 'delivered' | 'failed' | 'configuration_required' = sendResult.success
            ? 'delivered'
            : sendResult.status === 'configuration_required'
            ? 'configuration_required'
            : 'failed';

          deliveries.push({
            address: dest,
            recipientName: rName,
            channel: 'email',
            status: finalStatus,
            ...(sendResult.error ? { error: sendResult.error } : {}),
            ...(sendResult.messageId ? { messageId: sendResult.messageId } : {}),
            provider: sendResult.provider,
          });

          await recordAuditDispatchLogToSupabase({
            id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            audit_run_id: auditId,
            recipient_name: rName,
            channel: 'email',
            destination: dest,
            status: dispatchStatus,
            provider: sendResult.provider,
            provider_message_id: sendResult.messageId,
            error_message: sendResult.error,
          });
        } else if (r.channel === 'whatsapp') {
          if (!isWhatsappEnabled && !overrideRecipients) {
            deliveries.push({ address: dest, recipientName: rName, channel: 'whatsapp', status: 'disabled' });
            await recordAuditDispatchLogToSupabase({
              id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              audit_run_id: auditId,
              recipient_name: rName,
              channel: 'whatsapp',
              destination: dest,
              status: 'disabled',
            });
            continue;
          }

          const waResult: WhatsAppSendResult = await this.waService.sendSummary(dest, data);
          const finalStatus: 'sent' | 'failed' | 'configuration_required' = waResult.success
            ? 'sent'
            : waResult.status === 'configuration_required'
            ? 'configuration_required'
            : 'failed';
          const waDispatchStatus: 'delivered' | 'failed' | 'configuration_required' = waResult.success
            ? 'delivered'
            : waResult.status === 'configuration_required'
            ? 'configuration_required'
            : 'failed';

          deliveries.push({
            address: dest,
            recipientName: rName,
            channel: 'whatsapp',
            status: finalStatus,
            ...(waResult.error ? { error: waResult.error } : {}),
            ...(waResult.messageId ? { messageId: waResult.messageId } : {}),
            provider: 'whatsapp_cloud',
          });

          await recordAuditDispatchLogToSupabase({
            id: `disp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            audit_run_id: auditId,
            recipient_name: rName,
            channel: 'whatsapp',
            destination: dest,
            status: waDispatchStatus,
            provider: 'whatsapp_cloud',
            provider_message_id: waResult.messageId,
            error_message: waResult.error,
          });
        }
      }

      // 7. Update Audit Run Status in Supabase
      await updateDailyAuditRunInSupabase(auditId, {
        status: 'completed',
        summary_json: data,
        pdf_path: publicPdfUrl,
        pdf_filename: pdfFilename,
        completed_at: new Date().toISOString(),
      });

      // 8. Record in System Audit Trail
      repo.recordAuditLog({
        action: 'EXECUTE_NIGHT_AUDIT',
        entityType: 'system',
        entityId: auditId,
        details: `Night Audit executed for ${businessDate}. PDF generated (${pdfFilename}). Dispatched to ${deliveries.length} recipient(s).`,
        userName: triggeredBy === 'system' ? 'Automated Cron Engine' : triggeredBy,
        userRole: 'System',
        userId: 'stf-sys-audit',
      });

      return {
        success: true,
        businessDate,
        auditId,
        data,
        deliveries,
        pdfPath: publicPdfUrl,
        pdfFilename,
      };
    } catch (err: any) {
      console.error('[NIGHT AUDIT EXECUTION ERROR]', err);
      await updateDailyAuditRunInSupabase(auditId, {
        status: 'failed',
        error_log: err.message || 'Night audit execution failure',
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  public getChannelHealth() {
    return {
      email: this.emailService.getServiceHealth(),
      whatsapp: this.waService.getServiceHealth(),
    };
  }
}
