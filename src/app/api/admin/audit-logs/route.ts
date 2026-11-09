import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { AuditActionCategory } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Accounts',
      'Front Desk',
      'Receptionist',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') || searchParams.get('entityType')) as
      | AuditActionCategory
      | undefined;
    const search = searchParams.get('search')?.toLowerCase() || searchParams.get('q')?.toLowerCase() || '';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    let logs = repo.getAuditLogs(category || undefined);

    if (search) {
      logs = logs.filter(
        (log) =>
          log.action.toLowerCase().includes(search) ||
          log.userName.toLowerCase().includes(search) ||
          log.userRole.toLowerCase().includes(search) ||
          log.entityId.toLowerCase().includes(search) ||
          log.details.toLowerCase().includes(search) ||
          log.entityType.toLowerCase().includes(search)
      );
    }

    const total = logs.length;
    const paginatedLogs = logs.slice(0, limit);

    return NextResponse.json({
      success: true,
      logs: paginatedLogs,
      total,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Accounts',
      'Front Desk',
      'Receptionist',
      'Housekeeping',
      'Event Manager',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const {
      action,
      entityType,
      entityId,
      details,
      previousValue,
      newValue,
    } = body;

    if (!action || !entityType || !entityId || !details) {
      return NextResponse.json(
        {
          success: false,
          error: 'action, entityType, entityId, and details are required to record an audit log.',
        },
        { status: 400 }
      );
    }

    // Security fix: Strictly bind audit log identity to verified staff session (prevent identity spoofing)
    const log = repo.recordAuditLog({
      action: String(action),
      entityType: entityType as AuditActionCategory,
      entityId: String(entityId),
      details: String(details),
      userId: auth.session?.userId || 'stf-sys',
      userName: auth.session?.name || 'Authorized Staff',
      userRole: auth.session?.role || 'Staff',
      previousValue,
      newValue,
    });

    return NextResponse.json({
      success: true,
      log,
      message: 'Audit event immutably logged.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
