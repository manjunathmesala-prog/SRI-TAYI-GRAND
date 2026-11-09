import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { sendNotification } from '@/lib/notifications';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`contact:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many submissions. Please wait ${rateCheck.retryAfterSeconds} seconds before sending another message.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 60) } }
      );
    }

    const body = await req.json();
    const { name, phone, email, subject, message } = body;

    if (!name || !phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Name, phone number, and message are required.' },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid phone number.' },
        { status: 400 }
      );
    }

    const enquiry = repo.createContactEnquiry({
      name: String(name).trim(),
      phone: cleanPhone,
      email: email ? String(email).trim().toLowerCase() : undefined,
      subject: subject ? String(subject).trim() : 'General Inquiry',
      message: String(message).trim(),
      source: 'website_contact',
    });

    // Notify front desk & management
    try {
      await sendNotification({
        recipient: 'contact@sritayigrand.com',
        type: 'email',
        template: 'convention_hall_enquiry_received',
        data: {
          reference: enquiry.id,
          name: enquiry.name,
          date: new Date().toLocaleDateString('en-IN'),
          type: enquiry.subject || 'Website Guest Message',
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      enquiry,
      message: 'Thank you for contacting Sri Tayi Grand. Front desk reception will connect with you shortly.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit enquiry.' },
      { status: 500 }
    );
  }
}
