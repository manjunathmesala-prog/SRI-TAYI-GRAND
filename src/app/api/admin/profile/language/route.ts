import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getSupabasePgPool } from '@/lib/db/supabase-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('stg_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ success: true, preferred_language: 'en' });
    }

    // Try PostgreSQL pool first
    const pool = getSupabasePgPool();
    if (pool) {
      try {
        const res = await pool.query(
          'SELECT preferred_language FROM public.profiles WHERE full_name = $1 OR id::text = $2 LIMIT 1',
          [session.name, session.userId]
        );
        if (res.rows.length > 0 && res.rows[0].preferred_language) {
          return NextResponse.json({
            success: true,
            preferred_language: res.rows[0].preferred_language,
          });
        }
      } catch (dbErr) {
        // Fallback to supabase admin
      }
    }

    const { data } = await supabaseAdmin
      .from('profiles')
      .select('preferred_language')
      .or(`full_name.eq.${session.name},id.eq.${session.userId}`)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      preferred_language: data?.preferred_language || 'en',
    });
  } catch (err: any) {
    return NextResponse.json({ success: true, preferred_language: 'en' });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('stg_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    const session = verifySessionToken(token);

    const body = await req.json();
    const preferred_language = body.preferred_language === 'te' ? 'te' : 'en';

    if (session) {
      const pool = getSupabasePgPool();
      if (pool) {
        try {
          await pool.query(
            `UPDATE public.profiles 
             SET preferred_language = $1, updated_at = NOW() 
             WHERE full_name = $2 OR id::text = $3`,
            [preferred_language, session.name, session.userId]
          );
        } catch {
          // Fallback to Supabase admin
          await supabaseAdmin
            .from('profiles')
            .update({ preferred_language, updated_at: new Date().toISOString() })
            .or(`full_name.eq.${session.name},id.eq.${session.userId}`);
        }
      } else {
        await supabaseAdmin
          .from('profiles')
          .update({ preferred_language, updated_at: new Date().toISOString() })
          .or(`full_name.eq.${session.name},id.eq.${session.userId}`);
      }
    }

    return NextResponse.json({
      success: true,
      preferred_language,
      message: 'Language preference saved successfully',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to save preference' },
      { status: 500 }
    );
  }
}
