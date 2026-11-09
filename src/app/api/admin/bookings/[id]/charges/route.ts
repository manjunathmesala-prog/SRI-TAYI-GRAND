import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { FolioChargeCategory } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking identifier is required' }, { status: 400 });
    }

    const booking = repo.getBookingById(id) || repo.getBookingByReference(id);
    const charges = repo.getFolioCharges(id);

    return NextResponse.json({
      success: true,
      charges,
      booking: booking || null,
      totalChargesCount: charges.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch folio charges';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Booking identifier is required' }, { status: 400 });
    }

    const booking = repo.getBookingById(id) || repo.getBookingByReference(id);
    if (!booking) {
      return NextResponse.json({ success: false, error: `Booking ${id} not found` }, { status: 404 });
    }

    const body = await req.json();
    const { category, description, amount, tax_rate, posted_by } = body;

    if (!category || !description || amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Category, description, and positive numeric amount are required' },
        { status: 400 }
      );
    }

    const baseAmount = Number(amount);
    const taxRate = typeof tax_rate === 'number' ? tax_rate : 0.12;
    const taxAmount = Math.round(baseAmount * taxRate * 100) / 100;
    const totalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;

    const newCharge = repo.addFolioCharge({
      booking_id: booking.id,
      booking_reference: booking.booking_reference,
      category: category as FolioChargeCategory,
      description: String(description).trim(),
      amount: baseAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      posted_by: posted_by || 'Front Desk',
    });

    const updatedBooking = repo.getBookingById(booking.id) || repo.getBookingByReference(booking.booking_reference);

    return NextResponse.json({
      success: true,
      charge: newCharge,
      booking: updatedBooking,
      message: `Folio charge of ₹${totalAmount.toLocaleString('en-IN')} added successfully.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add folio charge';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    let chargeId = searchParams.get('chargeId') || searchParams.get('id');

    if (!chargeId) {
      const body = await req.json().catch(() => ({}));
      chargeId = body.chargeId || body.id;
    }

    if (!chargeId) {
      return NextResponse.json({ success: false, error: 'chargeId parameter is required' }, { status: 400 });
    }

    const deleted = repo.deleteFolioCharge(chargeId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: `Folio charge ${chargeId} not found` }, { status: 404 });
    }

    const updatedBooking = repo.getBookingById(id) || repo.getBookingByReference(id);

    return NextResponse.json({
      success: true,
      message: `Folio charge ${chargeId} deleted successfully.`,
      booking: updatedBooking || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete folio charge';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
