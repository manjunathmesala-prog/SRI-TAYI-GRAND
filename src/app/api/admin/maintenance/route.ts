import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '@/types';
import { syncMaintenanceTicketToSupabase } from '@/lib/db/supabase-sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Housekeeping', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureMaintenanceLoaded();

    const tickets = repo.getMaintenanceTickets();
    const rooms = repo.getRooms();

    const activeCount = tickets.filter((t) => t.status === 'reported' || t.status === 'in_progress').length;
    const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'resolved').length;
    const blockedCount = tickets.filter((t) => t.room_blocked && t.status !== 'resolved').length;
    const totalCost = tickets.reduce((sum, t) => sum + (t.actual_cost || t.estimated_cost || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalTickets: tickets.length,
        activeCount,
        urgentCount,
        blockedCount,
        totalCost,
      },
      tickets,
      rooms: rooms.map((r) => ({
        room_number: r.room_number,
        operational_status: r.operational_status,
        housekeeping_status: r.housekeeping_status,
        category_name: r.category_name,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureMaintenanceLoaded();

    const body = await req.json();
    const { room_number, issue_title, description, category, priority, assigned_to, estimated_cost, room_blocked } =
      body;

    if (!room_number || typeof issue_title !== 'string' || !issue_title.trim() ||
        !repo.getRooms().some(room => room.room_number === String(room_number)) ||
        (estimated_cost !== undefined && (!Number.isFinite(Number(estimated_cost)) || Number(estimated_cost) < 0))) {
      return NextResponse.json(
        { success: false, error: 'An existing room, non-empty issue title, and valid non-negative cost are required.' },
        { status: 400 }
      );
    }

    const staffName = auth.session?.name || body.reported_by || 'Staff Member';

    const ticket = repo.createMaintenanceTicket(
      {
        room_number: String(room_number),
        issue_title: String(issue_title).trim(),
        description: description || '',
        category: (category as MaintenanceCategory) || 'other',
        priority: (priority as MaintenancePriority) || 'normal',
        assigned_to: assigned_to || undefined,
        estimated_cost: Number(estimated_cost) || 0,
        room_blocked: Boolean(room_blocked),
        reported_by: staffName,
      },
      staffName
    );
    await syncMaintenanceTicketToSupabase(ticket);

    return NextResponse.json({
      success: true,
      message: `Maintenance work order #${ticket.id} created for Room ${ticket.room_number}.`,
      ticket,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureMaintenanceLoaded();

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, error: 'id and updates object are required.' }, { status: 400 });
    }

    const staffName = auth.session?.name || 'Staff Member';
    const updated = repo.updateMaintenanceTicket(id, updates, staffName);

    return NextResponse.json({
      success: true,
      message: `Work order #${id} updated successfully.`,
      ticket: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ticket id.' }, { status: 400 });
    }

    await repo.ensureMaintenanceLoaded();

    const staffName = auth.session?.name || 'Admin';
    const deleted = repo.deleteMaintenanceTicket(id, staffName);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Ticket not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Maintenance ticket #${id} deleted.`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
