import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

const DEFAULT_BRIDGE_URL = process.env.RFID_BRIDGE_URL || 'http://127.0.0.1:8989';

/**
 * Universal Production RFID Hardware Bridge Gateway
 * Proxies requests directly to the Be-Tech BIS 5.7 hardware bridge daemon.
 * Real production mode: No mock safe fallbacks.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetHost = url.searchParams.get('host') || DEFAULT_BRIDGE_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${targetHost}/api/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        isOnline: data.status === 'ok',
        mode: 'hardware',
        service: data.service || 'Be-Tech BIS 5.7 Hardware Bridge (Production)',
        port: data.port || 1,
        readerType: data.readerType || 4,
        host: targetHost,
        devicesCount: repo.getRFIDDevices().length,
      });
    }
  } catch {
    // Hardware bridge not directly reachable
  }

  // Production response when hardware bridge is offline
  return NextResponse.json({
    isOnline: false,
    mode: 'hardware',
    service: 'Be-Tech BIS 5.7 USB RFID Encoder',
    port: 1,
    readerType: 4,
    host: targetHost,
    devicesCount: repo.getRFIDDevices().length,
    error: 'Hardware encoder bridge is offline. Please run RFID Setup on the computer connected to the USB reader.',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, payload, staffUser = 'Front Desk' } = body;
    const targetHost = body.targetHost || DEFAULT_BRIDGE_URL;

    // Send command directly to the physical Be-Tech hardware bridge
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const targetEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const res = await fetch(`${targetHost}${targetEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Staff-User': staffUser,
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const hardwareResult = await res.json();
        return NextResponse.json({ ...hardwareResult, source: 'hardware' });
      } else {
        const errData = await res.json().catch(() => null);
        return NextResponse.json(
          {
            success: false,
            error: errData?.error || `Hardware error (HTTP ${res.status})`,
            source: 'hardware',
          },
          { status: res.status }
        );
      }
    } catch (fetchErr: unknown) {
      const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Connection failed';
      return NextResponse.json(
        {
          success: false,
          error: `Hardware encoder bridge unreachable at ${targetHost} (${errMsg}). Please check USB reader cable and ensure the RFID service is running.`,
          source: 'hardware',
        },
        { status: 503 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bridge proxy error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
