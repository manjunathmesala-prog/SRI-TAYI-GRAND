const { Client } = require('pg');

const connectionString = 'postgresql://postgres.wercvaimozbbkbwmuoct:Vaynex%402026@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function reconcileAll() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Link all payments to their booking_id
    const linkRes = await client.query(`
      UPDATE payments p
      SET booking_id = b.id
      FROM bookings b
      WHERE (p.booking_id IS NULL OR p.booking_id != b.id)
        AND p.booking_reference = b.booking_reference
      RETURNING p.id, p.payment_reference, b.booking_reference;
    `);
    console.log(`Linked ${linkRes.rows.length} payments to bookings:`, linkRes.rows);

    // Reconcile paid_amount and payment_status on all bookings
    const reconcileRes = await client.query(`
      UPDATE bookings b
      SET paid_amount = sub.sum_paid,
          payment_status = CASE
            WHEN sub.sum_paid >= b.total_amount AND b.total_amount > 0 THEN 'successful'
            WHEN sub.sum_paid > 0 THEN 'partial'
            ELSE b.payment_status
          END,
          updated_at = NOW()
      FROM (
        SELECT 
          b2.id as b_id,
          COALESCE(SUM(p.amount), 0) as sum_paid
        FROM bookings b2
        LEFT JOIN payments p ON (p.booking_id = b2.id OR p.booking_reference = b2.booking_reference) AND (p.status = 'successful' OR p.status IS NULL)
        GROUP BY b2.id
      ) sub
      WHERE b.id = sub.b_id AND b.paid_amount != sub.sum_paid AND b.paid_amount > 0
      RETURNING b.booking_reference, b.total_amount, b.paid_amount;
    `);
    console.log(`Reconciled ${reconcileRes.rows.length} bookings with mismatched paid_amount:`, reconcileRes.rows);

    await client.query('COMMIT');
    console.log('✅ All legacy records reconciled successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during reconciliation:', err);
  } finally {
    await client.end();
  }
}

reconcileAll();
