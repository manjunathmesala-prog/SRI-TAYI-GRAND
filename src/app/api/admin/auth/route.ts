import { NextRequest, NextResponse } from 'next/server';
import { authenticateStaff, verifySessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const result = authenticateStaff(email, password);

    if (!result.success || !result.session) {
      return NextResponse.json({ success: false, error: result.error || 'Authentication failed' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      message: `Welcome back, ${result.session.name} (${result.session.role})`,
      session: result.session,
    });

    // Set HTTP-only secure cookie for browser sessions
    response.cookies.set({
      name: 'stg_session',
      value: result.session.token,
      httpOnly: false, // Accessible to client app if needed
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
