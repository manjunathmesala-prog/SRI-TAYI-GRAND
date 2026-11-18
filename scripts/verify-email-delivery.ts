import { EmailDeliveryService } from '../src/lib/services/email-service.ts';
import { AuditReportData } from '../src/lib/services/night-audit-service.ts';

async function testEmail() {
  const emailService = new EmailDeliveryService();
  const testData: AuditReportData = {
    businessDate: '2026-11-18',
    occupancy: { totalRooms: 10, occupiedRooms: 5, availableRooms: 5, occupancyRate: 50 },
    revenue: { roomRevenue: 10000, hallRevenue: 5000, extraCharges: 500, totalRevenue: 15500 },
    collections: { cash: 5000, upi: 5000, card: 5000, total: 15000 },
    expenses: { dailyTotal: 2000 },
    outstanding: 500
  };
  const dummyPdf = Buffer.from('Test PDF Content');

  console.log('Sending test email...');
  const success = await emailService.sendReport('manjunathmesala@gmail.com', testData, dummyPdf);
  
  if (success) {
    console.log('Test email sent successfully!');
  } else {
    console.error('Test email failed.');
  }
}

testEmail();
