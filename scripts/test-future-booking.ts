import { HotelRepository } from './src/lib/db/repository';

async function testFutureBooking() {
  const repo = new HotelRepository();
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + 7);
  const checkOut = new Date(futureCheckIn);
  checkOut.setDate(checkOut.getDate() + 2);

  const booking = await repo.createBooking({
    guest_name: 'Future Guest Test',
    guest_phone: '9999999999',
    guest_email: 'future@test.com',
    check_in_date: futureCheckIn.toISOString().slice(0, 10),
    check_out_date: checkOut.toISOString().slice(0, 10),
    category_id: 'cat-double-03',
    category_name: 'Double Room',
    rooms_count: 1,
    adults_count: 2,
    children_count: 0,
    status: 'confirmed',
    payment_status: 'pending',
    payment_method: 'pay_at_hotel',
    subtotal_amount: 1800,
    total_amount: 1800,
    paid_amount: 0,
    additional_charges_amount: 0,
    tax_amount: 0,
  }, 'SystemTest');

  console.log('Future booking created:', booking.booking_reference);
  console.log('Status:', booking.status);
  
  const found = repo.getBookingByReference(booking.booking_reference);
  if (found) {
    console.log('Test PASSED: Future booking found in repository.');
  } else {
    console.error('Test FAILED: Future booking not found.');
  }
}

testFutureBooking();
