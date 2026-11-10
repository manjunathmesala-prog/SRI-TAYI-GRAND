import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { getRegisteredBridgeTunnelUrl, saveRegisteredBridgeTunnelUrl } from '@/lib/db/supabase-rfid';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const DEFAULT_BRIDGE_URL = process.env.RFID_BRIDGE_URL || 'http://127.0.0.1:8989';

let cachedTunnelUrl: string | null = null;
let lastTunnelFetchTime = 0;
const TUNNEL_CACHE_TTL = 10000; // 10 seconds cache

async function getResolvedTunnelUrl(forceFresh: boolean = false): Promise<string | null> {
  const now = Date.now();
  if (!forceFresh && cachedTunnelUrl && now - lastTunnelFetchTime < TUNNEL_CACHE_TTL) {
    return cachedTunnelUrl;
  }

  try {
    const supabaseUrl = await getRegisteredBridgeTunnelUrl();
    if (supabaseUrl) {
      cachedTunnelUrl = supabaseUrl;
      lastTunnelFetchTime = now;
      return supabaseUrl;
    }
  } catch {}

  try {
    const tunnelFile = path.join(process.cwd(), 'latest_production_tunnel_url.txt');
    if (fs.existsSync(tunnelFile)) {
      const url = fs.readFileSync(tunnelFile, 'utf8').trim().replace(/\/+$/, '');
      if (url.startsWith('https://')) {
        cachedTunnelUrl = url;
        lastTunnelFetchTime = now;
        return url;
      }
    }
  } catch {}

  return cachedTunnelUrl;
}

/**
 * Auto-Spawns the Be-Tech C# Hardware Bridge Service in the background if it is stopped.
 */
let lastAutoSpawnAttempt = 0;

