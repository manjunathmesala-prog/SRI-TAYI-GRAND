import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const DEFAULT_BRIDGE_URL = process.env.RFID_BRIDGE_URL || 'http://127.0.0.1:8989';

/**
 * Auto-Spawns the Be-Tech C# Hardware Bridge Service in the background if it is stopped.
 * This ensures the front desk reception never needs to manually run any batch or installer file.
 */
function autoSpawnHardwareBridge(): boolean {
  if (process.platform !== 'win32') return false;

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'rfid-bridge', 'bin', 'SriTayiGrandKeycardBridge.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'SriTayiGrand', 'RFIDBridge', 'SriTayiGrandKeycardBridge.exe'),
    ];

    const exePath = candidatePaths.find((p) => p && fs.existsSync(p));
    if (!exePath) return false;

    const workingDir = path.dirname(exePath);

    // Spawn detached and hidden in the background
    const child = spawn(exePath, [], {
      cwd: workingDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    return true;
  } catch (err) {
    console.warn('[RFID Auto-Spawn] Failed to auto-launch bridge executable:', err);
    return false;
  }
}

/**
 * Universal Production RFID Hardware Bridge Gateway
 * Proxies requests directly to the Be-Tech BIS 5.7 hardware bridge daemon.
 * Features automated self-healing and background startup on Windows reception terminals.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawHost = url.searchParams.get('host') || DEFAULT_BRIDGE_URL;
  const targetHost = rawHost.trim().replace(/\/+$/, '');
  const isLocalHost = targetHost.includes('127.0.0.1') || targetHost.includes('localhost');

  // Attempt 1: Check if bridge is currently reachable
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

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
    // Initial connection failed
  }

  // Attempt 2: If on local Windows machine, auto-recover by launching the bridge
  if (isLocalHost && process.platform === 'win32') {
    const spawned = autoSpawnHardwareBridge();
    if (spawned) {
      // Give bridge 1000ms to bind to port 8989
      await new Promise((r) => setTimeout(r, 1000));

      try {
        const controller2 = new AbortController();
        const timeout2 = setTimeout(() => controller2.abort(), 1500);

        const res2 = await fetch(`${targetHost}/api/status`, {
          method: 'GET',
          signal: controller2.signal,
        });
        clearTimeout(timeout2);

        if (res2.ok) {
          const data2 = await res2.json();
          return NextResponse.json({
            isOnline: data2.status === 'ok',
            mode: 'hardware',
            service: data2.service || 'Be-Tech BIS 5.7 Hardware Bridge (Auto-Recovered)',
            port: data2.port || 1,
            readerType: data2.readerType || 4,
            host: targetHost,
            devicesCount: repo.getRFIDDevices().length,
          });
        }
      } catch {
        // Still initializing or reader not plugged in
      }
    }
  }

  // Clean diagnostic status when hardware encoder is disconnected
  return NextResponse.json({
    isOnline: false,
    mode: 'hardware',
    service: 'Be-Tech BIS 5.7 USB RFID Encoder',
    port: 1,
    readerType: 4,
    host: targetHost,
    devicesCount: repo.getRFIDDevices().length,
    error: 'Be-Tech USB RFID reader is not detected or bridge is initializing. Ensure the USB cable is firmly plugged in and click Recheck Connection.',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, payload, staffUser = 'Front Desk' } = body;
    const rawHost = body.targetHost || DEFAULT_BRIDGE_URL;
    const targetHost = rawHost.trim().replace(/\/+$/, '');
    const isLocalHost = targetHost.includes('127.0.0.1') || targetHost.includes('localhost');

    const targetEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const executeHardwareCommand = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

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
      return res;
    };

    // Send command directly to the physical Be-Tech hardware bridge
    try {
      const res = await executeHardwareCommand();

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
      // If offline on Windows host, attempt auto-spawn and retry once
      if (isLocalHost && process.platform === 'win32') {
        const spawned = autoSpawnHardwareBridge();
        if (spawned) {
          await new Promise((r) => setTimeout(r, 1200));
          try {
            const retryRes = await executeHardwareCommand();
            if (retryRes.ok) {
              const hardwareResult = await retryRes.json();
              return NextResponse.json({ ...hardwareResult, source: 'hardware' });
            }
          } catch {}
        }
      }

      const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Connection failed';
      return NextResponse.json(
        {
          success: false,
          error: `Hardware encoder bridge unreachable at ${targetHost} (${errMsg}). Ensure the Be-Tech USB cable is plugged into this computer and click Recheck RFID Connection.`,
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
