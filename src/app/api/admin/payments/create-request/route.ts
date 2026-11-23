import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { getRazorpayClient, inrToPaise } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const bookingReference = body.bookingReference || body.bookingRef;
    const amount = Number(body.amount);
    const description = body.description || 'Hotel Booking Payment Request';

    if (!bookingReference || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'bookingReference and valid positive amount are required.' },
        { status: 400 }
      );
    }

    const booking = repo.getBookingByReference(bookingReference);
    let realLinkUrl = '';
    let rzpLinkId = '';

    try {
      const razorpay = getRazorpayClient();
      const rzpLink = await razorpay.paymentLink.create({
        amount: inrToPaise(amount),
        currency: 'INR',
        accept_partial: false,
        description: description || `Sri Tayi Grand Payment - Booking ${bookingReference}`,
        customer: {
          name: booking?.guest_name || body.guestName || 'Guest',
          contact: (booking?.guest_phone || body.guestPhone || '').replace(/\D/g, '').slice(-10) || undefined,
          email: booking?.guest_email || body.guestEmail || undefined,
        },
        notify: {
          sms: Boolean(booking?.guest_phone || body.guestPhone),
          email: Boolean(booking?.guest_email || body.guestEmail),
        },
        reminder_enable: true,
        notes: {
          booking_reference: bookingReference,
          hotel: 'SRI TAYI GRAND',
        },
      });

      if (rzpLink && rzpLink.short_url) {
        realLinkUrl = rzpLink.short_url;
        rzpLinkId = rzpLink.id;
      }
    } catch (rzpErr) {
      console.warn('[ADMIN PAYMENT LINK] Razorpay Link API note:', rzpErr);
    }

    const result = repo.createPaymentLink(
      bookingReference,
      amount,
      description,
      realLinkUrl || undefined,
      rzpLinkId || undefined
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
