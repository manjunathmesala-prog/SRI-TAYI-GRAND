import { describe, it, expect, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/admin/bookings/route';
import { repo } from '../src/lib/db/repository';
import { signSessionPayload } from '../src/lib/auth';
import { getSupabasePgPool } from '../src/lib/db/supabase-sync';

describe('Booking HTTP conflict regression with isolated persistence', () => {
  const marker = `QA conflict ${Date.now()}`;
  const nowSec = Math.floor(Date.now() / 1000);
  const day = 1 + (nowSec % 20);
  const check_in_date = `2032-05-${String(day).padStart(2, '0')}`;
  const check_out_date = `2032-05-${String(day + 1).padStart(2, '0')}`;

  afterAll(async () => {
    try {
      const pool = getSupabasePgPool();
      if (pool) {
        await pool.query('DELETE FROM bookings WHERE check_in_date = $1', [check_in_date]);
      }
    } catch {}
  });

  it('does not retain a rejected overlapping request', async () => {
    const token = signSessionPayload({ userId: 'qa', email: 'qa@example.invalid', role: 'Super Admin', exp: Date.now() + 60000 });
    const body = {
      guest_name: marker, guest_phone: '0000000000', category_id: 'cat-double-03',
      assigned_room_id: 'rm-101', assigned_room_number: '101',
      check_in_date, check_out_date, rooms_count: 1,
      status: 'confirmed', total_amount: 100, paid_amount: 0,
    };
    const request = () => new NextRequest('http://localhost/api/admin/bookings', {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    const responses = await Promise.all([POST(request()), POST(request())]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    expect(repo.getBookings().filter(b => b.guest_name === marker)).toHaveLength(1);
  });
});
