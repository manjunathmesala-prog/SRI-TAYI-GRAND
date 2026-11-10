import { Client } from 'pg';
import {
  INITIAL_EXPENSES,
  INITIAL_HALL_ENQUIRIES,
  INITIAL_MAINTENANCE_TICKETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FOLIO_CHARGES,
  INITIAL_CASH_SHIFTS,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_DAILY_CLOSINGS,
  INITIAL_STAFF_ATTENDANCE,
  INITIAL_CONTACT_ENQUIRIES,
  INITIAL_REVIEWS,
  INITIAL_CONVENTION_QUOTES,
  INITIAL_STAFF,
} from '../src/lib/db/mock-data';

async function seedCloudDb() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to live Supabase DB for seeding...');

  // 1. Expenses
  const expCount = await client.query('SELECT count(*) FROM expenses;');
  if (Number(expCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_EXPENSES.length} expenses...`);
    for (const exp of INITIAL_EXPENSES) {
      await client.query(
        `INSERT INTO expenses (id, category, title, description, amount, payment_method, recorded_by, expense_date, receipt_ref, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING;`,
        [
          exp.id,
          exp.category,
          exp.title,
          exp.description || '',
          exp.amount,
          exp.payment_method || 'cash',
          exp.recorded_by || 'Admin',
          exp.expense_date,
          exp.receipt_ref || null,
          exp.status || 'approved',
          exp.created_at,
        ]
      );
    }
    console.log('✅ Expenses seeded.');
  }

  // 2. Hall Enquiries
  const heCount = await client.query('SELECT count(*) FROM hall_enquiries;');
  if (Number(heCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_HALL_ENQUIRIES.length} hall enquiries...`);
    for (const he of INITIAL_HALL_ENQUIRIES) {
      await client.query(
        `INSERT INTO hall_enquiries (enquiry_reference, name, phone, email, event_type, event_date, expected_guests, requirements, message, status, admin_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (enquiry_reference) DO NOTHING;`,
        [
          (he as any).enquiry_reference || `ENQ-HALL-${he.id}`,
          he.name,
          he.phone,
          he.email || null,
          he.event_type,
          he.event_date,
          he.expected_guests || 100,
          he.requirements || '',
          (he as any).message || '',
          he.status || 'new',
          he.admin_notes || null,
          he.created_at,
        ]
      );
    }
    console.log('✅ Hall enquiries seeded.');
  }

  // 3. Maintenance Tickets
  const maintCount = await client.query('SELECT count(*) FROM room_maintenance;');
  if (Number(maintCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_MAINTENANCE_TICKETS.length} maintenance tickets...`);
    for (const mt of INITIAL_MAINTENANCE_TICKETS) {
      await client.query(
        `INSERT INTO room_maintenance (ticket_id, room_number, issue_description, category, priority, status, start_date, assigned_technician, reported_by, cost, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          mt.id,
          mt.room_number,
          mt.description,
          mt.category,
          mt.priority || 'medium',
          mt.status,
          mt.reported_at ? mt.reported_at.split('T')[0] : new Date().toISOString().split('T')[0],
          mt.assigned_to || null,
          mt.reported_by || 'Staff',
          mt.cost || 0,
          mt.notes || null,
          mt.reported_at || new Date().toISOString(),
        ]
      );
    }
    console.log('✅ Maintenance tickets seeded.');
  }

  // 4. Folio Charges (Additional Charges)
  const fcCount = await client.query('SELECT count(*) FROM additional_charges;');
  if (Number(fcCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_FOLIO_CHARGES.length} folio charges...`);
    for (const fc of INITIAL_FOLIO_CHARGES) {
      await client.query(
        `INSERT INTO additional_charges (charge_id, booking_reference, charge_name, description, category, amount, tax_rate, tax_amount, total_amount, posted_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
        [
          fc.id,
          fc.booking_reference,
          fc.description,
          fc.description,
          fc.category,
          fc.amount,
          fc.tax_rate,
          fc.tax_amount,
          fc.total_amount,
          fc.posted_by,
          fc.created_at,
        ]
      );
    }
    console.log('✅ Folio charges seeded.');
  }

  // 5. Cash Shifts
  const csCount = await client.query('SELECT count(*) FROM cash_shifts;');
  if (Number(csCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_CASH_SHIFTS.length} cash shifts...`);
    for (const cs of INITIAL_CASH_SHIFTS) {
      await client.query(
        `INSERT INTO cash_shifts (id, shift_number, cashier_id, cashier_name, opened_at, closed_at, opening_float, closing_cash_counted, expected_closing_cash, discrepancy, notes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING;`,
        [
          cs.id,
          cs.shift_number,
          cs.cashier_id,
          cs.cashier_name,
          cs.opened_at,
          cs.closed_at || null,
          cs.opening_float,
          cs.closing_cash_counted || null,
          cs.expected_closing_cash || null,
          cs.discrepancy || 0,
          cs.notes || null,
          cs.status,
          cs.opened_at,
        ]
      );
    }
    console.log('✅ Cash shifts seeded.');
  }

  // 6. Cash Transactions
  const ctCount = await client.query('SELECT count(*) FROM cash_transactions;');
  if (Number(ctCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_CASH_TRANSACTIONS.length} cash transactions...`);
    for (const ct of INITIAL_CASH_TRANSACTIONS) {
      await client.query(
        `INSERT INTO cash_transactions (id, shift_id, type, category, amount, reason, booking_reference, receipt_ref, performed_by, performed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING;`,
        [
          ct.id,
          ct.shift_id || null,
          ct.type,
          ct.category,
          ct.amount,
          ct.reason,
          ct.booking_reference || null,
          ct.receipt_ref || null,
          ct.performed_by,
          ct.performed_at,
          ct.performed_at,
        ]
      );
    }
    console.log('✅ Cash transactions seeded.');
  }

  // 7. Daily Closings
  const dcCount = await client.query('SELECT count(*) FROM daily_closings;');
  if (Number(dcCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_DAILY_CLOSINGS.length} daily closings...`);
    for (const dc of INITIAL_DAILY_CLOSINGS) {
      await client.query(
        `INSERT INTO daily_closings (
           id, closing_date, total_revenue, room_revenue, hall_revenue, other_revenue,
           cash_collected, upi_collected, card_collected, online_collected,
           total_expenses, cash_expenses, expected_cash_in_drawer, actual_cash_counted,
           discrepancy, notes, closed_by_name, closed_by_role, status, closed_at, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (closing_date) DO NOTHING;`,
        [
          dc.id,
          dc.closing_date,
          dc.total_revenue,
          dc.room_revenue,
          dc.hall_revenue,
          dc.other_revenue,
          dc.cash_collected,
          dc.upi_collected,
          dc.card_collected,
          dc.online_collected,
          dc.total_expenses,
          dc.cash_expenses,
          dc.expected_cash_in_drawer,
          dc.actual_cash_counted,
          dc.discrepancy,
          dc.notes || null,
          dc.closed_by_name,
          dc.closed_by_role,
          dc.status,
          dc.closed_at,
          dc.created_at,
        ]
      );
    }
    console.log('✅ Daily closings seeded.');
  }

  // 8. Staff Attendance
  const saCount = await client.query('SELECT count(*) FROM staff_attendance;');
  if (Number(saCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_STAFF_ATTENDANCE.length} staff attendance records...`);
    for (const sa of INITIAL_STAFF_ATTENDANCE) {
      await client.query(
        `INSERT INTO staff_attendance (id, staff_id, staff_name, role, date, shift, clock_in, clock_out, status, work_hours, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING;`,
        [
          sa.id,
          sa.staff_id,
          sa.staff_name,
          sa.role,
          sa.date,
          sa.shift,
          sa.clock_in || null,
          sa.clock_out || null,
          sa.status,
          sa.work_hours || 0,
          sa.notes || null,
          sa.created_at,
        ]
      );
    }
    console.log('✅ Staff attendance seeded.');
  }

  // 9. Contact Enquiries
  const ceCount = await client.query('SELECT count(*) FROM contact_enquiries;');
  if (Number(ceCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_CONTACT_ENQUIRIES.length} contact enquiries...`);
    for (const ce of INITIAL_CONTACT_ENQUIRIES) {
      await client.query(
        `INSERT INTO contact_enquiries (id, name, phone, email, subject, message, check_in_date, check_out_date, room_type, adults_count, status, source, admin_notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING;`,
        [
          ce.id,
          ce.name,
          ce.phone,
          ce.email || null,
          ce.subject || null,
          ce.message,
          ce.check_in_date || null,
          ce.check_out_date || null,
          ce.room_type || null,
          ce.adults_count || 1,
          ce.status,
          ce.source,
          ce.admin_notes || null,
          ce.created_at,
        ]
      );
    }
    console.log('✅ Contact enquiries seeded.');
  }

  // 10. Reviews
  const revCount = await client.query('SELECT count(*) FROM reviews;');
  if (Number(revCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_REVIEWS.length} reviews...`);
    for (const rev of INITIAL_REVIEWS) {
      await client.query(
        `INSERT INTO reviews (id, hotel_name, reviewer_name, rating, rating_label, review_date_display, retrieval_date, excerpt, full_text, is_rating_only, is_translated, source_platform, source_url, is_featured, is_published, display_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
         ON CONFLICT (id) DO NOTHING;`,
        [
          rev.id,
          rev.hotel_name || 'SRI TAYI GRAND',
          rev.reviewer_name,
          rev.rating,
          rev.rating_label,
          rev.review_date_display,
          rev.retrieval_date,
          rev.excerpt,
          rev.full_text || null,
          rev.is_rating_only,
          rev.is_translated || false,
          rev.source_platform,
          rev.source_url,
          rev.is_featured,
          rev.is_published,
          rev.display_order,
        ]
      );
    }
    console.log('✅ Reviews seeded.');
  }

  // 11. Convention Quotes
  const cqCount = await client.query('SELECT count(*) FROM convention_quotes;');
  if (Number(cqCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_CONVENTION_QUOTES.length} convention quotes...`);
    for (const cq of INITIAL_CONVENTION_QUOTES) {
      await client.query(
        `INSERT INTO convention_quotes (id, quote_number, client_name, client_phone, client_email, event_name, event_date, seating_layout, guest_count, catering_package, catering_rate_per_plate, hall_rental_charge, av_sound_lighting, stage_decoration, generator_diesel, subtotal, gst_rate, gst_amount, total_amount, status, created_by, created_at, valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         ON CONFLICT (quote_number) DO NOTHING;`,
        [
          cq.id,
          cq.quote_number,
          cq.client_name,
          cq.client_phone,
          cq.client_email || null,
          cq.event_name,
          cq.event_date,
          cq.seating_layout,
          cq.guest_count,
          cq.catering_package,
          cq.catering_rate_per_plate,
          cq.hall_rental_charge,
          cq.av_sound_lighting,
          cq.stage_decoration,
          cq.generator_diesel,
          cq.subtotal,
          cq.gst_rate,
          cq.gst_amount,
          cq.total_amount,
          cq.status,
          cq.created_by,
          cq.created_at,
          cq.valid_until,
        ]
      );
    }
    console.log('✅ Convention quotes seeded.');
  }

  // 12. Audit Logs
  const alCount = await client.query('SELECT count(*) FROM audit_logs;');
  if (Number(alCount.rows[0].count) === 0) {
    console.log(`Seeding ${INITIAL_AUDIT_LOGS.length} audit logs...`);
    for (const al of INITIAL_AUDIT_LOGS) {
      await client.query(
        `INSERT INTO audit_logs (log_id, action, entity_name, entity_id, user_name, user_role, category, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
        [
          al.id,
          al.action,
          al.entityType || 'SYSTEM',
          al.entityId || null,
          al.userName || 'Admin',
          al.userRole || 'admin',
          al.entityType || 'SECURITY',
          al.details || null,
          al.ipAddress || '127.0.0.1',
          al.timestamp || new Date().toISOString(),
        ]
      );
    }
    console.log('✅ Audit logs seeded.');
  }

  // 13. Website Content
  const wcCount = await client.query('SELECT count(*) FROM website_content;');
  if (Number(wcCount.rows[0].count) === 0) {
    console.log('Seeding initial website content...');
    const sections = [
      {
        key: 'hero_banner',
        section: 'home',
        content_value: {
          title: 'Welcome to Sri Tayi Grand',
          subtitle: 'Stay · Host · Celebrate in Kadiri',
          badge: 'Luxury & Tradition at Bypass Road, Kadiri',
        },
      },
      {
        key: 'about_hotel',
        section: 'about',
        content_value: {
          heading: 'Experience Grand Hospitality',
          description: 'Located conveniently opposite Girls High School, Bypass Road, Kadiri. Sri Tayi Grand offers 25 premium rooms, 800-capacity convention hall, and state-of-the-art RFID electronic door lock access.',
        },
      },
      {
        key: 'convention_hall_intro',
        section: 'convention_hall',
        content_value: {
          name: 'Sri Tayi Grand Convention Hall',
          tagline: 'The premier destination for weddings, banquets, and celebrations in Kadiri',
          capacity: '800 Guests',
        },
      },
    ];

    for (const s of sections) {
      await client.query(
        `INSERT INTO website_content (key, section, content_value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE SET content_value = EXCLUDED.content_value;`,
        [s.key, s.section, JSON.stringify(s.content_value)]
      );
    }
    console.log('✅ Website content seeded.');
  }

  console.log('\n--- VERIFYING FINAL ROW COUNTS IN LIVE SUPABASE ---');
  const tables = [
    'expenses',
    'hall_enquiries',
    'room_maintenance',
    'additional_charges',
    'cash_shifts',
    'cash_transactions',
    'daily_closings',
    'staff_attendance',
    'contact_enquiries',
    'reviews',
    'convention_quotes',
    'audit_logs',
    'website_content',
  ];
  for (const t of tables) {
    const res = await client.query(`SELECT count(*) FROM "${t}";`);
    console.log(`  ${t.padEnd(25)} : ${res.rows[0].count} rows`);
  }

  await client.end();
  console.log('\n🎉 ALL LIVE SUPABASE TABLES SEEDED AND VERIFIED!');
}

seedCloudDb().catch(console.error);
