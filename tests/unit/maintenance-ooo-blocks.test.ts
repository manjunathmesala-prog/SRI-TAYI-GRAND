import { describe, it, expect } from 'vitest';
import { repo } from '@/lib/db/repository';

describe('Property Maintenance & Out-of-Order (OOO) Blocks', () => {
  it('creates maintenance work order and automatically locks physical room to Out-of-Order (maintenance)', () => {
    // Pick Room 105 for a clean maintenance test
    const roomBefore = repo.getRooms().find((r) => r.room_number === '105');
    expect(roomBefore).toBeDefined();

    const ticket = repo.createMaintenanceTicket(
      {
        room_number: '105',
        issue_title: 'Split AC Compressor Capacitor Failure',
        description: 'AC blowing warm air, outdoor fan motor humming loudly.',
        category: 'ac_climate',
        priority: 'high',
        assigned_to: 'Srinivasulu M (HVAC Lead)',
        estimated_cost: 1500,
        room_blocked: true,
        reported_by: 'M. Anjaneyulu (Housekeeper)',
      },
      'Front Desk Manager'
    );

    expect(ticket).toBeDefined();
    expect(ticket.id).toMatch(/^maint-/);
    expect(ticket.status).toBe('reported');
    expect(ticket.room_blocked).toBe(true);
    expect(ticket.estimated_cost).toBe(1500);

    // Verify Room 105 is now Out-of-Order (operational_status = 'maintenance')
    const roomAfterLock = repo.getRooms().find((r) => r.room_number === '105');
    expect(roomAfterLock?.operational_status).toBe('maintenance');
  });

  it('updates ticket status to in_progress with technician assignment', () => {
    const ticket = repo.getMaintenanceTickets().find((t) => t.room_number === '105');
    expect(ticket).toBeDefined();

    const updated = repo.updateMaintenanceTicket(
      ticket!.id,
      {
        status: 'in_progress',
        assigned_to: 'External Daikin Service Tech',
      },
      'Hotel Manager'
    );

    expect(updated.status).toBe('in_progress');
    expect(updated.assigned_to).toBe('External Daikin Service Tech');

    // Room should remain blocked under maintenance
    const room = repo.getRooms().find((r) => r.room_number === '105');
    expect(room?.operational_status).toBe('maintenance');
  });

  it('resolves work order, records actual cost, and automatically transitions room to Housekeeping Cleaning (Dirty)', () => {
    const ticket = repo.getMaintenanceTickets().find((t) => t.room_number === '105');
    expect(ticket).toBeDefined();

    const resolved = repo.updateMaintenanceTicket(
      ticket!.id,
      {
        status: 'resolved',
        actual_cost: 1350,
        resolution_notes: 'Replaced 45mfd dual-run capacitor, coil pressure checked at 65 PSI. Airflow chilled to 20°C.',
        room_blocked: false,
      },
      'Hotel Manager'
    );

    expect(resolved.status).toBe('resolved');
    expect(resolved.actual_cost).toBe(1350);
    expect(resolved.room_blocked).toBe(false);
    expect(resolved.resolved_at).toBeDefined();

    // Verify room automatically transferred to Housekeeping:
    // operational_status: 'cleaning', housekeeping_status: 'dirty'
    const roomAfterResolve = repo.getRooms().find((r) => r.room_number === '105');
    expect(roomAfterResolve?.operational_status).toBe('cleaning');
    expect(roomAfterResolve?.housekeeping_status).toBe('dirty');
  });

  it('allows deleting a ticket and cleans up room lock', () => {
    // Create temporary ticket for Room 108
    const tempTicket = repo.createMaintenanceTicket(
      {
        room_number: '108',
        issue_title: 'Bathroom door latch stiff',
        description: 'Lubrication required',
        category: 'furniture_linen',
        priority: 'low',
        room_blocked: true,
        estimated_cost: 0,
        reported_by: 'Staff',
      },
      'Staff'
    );

    const room = repo.getRooms().find((r) => r.room_number === '108');
    expect(room?.operational_status).toBe('maintenance');

    // Delete ticket
    const deleted = repo.deleteMaintenanceTicket(tempTicket.id, 'Staff');
    expect(deleted).toBe(true);

    const roomAfterDelete = repo.getRooms().find((r) => r.room_number === '108');
    expect(roomAfterDelete?.operational_status).toBe('available');
  });
});
