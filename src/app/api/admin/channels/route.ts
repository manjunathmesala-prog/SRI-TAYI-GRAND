import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { ChannelSyncLog, OtaChannel } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const channels = repo.getChannels();
    const syncLogs = repo.getChannelSyncLogs();
    const categories = repo.getCategories();

    const connectedCount = channels.filter((c) => c.isConnected).length;
    const latestSync = syncLogs.length > 0 ? syncLogs[0].timestamp : null;

    return NextResponse.json({
      success: true,
      stats: {
        totalChannels: channels.length,
        connectedCount,
        latestSync,
        totalLogs: syncLogs.length,
      },
      channels,
      syncLogs,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        base_price_per_night: cat.base_price_per_night,
        extra_person_tariff_rupees: cat.extra_person_tariff_rupees || 500,
        max_occupancy: cat.max_occupancy,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const staffName = auth.session?.name || 'Revenue Admin';

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'sync_channel': {
        const { channelId } = body;
        if (!channelId) {
          return NextResponse.json(
            { success: false, error: 'channelId is required for sync_channel' },
            { status: 400 }
          );
        }

        const result = repo.syncChannel(channelId, staffName);
        return NextResponse.json({
          success: true,
          message: `Channel ${channelId} synced successfully.`,
          log: result.log,
        });
      }

      case 'sync_all': {
        const channels = repo.getChannels();
        const results = [];
        for (const ch of channels) {
          if (ch.isConnected) {
            results.push(repo.syncChannel(ch.id, staffName));
          }
        }
        return NextResponse.json({
          success: true,
          message: `All ${results.length} active OTA channels synchronized successfully.`,
          syncedCount: results.length,
        });
      }

      case 'update_channel': {
        const { channelId, updates } = body;
        if (!channelId || !updates) {
          return NextResponse.json(
            { success: false, error: 'channelId and updates are required' },
            { status: 400 }
          );
        }

        const updated = repo.updateChannel(channelId, updates, staffName);
        return NextResponse.json({
          success: true,
          message: `OTA channel ${updated.name} updated successfully.`,
          channel: updated,
        });
      }

      case 'simulate_ota_booking': {
        const {
          channelId,
          guest_name,
          guest_phone,
          guest_email,
          category_id,
          check_in_date,
          check_out_date,
          adults_count = 2,
          children_count = 0,
          special_requests,
        } = body;

        if (!channelId || !guest_name || !guest_phone || !category_id || !check_in_date || !check_out_date) {
          return NextResponse.json(
            {
              success: false,
              error: 'channelId, guest_name, guest_phone, category_id, check_in_date, check_out_date are required',
            },
            { status: 400 }
          );
        }

        const channel = repo.getChannel(channelId);
        if (!channel) {
          return NextResponse.json({ success: false, error: `OTA channel ${channelId} not found` }, { status: 404 });
        }

        const category = repo.getCategoryById(category_id);
        if (!category) {
          return NextResponse.json({ success: false, error: `Room category ${category_id} not found` }, { status: 404 });
        }

        // Calculate nights
        const checkIn = new Date(check_in_date);
        const checkOut = new Date(check_out_date);
        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

        // Rate with OTA markup multiplier
        const basePrice = category.base_price_per_night;
        const otaNightlyRate = Math.round(basePrice * channel.rateMultiplier);
        const subtotal = otaNightlyRate * nights;
        const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
        const totalAmount = subtotal + taxAmount;

        const otaRef = `OTA-${channel.logoText}-${Math.floor(100000 + Math.random() * 900000)}`;

        // Find available room in category if available
        const allRooms = repo.getRooms();
        const availableRoom = allRooms.find(
          (r) => r.category_id === category_id && r.operational_status === 'available' && r.is_active
        );

        const booking = await repo.createBooking(
          {
            guest_id: `gst-ota-${Date.now()}`,
            guest_name,
            guest_phone,
            guest_email: guest_email || `${guest_name.toLowerCase().replace(/\s+/g, '')}@ota-guest.com`,
            check_in_date,
            check_out_date,
            category_id,
            category_name: category.name,
            assigned_room_id: availableRoom?.id,
            assigned_room_number: availableRoom?.room_number,
            adults_count: Number(adults_count) || 2,
            children_count: Number(children_count) || 0,
            rooms_count: 1,
            status: 'confirmed',
            payment_status: 'successful',
            payment_method: 'online',
            subtotal_amount: subtotal,
            tax_amount: taxAmount,
            additional_charges_amount: 0,
            total_amount: totalAmount,
            paid_amount: totalAmount,
            special_requests: `Simulated OTA Channel Push via ${channel.name} (Ref: ${otaRef}). ${special_requests || ''}`.trim(),
            early_check_in_requested: false,
            late_check_out_requested: false,
          },
          staffName
        );

        // Record channel sync log
        const log: ChannelSyncLog = {
          id: `synclog-${Date.now()}`,
          channelId: channel.id,
          channelName: channel.name,
          syncType: 'reservation_push',
          status: 'success',
          message: `Incoming instant reservation #${otaRef} processed for ${guest_name}. Category: ${category.name}, ${nights} night(s). 2-Way ARI inventory decremented.`,
          roomsUpdatedCount: 1,
          ratesUpdatedCount: 1,
          timestamp: new Date().toISOString(),
        };
        repo.addChannelSyncLog(log, staffName);

        return NextResponse.json({
          success: true,
          message: `Simulated OTA reservation received from ${channel.name} and mapped to Booking #${booking.booking_reference}.`,
          booking,
          log,
        });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
