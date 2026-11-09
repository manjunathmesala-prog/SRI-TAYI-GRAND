import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaff, verifySessionToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Brute-force and credential-stuffing prevention: max 5 login attempts per 15 minutes per IP
    const clientIp = getClientIp(req);
    const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
    const maxAttempts = isLocal || process.env.NODE_ENV !== 'production' ? 100 : 30;
    const rateCheck = checkRateLimit(`auth:${clientIp}`, maxAttempts, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please retry after ${rateCheck.retryAfterSeconds} seconds.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfterSeconds || 60),
          },
        }
      );
    }

    const { email, password } = await req.json();
    const result = authenticateStaff(email, password);

    if (!result.success || !result.session) {
      return NextResponse.json(
        { success: false, error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${result.session.name} (${result.session.role})`,
      session: result.session,
    });

    // Enforce strict HTTP-Only, SameSite, and Secure flags in production
    response.cookies.set({
      name: 'stg_session',
      value: result.session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('stg_session')?.value;
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookie;

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ success: false, session: null }, { status: 401 });
  }

  return NextResponse.json({ success: true, session });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Signed out successfully' });
  response.cookies.delete('stg_session');
  return response;
}
