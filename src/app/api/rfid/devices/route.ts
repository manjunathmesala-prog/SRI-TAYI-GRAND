import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export async function GET() {
  try {
    const devices = repo.getRFIDDevices();
    return NextResponse.json({ success: true, devices });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get devices';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, deviceId, status } = body;

    if (action === 'activate_all') {
      const devices = repo.activateAllRFIDDevices();
      repo.logRFIDEvent({
        card_uid: 'SYS-SYNC-ALL',
        device_name: 'Central-RFID-IoT-Gateway',
        room_number: 'ALL',
        event_type: 'access_granted',
        source: 'gateway',
        reason: 'Master activation: all 18 room door locks and encoder stations activated and synchronized online',
      });
      return NextResponse.json({ success: true, message: 'All devices activated', devices });
    }

    if (action === 'update_status' && deviceId && status) {
      const updated = repo.updateRFIDDeviceStatus(deviceId, status);
      return NextResponse.json({ success: true, device: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Device action error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
