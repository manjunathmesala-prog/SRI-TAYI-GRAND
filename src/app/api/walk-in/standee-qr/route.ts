import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

/**
 * Endpoint: GET /api/walk-in/standee-qr
 * Generates high-resolution, offline-capable QR codes for the reception acrylic standee
 * Supports direct PNG download, SVG rendering, and base64 DataURL JSON responses
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || 'STG_RECEPT_DESK_SEC_7749';
    const host = searchParams.get('host') || '';
    const download = searchParams.get('download') === 'true';
    const format = searchParams.get('format') || (download ? 'png' : 'json');

    // Default target URL
    let targetUrl = searchParams.get('targetUrl');
    if (!targetUrl) {
      if (host) {
        targetUrl = `${host.replace(/\/$/, '')}/walk-in?token=${encodeURIComponent(token)}`;
      } else {
        targetUrl = `http://192.168.1.20:3000/walk-in?token=${encodeURIComponent(token)}`;
      }
    }

    if (format === 'png' || download) {
      const pngBuffer = await QRCode.toBuffer(targetUrl, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#241912',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': 'attachment; filename="sri_tayi_grand_reception_qr.png"',
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#241912',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      });

      return new NextResponse(svgString, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': download ? 'attachment; filename="sri_tayi_grand_reception_qr.svg"' : 'inline',
        },
      });
    }

    // Default: JSON with DataURL
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#241912',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      success: true,
      dataUrl,
      targetUrl,
      token,
      downloadUrl: `/api/walk-in/standee-qr?targetUrl=${encodeURIComponent(targetUrl)}&download=true`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'QR generation error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
