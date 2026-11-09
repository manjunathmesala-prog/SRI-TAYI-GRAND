import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { EnquiryStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Enquiry ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, admin_notes } = body as {
      status?: EnquiryStatus;
      admin_notes?: string;
    };

    if (!status && admin_notes === undefined) {
      return NextResponse.json(
        { success: false, error: 'Either status or admin_notes must be provided' },
        { status: 400 }
      );
    }

    // Attempt update via repo.updateEnquiryStatus
    const updated = repo.updateEnquiryStatus(
      id,
      status || 'new',
      admin_notes
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Enquiry with ID ${id} not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      enquiry: updated,
    });
  } catch (error: any) {
    console.error('Error updating enquiry:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update enquiry' },
      { status: 500 }
    );
  }
}
