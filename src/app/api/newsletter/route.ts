import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

// In-memory newsletter subscriber store
const subscribers: Set<string> = new Set([
  'guest.vip@sritayigrand.com',
  'kadiri.travel@gmail.com',
]);

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`newsletter:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many subscription attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds || 60) } }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email format.' },
        { status: 400 }
      );
    }

    const alreadySubscribed = subscribers.has(cleanEmail);
    subscribers.add(cleanEmail);

    return NextResponse.json({
      success: true,
      message: alreadySubscribed
        ? 'You are already subscribed to Sri Tayi Grand exclusive offers.'
        : 'Welcome to Sri Tayi Grand VIP Club. Exclusive direct booking rates will be sent to your inbox.',
      email: cleanEmail,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process newsletter subscription.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    totalSubscribers: subscribers.size,
  });
}
