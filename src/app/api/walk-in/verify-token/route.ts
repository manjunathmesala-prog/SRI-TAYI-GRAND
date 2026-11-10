import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

/**
 * Endpoint: GET /api/walk-in/verify-token
 * Validates the reception desk QR token and returns available categories with live clean room counts,
 * gallery photos, and Wi-Fi credentials.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || searchParams.get('kiosk_token') || '';

    const isValid =
      token === 'STG_RECEPT_DESK_SEC_7749' ||
      token === 'ANANTHA_RECEPT_DESK_SEC_7749' ||
      repo.verifyKioskToken(token);

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
      const cleanCount = availableRooms.filter(
        (r) => r.category_id === cat.id || r.category_id === cat.slug
      ).length;

      const gallery =
        cat.gallery_images && cat.gallery_images.length > 0
          ? cat.gallery_images
          : [
              cat.cover_image_url || '/images/hotel/room-double-bed-photo-enhanced.png',
              '/images/hotel/room-twin-render-enhanced.png',
              '/images/hotel/room-corner-photo-enhanced.png',
              '/images/hotel/room-headboard-detail-photo-enhanced.png',
            ];

      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        short_description: cat.short_description,
        base_price_per_night: cat.base_price_per_night,
        tax_percentage: 5,
        bed_type: cat.bed_type || 'King Bed / Twin Beds',
        cover_image_url: cat.cover_image_url || '/images/hotel/room-double-bed-photo-enhanced.png',
        gallery_images: gallery,
        amenities: cat.amenities || [
          'Fully AC',
          'High-Speed Wi-Fi',
          'Smart TV',
          'Attached Bathroom',
          '24/7 Hot Water',
        ],
        clean_rooms_available: cleanCount,
        is_available_now: cleanCount > 0,
      };
    });

    return NextResponse.json({
      success: true,
      valid: true,
      kiosk_name: 'Reception Desk Acrylic QR Standee',
      hotel_name: 'Sri Tayi Grand',
      hotel_address: 'Main Road, Kadiri, Andhra Pradesh 515591',
      wifi_ssid: 'SriTayiGrand_Guest',
      allow_counter_payment: true,
      categories: categoryList,
      available_categories: categoryList,
      total_clean_rooms: availableRooms.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Kiosk token verification error';
    return NextResponse.json({ success: false, valid: false, error: msg }, { status: 500 });
  }
}
