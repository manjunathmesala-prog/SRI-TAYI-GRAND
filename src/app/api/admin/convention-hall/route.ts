import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { SeatingLayoutType, CateringPackageType, HallEnquiryStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Event Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const enquiries = repo.getHallEnquiries();
    const quotes = repo.getConventionQuotes();

    return NextResponse.json({
      success: true,
      enquiries,
      quotes,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Event Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create_quote') {
      const {
        enquiry_id,
        client_name,
        client_phone,
        client_email,
        event_name,
        event_date,
        seating_layout,
        guest_count,
        catering_package,
        catering_rate_per_plate,
        hall_rental_charge,
        av_sound_lighting,
        stage_decoration,
        generator_diesel,
        subtotal,
        gst_rate,
        gst_amount,
        total_amount,
        status,
        valid_until,
      } = body;

      if (!client_name || !client_phone || !event_name || !event_date || !guest_count) {
        return NextResponse.json(
          { success: false, error: 'client_name, client_phone, event_name, event_date, and guest_count are required.' },
          { status: 400 }
        );
      }

      const createdBy = auth.session?.name || body.created_by || 'V. Naresh Reddy (Event Manager)';

      const quote = repo.createConventionQuote({
        enquiry_id,
        client_name,
        client_phone,
        client_email,
        event_name,
        event_date,
        seating_layout: seating_layout as SeatingLayoutType,
        guest_count: Number(guest_count),
        catering_package: catering_package as CateringPackageType,
        catering_rate_per_plate: Number(catering_rate_per_plate || 0),
        hall_rental_charge: Number(hall_rental_charge || 0),
        av_sound_lighting: Number(av_sound_lighting || 0),
        stage_decoration: Number(stage_decoration || 0),
        generator_diesel: Number(generator_diesel || 0),
        subtotal: Number(subtotal || 0),
        gst_rate: Number(gst_rate || 0.18),
        gst_amount: Number(gst_amount || 0),
        total_amount: Number(total_amount || 0),
        status: status || 'draft',
        created_by: createdBy,
        valid_until: valid_until || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      });

      return NextResponse.json({
        success: true,
        quote,
      });
    }

    if (action === 'update_enquiry') {
      const { id, status, admin_notes, quoted_amount, advance_amount } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Enquiry id is required' }, { status: 400 });
      }

      const enq = repo.updateHallEnquiryStatus(
        id,
        status as HallEnquiryStatus,
        admin_notes,
        Number(quoted_amount),
        Number(advance_amount)
      );

      return NextResponse.json({ success: true, enquiry: enq });
    }

    return NextResponse.json({ success: false, error: 'Invalid action provided.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
