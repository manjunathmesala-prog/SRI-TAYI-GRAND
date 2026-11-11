import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/admin/bookings/route';
import { repo } from '../src/lib/db/repository';
import { signSessionPayload } from '../src/lib/auth';

describe('Booking HTTP conflict regression with isolated persistence', () => {
  it('does not retain a rejected overlapping request', async () => {
    const marker = `QA conflict ${Date.now()}`;
    const token = signSessionPayload({ userId: 'qa', email: 'qa@example.invalid', role: 'Super Admin', exp: Date.now() + 60000 });
    const body = {
      guest_name: marker, guest_phone: '0000000000', category_id: 'cat-double-03',
      assigned_room_id: 'rm-101', assigned_room_number: '101',
      check_in_date: '2032-01-20', check_out_date: '2032-01-21', rooms_count: 1,
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
