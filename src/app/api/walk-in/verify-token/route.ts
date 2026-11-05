import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

/**
 * Endpoint: GET /api/walk-in/verify-token
 * Validates the reception desk QR token and returns available categories with live clean room counts
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';

    const isValid = repo.verifyKioskToken(token);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: 'Invalid or expired reception kiosk token. Please scan the QR code located at the Sri Tayi Grand reception desk.',
        },
        { status: 403 }
      );
    }

    const categories = repo.getCategories().filter((c) => c.is_active);
    const availableRooms = repo.getAvailableCleanRooms();

    const categoryList = categories.map((cat) => {
      const cleanCount = availableRooms.filter((r) => r.category_id === cat.id).length;
      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        short_description: cat.short_description,
        base_price_per_night: cat.base_price_per_night,
        cover_image_url: cat.cover_image_url,
        amenities: cat.amenities || ['Air Conditioning', 'Free Wi-Fi', '24/7 Geyser', 'Room Service'],
        clean_rooms_available: cleanCount,
        is_available_now: cleanCount > 0,
      };
    });

    return NextResponse.json({
      success: true,
      valid: true,
      kiosk_name: 'Reception Desk Acrylic QR Standee',
      hotel_name: 'Sri Tayi Grand',
      hotel_address: 'Main Road, Kadiri, Andhra Pradesh',
      allow_counter_payment: true,
      available_categories: categoryList,
      total_clean_rooms: availableRooms.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Kiosk token verification error';
    return NextResponse.json({ success: false, valid: false, error: msg }, { status: 500 });
  }
}
