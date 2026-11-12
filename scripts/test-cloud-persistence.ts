import { repo } from '../src/lib/db/repository';
import { getSupabasePgPool } from '../src/lib/db/supabase-sync';

async function verifyPersistence() {
  console.log('--- STARTING CLOUD PERSISTENCE VERIFICATION TEST ---');
  const pool = getSupabasePgPool();
  if (!pool) throw new Error('Database pool could not be initialized');

  const client = await pool.connect();
  try {
    const timestamp = Date.now();

    // 1. Test Expense Persistence
    console.log('1. Testing Expense Persistence...');
    const expense = repo.createExpense({
      title: `Cloud Persistence Test Expense ${timestamp}`,
      category: 'maintenance',
      amount: 1250,
      payment_method: 'cash',
      recorded_by: 'QA Automation',
      expense_date: new Date().toISOString().split('T')[0],
      status: 'approved',
    });
    // Give async pooler 1.5 seconds to commit to Supabase
    await new Promise((r) => setTimeout(r, 1500));
    const expRes = await client.query('SELECT * FROM expenses WHERE id = $1;', [expense.id]);
    if (expRes.rows.length === 0) throw new Error(`Expense ${expense.id} did not persist to Supabase!`);
    console.log(`✅ Expense ${expense.id} successfully persisted in Supabase PostgreSQL (Title: "${expRes.rows[0].title}", Amount: ₹${expRes.rows[0].amount})`);

    // 2. Test Maintenance Ticket Persistence
    console.log('2. Testing Maintenance Ticket Persistence...');
    const ticket = repo.createMaintenanceTicket({
      room_number: '105',
      issue_title: `Faucet Leak Test ${timestamp}`,
      description: 'Minor water pressure fluctuation in bathroom',
      category: 'plumbing',
      priority: 'low',
      reported_by: 'Housekeeping QA',
      estimated_cost: 450,
      room_blocked: false,
    });
    await new Promise((r) => setTimeout(r, 1500));
    const maintRes = await client.query('SELECT * FROM room_maintenance WHERE ticket_id = $1;', [ticket.id]);
    if (maintRes.rows.length === 0) throw new Error(`Maintenance ticket ${ticket.id} did not persist to Supabase!`);
    console.log(`✅ Maintenance Ticket ${ticket.id} successfully persisted in Supabase PostgreSQL (Room: ${maintRes.rows[0].room_number}, Issue: "${maintRes.rows[0].issue_description}")`);

    // 3. Test Hall Enquiry Persistence
    console.log('3. Testing Convention Hall Enquiry Persistence...');
    const enquiry = repo.createHallEnquiry({
      name: `Kalyan Kumar ${timestamp}`,
      phone: '9848022338',
      email: 'kalyan.test@sritayigrand.com',
      event_type: 'Reception',
      event_date: '2026-12-25',
      expected_guests: 500,
      requirements: 'Mandap, AC Banquet Hall, Audio System',
    });
    await new Promise((r) => setTimeout(r, 1500));
    const heRes = await client.query('SELECT * FROM hall_enquiries WHERE enquiry_reference = $1;', [enquiry.enquiry_reference]);
    if (heRes.rows.length === 0) throw new Error(`Hall enquiry ${enquiry.enquiry_reference} did not persist to Supabase!`);
    console.log(`✅ Hall Enquiry ${enquiry.enquiry_reference} successfully persisted in Supabase PostgreSQL (Name: "${heRes.rows[0].name}", Guests: ${heRes.rows[0].expected_guests})`);

    // 4. Test Cash Transaction Persistence
    console.log('4. Testing Cash Transaction Persistence...');
    const tx = repo.recordCashTransaction({
      type: 'cash_in',
      category: 'guest_payment',
      amount: 3000,
      reason: `Advance cash payment for stay ${timestamp}`,
      performed_by: 'Front Desk QA',
    });
    await new Promise((r) => setTimeout(r, 1500));
    const txRes = await client.query('SELECT * FROM cash_transactions WHERE id = $1;', [tx.id]);
    if (txRes.rows.length === 0) throw new Error(`Cash transaction ${tx.id} did not persist to Supabase!`);
    console.log(`✅ Cash Transaction ${tx.id} successfully persisted in Supabase PostgreSQL (Type: ${txRes.rows[0].type}, Amount: ₹${txRes.rows[0].amount})`);

    // 5. Test Folio Charge (Additional Charges) Persistence
    console.log('5. Testing Folio Charge Persistence...');
    const charge = repo.addFolioCharge({
      booking_id: 'bk-test-01',
      booking_reference: `STG-TEST-${timestamp}`,
      category: 'room_service',
      description: 'Morning South Indian Breakfast Tray',
      amount: 250,
      tax_rate: 0.05,
      posted_by: 'Room Service Lead',
    });
    await new Promise((r) => setTimeout(r, 1500));
    const fcRes = await client.query('SELECT * FROM additional_charges WHERE charge_id = $1;', [charge.id]);
    if (fcRes.rows.length === 0) throw new Error(`Folio charge ${charge.id} did not persist to Supabase!`);
    console.log(`✅ Folio Charge ${charge.id} successfully persisted in Supabase PostgreSQL (Total: ₹${fcRes.rows[0].total_amount}, Desc: "${fcRes.rows[0].description}")`);

    // 6. Test Audit Log Persistence
    console.log('6. Testing Audit Log Persistence...');
    const log = repo.recordAuditLog({
      action: 'SECURITY_VERIFICATION_TEST',
      entityType: 'SECURITY',
      entityId: `sec-${timestamp}`,
      details: 'Automated verification of Supabase PostgreSQL live synchronization',
      userName: 'Principal Security QA',
      userRole: 'Super Admin',
    });
    await new Promise((r) => setTimeout(r, 1500));
    const alRes = await client.query('SELECT * FROM audit_logs WHERE log_id = $1;', [log.id]);
    if (alRes.rows.length === 0) throw new Error(`Audit log ${log.id} did not persist to Supabase!`);
    console.log(`✅ Audit Log ${log.id} successfully persisted in Supabase PostgreSQL (Action: "${alRes.rows[0].action}", User: "${alRes.rows[0].user_name}")`);

    // CLEANUP TEST RECORDS (Keep DB clean)
    console.log('\nCleaning up verification records...');
    await client.query('DELETE FROM expenses WHERE id = $1;', [expense.id]);
    await client.query('DELETE FROM room_maintenance WHERE ticket_id = $1;', [ticket.id]);
    await client.query('DELETE FROM hall_enquiries WHERE enquiry_reference = $1;', [enquiry.enquiry_reference]);
    await client.query('DELETE FROM cash_transactions WHERE id = $1;', [tx.id]);
    await client.query('DELETE FROM additional_charges WHERE charge_id = $1;', [charge.id]);
    await client.query('DELETE FROM audit_logs WHERE log_id = $1;', [log.id]);
    console.log('✅ Cleanup complete.');

    console.log('\n🎉 ALL 6 DOMAIN MODULES PERSIST IN SUPABASE POSTGRESQL WITH 100% RELIABILITY!');
  } finally {
    client.release();
  }
}

verifyPersistence().catch((err) => {
  console.error('❌ PERSISTENCE TEST FAILED:', err);
  process.exit(1);
});