function autoSpawnHardwareBridge(): boolean {
  if (process.platform !== 'win32') return false;
  const now = Date.now();
  if (now - lastAutoSpawnAttempt < 60000) return false; // 60s cooldown
  lastAutoSpawnAttempt = now;

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'rfid-bridge', 'bin', 'SriTayiGrandKeycardBridge.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'SriTayiGrand', 'RFIDBridge', 'SriTayiGrandKeycardBridge.exe'),
    ];

    const exePath = candidatePaths.find((p) => p && fs.existsSync(p));
    if (!exePath) return false;

    const workingDir = path.dirname(exePath);

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
 * Automatically bridges local USB Be-Tech encoder with sritayigrand.com production cloud.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawHost = url.searchParams.get('host') || DEFAULT_BRIDGE_URL;
  const targetHost = rawHost.trim().replace(/\/+$/, '');
  const isLocalHost = targetHost.includes('127.0.0.1') || targetHost.includes('localhost');
  const tunnelUrl = await getResolvedTunnelUrl();

  let isOnline = false;
  let bridgeData: any = null;
  let effectiveHost = targetHost;

  // 1. Attempt connection to targetHost, checking active port file or candidate ports if localhost
  const localCandidates = [targetHost];
  if (isLocalHost) {
    try {
      const portFile = path.join(process.cwd(), 'rfid-bridge', 'bin', 'bridge_active_port.txt');
      if (fs.existsSync(portFile)) {
        const p = fs.readFileSync(portFile, 'utf8').trim();
        if (p) localCandidates.unshift(`http://127.0.0.1:${p}`);
      }
    } catch {}
    if (!localCandidates.includes('http://127.0.0.1:8989')) localCandidates.push('http://127.0.0.1:8989');
    if (!localCandidates.includes('http://127.0.0.1:8990')) localCandidates.push('http://127.0.0.1:8990');
  }

  for (const candHost of Array.from(new Set(localCandidates))) {
    if (isOnline) break;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${candHost}/api/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        bridgeData = await res.json();
        isOnline = (bridgeData.status === 'ok' || bridgeData.isOnline === true) && bridgeData.hardwareConnected !== false;
        effectiveHost = candHost;
      }
    } catch {
      // Direct connection to candidate host failed
    }
  }

  // 2. If targetHost failed and we have an active secure tunnel, check the tunnel
  if (!isOnline && tunnelUrl && tunnelUrl !== targetHost) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${tunnelUrl}/api/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        bridgeData = await res.json();
        isOnline = (bridgeData.status === 'ok' || bridgeData.isOnline === true) && bridgeData.hardwareConnected !== false;
        effectiveHost = tunnelUrl;
      } else {
        cachedTunnelUrl = null;
      }
    } catch {
      cachedTunnelUrl = null;
    }
  }

  // 3. Only attempt auto-spawn if bridge service is completely dead (unresponsive) and on local Windows machine
  const bridgeServiceResponding = bridgeData !== null;
  if (!bridgeServiceResponding && isLocalHost && process.platform === 'win32') {
    const spawned = autoSpawnHardwareBridge();
    if (spawned) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${targetHost}/api/status`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          bridgeData = await res.json();
          isOnline = (bridgeData.status === 'ok' || bridgeData.isOnline === true) && bridgeData.hardwareConnected !== false;
        }
      } catch {}
    }
  }

  if (isOnline && bridgeData) {
    return NextResponse.json({
      isOnline: true,
      mode: 'hardware',
      service: bridgeData.service || 'Be-Tech BIS 5.7 Hardware Bridge (Production)',
      port: bridgeData.port || 1,
      readerType: bridgeData.readerType || 4,
      host: effectiveHost,
      tunnelUrl: tunnelUrl || effectiveHost,
      devicesCount: repo.getRFIDDevices().length,
    });
  }

  // Fallback diagnostic status
  return NextResponse.json({
    isOnline: false,
    mode: 'hardware',
    service: 'Be-Tech BIS 5.7 USB RFID Encoder',
    port: 1,
    readerType: 4,
    host: targetHost,
    tunnelUrl: tunnelUrl || undefined,
    devicesCount: repo.getRFIDDevices().length,
    error: bridgeData?.error || 'Be-Tech USB RFID reader is not detected on USB Port 1. Ensure the USB cable is firmly plugged into this computer and click Recheck Connection.',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Support registering dynamic tunnel URL from front-desk PC
    if (body.action === 'register_tunnel' && body.tunnelUrl) {
      const cleanUrl = String(body.tunnelUrl).trim().replace(/\/+$/, '');
      cachedTunnelUrl = cleanUrl;
      lastTunnelFetchTime = Date.now();
      try {
        fs.writeFileSync(path.join(process.cwd(), 'latest_production_tunnel_url.txt'), cleanUrl, 'utf8');
      } catch {}
      try {
        await saveRegisteredBridgeTunnelUrl(cleanUrl);
      } catch {}
      return NextResponse.json({
        success: true,
        message: 'Production hardware tunnel registered successfully',
        tunnelUrl: cleanUrl,
      });
    }

    const { endpoint, payload, staffUser = 'Front Desk' } = body;
    const rawHost = body.targetHost || DEFAULT_BRIDGE_URL;
    let targetHost = rawHost.trim().replace(/\/+$/, '');
    const isLocalHost = targetHost.includes('127.0.0.1') || targetHost.includes('localhost');
    const tunnelUrl = await getResolvedTunnelUrl();

    if (isLocalHost && process.platform === 'win32') {
      try {
        const portFile = path.join(process.cwd(), 'rfid-bridge', 'bin', 'bridge_active_port.txt');
        if (fs.existsSync(portFile)) {
          const p = fs.readFileSync(portFile, 'utf8').trim();
          if (p) targetHost = `http://127.0.0.1:${p}`;
        }
      } catch {}
    }

    // If targetHost is localhost/127.0.0.1 and tunnel is available, prioritize tunnel on cloud server
    if (isLocalHost && tunnelUrl && (process.env.NODE_ENV === 'production' || process.platform !== 'win32')) {
      targetHost = tunnelUrl;
    }

    const targetEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const executeHardwareCommand = async (hostUrl: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(`${hostUrl}${targetEndpoint}`, {
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

    // Attempt hardware command on targetHost
    try {
      let res = await executeHardwareCommand(targetHost);

      // If local failed and tunnel is available, retry on tunnel
      if (!res.ok && tunnelUrl && targetHost !== tunnelUrl) {
        try {
          res = await executeHardwareCommand(tunnelUrl);
        } catch {}
      }

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
      // If direct call threw and tunnel is available, try tunnel
      if (tunnelUrl && targetHost !== tunnelUrl) {
        try {
          const tunnelRes = await executeHardwareCommand(tunnelUrl);
          if (tunnelRes.ok) {
            const hardwareResult = await tunnelRes.json();
            return NextResponse.json({ ...hardwareResult, source: 'hardware' });
          }
        } catch {}
      }

      const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Connection failed';
      return NextResponse.json(
        {
          success: false,
          error: `Hardware encoder bridge unreachable (${errMsg}). Ensure the Be-Tech USB cable is plugged into this computer and click Recheck RFID Connection.`,
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
