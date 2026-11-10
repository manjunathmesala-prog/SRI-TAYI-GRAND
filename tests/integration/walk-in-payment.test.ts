import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { POST as walkInBookRoute } from '@/app/api/walk-in/book/route';
import { POST as verifyRoute } from '@/app/api/bookings/verify/route';
import { GET as pickupStatusRoute } from '@/app/api/walk-in/pickup-status/route';
import { repo } from '@/lib/db/repository';

describe('Walk-In Booking & Payment Flow', () => {
  const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '4PqLtkwDSubGyKJXKmJN9Xfd';

  it('handles cash / counter payment booking', async () => {
    const categories = repo.getCategories();
    const cat = categories[0];

    const req = new Request('http://localhost:3000/api/walk-in/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'STG_RECEPT_DESK_SEC_7749',
        categoryId: cat.id,
        guestName: 'Ramesh Kumar',
        guestPhone: '9849012345',
        idProofType: 'Aadhaar Card',
        idProofNumber: '548219283847',
        paymentMethod: 'cash',
        numNights: 1,
      }),
    });

    const res = await walkInBookRoute(req);
    const data = await res.json();
    if (res.status !== 200) console.error("Error from walkInBookRoute (cash):", res.status, data);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.bookingReference).toBeDefined();
    expect(data.pickupCode).toBeDefined();
    expect(data.paymentMethod).toBe('cash');
  });

  it('handles online payment walk-in booking and generates Razorpay order', async () => {
    const categories = repo.getCategories();
    const cat = categories[0];

    const req = new Request('http://localhost:3000/api/walk-in/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'STG_RECEPT_DESK_SEC_7749',
        categoryId: cat.id,
        guestName: 'Suresh Raina',
        guestPhone: '9849012346',
        idProofType: 'Aadhaar Card',
        idProofNumber: '548219283848',
        paymentMethod: 'online',
        numNights: 1,
      }),
    });

    const res = await walkInBookRoute(req);
    const data = await res.json();
    if (res.status !== 200) console.error("Error from walkInBookRoute (online):", res.status, data);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.bookingReference).toBeDefined();
    expect(data.pickupCode).toBeDefined();
    expect(data.razorpayOrder).toBeDefined();
    expect(data.razorpayOrder?.id).toBeDefined();

    // Now test payment verification
    const orderId = data.razorpayOrder.id;
    const paymentId = 'pay_test_walkin_' + Date.now();
    const signature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verifyReq = new Request('http://localhost:3000/api/bookings/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingReference: data.bookingReference,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      }),
    });

    const verifyRes = await verifyRoute(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.success).toBe(true);

    // Verify pickup status reflects paid
    const pickupReq = new Request(`http://localhost:3000/api/walk-in/pickup-status?code=${data.pickupCode}&ref=${data.bookingReference}`);
    const pickupRes = await pickupStatusRoute(pickupReq);
    expect(pickupRes.status).toBe(200);
    const pickupData = await pickupRes.json();
    expect(pickupData.paymentStatus).toBe('paid');
  });
});
