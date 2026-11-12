import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { EnquiryStatus, EnquiryType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Event Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EnquiryType | 'all' | null;
    const status = searchParams.get('status') as EnquiryStatus | 'all' | null;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';

    await repo.ensureEnquiriesLoaded();
    await repo.ensureContactEnquiriesLoaded();
    let unified = repo.getUnifiedEnquiries();
    const contactEnquiries = repo.getContactEnquiries();

    // Summary counts before filtering
    const counts = {
      total: unified.length,
      convention: unified.filter((e) => e.type === 'convention').length,
      general_stay: unified.filter((e) => e.type === 'general_stay').length,
      new: unified.filter((e) => e.status === 'new').length,
      contacted: unified.filter((e) => e.status === 'contacted').length,
      quotation_sent: unified.filter((e) => e.status === 'quotation_sent').length,
      converted: unified.filter((e) => e.status === 'converted').length,
      closed: unified.filter((e) => e.status === 'closed').length,
    };

    if (type && type !== 'all') {
      unified = unified.filter((e) => e.type === type);
    }

    if (status && status !== 'all') {
      unified = unified.filter((e) => e.status === status);
    }

    if (search) {
      unified = unified.filter(
        (e) =>
          e.name?.toLowerCase().includes(search) ||
          e.phone?.toLowerCase().includes(search) ||
          e.email?.toLowerCase().includes(search) ||
          e.reference?.toLowerCase().includes(search) ||
          e.details?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      enquiries: unified,
      contactEnquiries,
      counts,
    });
  } catch (error: any) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch enquiries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer name and phone number are required.' },
        { status: 400 }
      );
    }

    const newEnquiry = repo.createContactEnquiry({
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || undefined,
      subject: body.subject?.trim() || 'Direct Guest Enquiry',
      message: body.message?.trim() || 'Walk-in / Phone inquiry registered by front desk.',
      check_in_date: body.check_in_date || undefined,
      check_out_date: body.check_out_date || undefined,
      room_type: body.room_type || undefined,
      adults_count: body.adults_count ? Number(body.adults_count) : undefined,
      source: body.source || 'direct_phone',
      admin_notes: body.admin_notes?.trim() || undefined,
    });

    return NextResponse.json({ success: true, enquiry: newEnquiry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating enquiry:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create enquiry' },
      { status: 500 }
    );
  }
}
