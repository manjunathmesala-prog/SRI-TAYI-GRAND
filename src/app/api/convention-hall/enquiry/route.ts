import { NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { sendNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, eventType, eventDate, expectedGuests, requirements, message } = body;

    if (!name || !phone || !eventType || !eventDate) {
      return NextResponse.json(
        { error: 'Name, phone number, event type, and event date are required' },
        { status: 400 }
      );
    }

    const enquiry = repo.createHallEnquiry({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : '',
      event_type: eventType,
      event_date: eventDate,
      expected_guests: expectedGuests ? Number(expectedGuests) : 100,
      requirements,
      message,
    });

    // Notify hotel event management team
    await sendNotification({
      recipient: 'events@sritayigrand.com',
      type: 'email',
      template: 'convention_hall_enquiry_received',
      data: {
        reference: enquiry.enquiry_reference,
        name: enquiry.name,
        date: enquiry.event_date,
        type: enquiry.event_type,
      },
    });

    return NextResponse.json({
      success: true,
      enquiryReference: enquiry.enquiry_reference,
      enquiry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit enquiry';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
