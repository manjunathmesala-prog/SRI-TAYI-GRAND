import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'exe';

    const filename = format === 'zip' ? 'SriTayiGrand_RFID_Setup.zip' : 'SriTayiGrand_RFID_Setup.exe';
    const filePath = path.join(process.cwd(), 'public', 'downloads', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Setup installer package not found on server.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);
    const contentType =
      format === 'zip'
        ? 'application/zip'
        : 'application/vnd.microsoft.portable-executable';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
