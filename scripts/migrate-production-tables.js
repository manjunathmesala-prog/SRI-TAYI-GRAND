const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.wercvaimozbbkbwmuoct',
    password: 'Vaynex@2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to live Supabase DB for production migration...');

  // 1. Create missing tables
  console.log('Creating missing tables if they do not exist...');

  await client.query(`
    -- 1. Expenses Table
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(60) PRIMARY KEY,
      category VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      amount NUMERIC(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      recorded_by VARCHAR(100) NOT NULL DEFAULT 'Admin',
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      receipt_ref VARCHAR(100),
      status VARCHAR(30) DEFAULT 'approved',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Cash Shifts Table
    CREATE TABLE IF NOT EXISTS cash_shifts (
      id VARCHAR(60) PRIMARY KEY,
      shift_number VARCHAR(50) UNIQUE NOT NULL,
      cashier_id VARCHAR(100) NOT NULL,
      cashier_name VARCHAR(150) NOT NULL,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      opening_float NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      closing_cash_counted NUMERIC(10, 2),
      expected_closing_cash NUMERIC(10, 2),
      discrepancy NUMERIC(10, 2) DEFAULT 0.00,
      notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 3. Cash Transactions Table
    CREATE TABLE IF NOT EXISTS cash_transactions (
      id VARCHAR(60) PRIMARY KEY,
      shift_id VARCHAR(60),
      type VARCHAR(20) NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
      category VARCHAR(50) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      reason TEXT NOT NULL,
      booking_reference VARCHAR(50),
      receipt_ref VARCHAR(100),
      performed_by VARCHAR(150) NOT NULL,
      performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. Daily Closings Table
    CREATE TABLE IF NOT EXISTS daily_closings (
      id VARCHAR(60) PRIMARY KEY,
      closing_date DATE UNIQUE NOT NULL,
      total_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      room_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      hall_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      other_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      cash_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      upi_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      card_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      online_collected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      total_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      cash_expenses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      expected_cash_in_drawer NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      actual_cash_counted NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      discrepancy NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      notes TEXT,
      closed_by_name VARCHAR(150) NOT NULL,
      closed_by_role VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'closed',
      closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. Staff Attendance Table
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id VARCHAR(60) PRIMARY KEY,
      staff_id VARCHAR(100) NOT NULL,
      staff_name VARCHAR(150) NOT NULL,
      role VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      shift VARCHAR(50) NOT NULL,
      clock_in TIMESTAMPTZ,
      clock_out TIMESTAMPTZ,
      status VARCHAR(30) NOT NULL DEFAULT 'present',
      work_hours NUMERIC(4, 2) DEFAULT 0.00,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. Contact Enquiries Table
    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id VARCHAR(60) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(25) NOT NULL,
      email VARCHAR(120),
      subject VARCHAR(200),
      message TEXT NOT NULL,
      check_in_date DATE,
      check_out_date DATE,
      room_type VARCHAR(100),
      adults_count INT DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      source VARCHAR(50) NOT NULL DEFAULT 'website_contact',
      admin_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. Reviews Table
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(50) PRIMARY KEY,
      hotel_name VARCHAR(100) NOT NULL DEFAULT 'SRI TAYI GRAND',
      reviewer_name VARCHAR(150) NOT NULL,
      rating INT NOT NULL DEFAULT 5,
      rating_label VARCHAR(50) DEFAULT '5 stars',
      review_date_display VARCHAR(50),
      retrieval_date DATE DEFAULT CURRENT_DATE,
      excerpt TEXT,
      full_text TEXT,
      is_rating_only BOOLEAN DEFAULT FALSE,
      is_translated BOOLEAN DEFAULT FALSE,
      source_platform VARCHAR(50) DEFAULT 'Google',
      source_url TEXT,
      is_featured BOOLEAN DEFAULT TRUE,
      is_published BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 8. Convention Quotes Table
    CREATE TABLE IF NOT EXISTS convention_quotes (
      id VARCHAR(60) PRIMARY KEY,
      quote_number VARCHAR(50) UNIQUE NOT NULL,
      enquiry_id UUID REFERENCES hall_enquiries(id) ON DELETE SET NULL,
      client_name VARCHAR(150) NOT NULL,
      client_phone VARCHAR(25) NOT NULL,
      client_email VARCHAR(120),
      event_name VARCHAR(150) NOT NULL,
      event_date DATE NOT NULL,
      seating_layout VARCHAR(50) NOT NULL,
      guest_count INT NOT NULL DEFAULT 100,
      catering_package VARCHAR(50) NOT NULL,
      catering_rate_per_plate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      hall_rental_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      av_sound_lighting NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      stage_decoration NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      generator_diesel NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      subtotal NUMERIC(10, 2) NOT NULL,
      gst_rate NUMERIC(5, 2) DEFAULT 0.18,
      gst_amount NUMERIC(10, 2) NOT NULL,
      total_amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(30) DEFAULT 'draft',
      created_by VARCHAR(150) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      valid_until DATE NOT NULL
    );
  `);

  console.log('✅ Tables created or verified successfully!');

  await client.end();
}

runMigration().catch(console.error);
