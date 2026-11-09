const fs = require('fs');

// 1. Wire src/app/api/rfid/tap/route.ts
let tapFile = fs.readFileSync('src/app/api/rfid/tap/route.ts', 'utf8');
if (!tapFile.includes('notifySuperAdmin')) {
  tapFile = tapFile.replace(
    "import { repo } from '@/lib/db/repository';",
    "import { repo } from '@/lib/db/repository';\nimport { notifySuperAdmin } from '@/lib/notifications/engine';"
  );
  tapFile = tapFile.replace(
    'const result = repo.processDoorTap(cardUid, roomNumber, action);',
    `const result = repo.processDoorTap(cardUid, roomNumber, action);

    // Non-blocking Super Admin notification dispatch with 3s deduplication
    notifySuperAdmin({
      eventType: 'EVENT_RFID_TAP',
      payload: {
        deviceId: body.deviceId || \`reader-\${roomNumber}\`,
        location: \`Room \${roomNumber}\`,
        cardUid,
        holderName: result.event?.holder_name,
        cardType: result.cardType,
        result: result.success ? 'GRANTED' : 'DENIED',
        reason: result.message,
        timestamp: new Date().toISOString(),
      },
    });`
  );
  fs.writeFileSync('src/app/api/rfid/tap/route.ts', tapFile, 'utf8');
  console.log('✅ Wired notifySuperAdmin in /api/rfid/tap');
}

// 2. Wire src/app/api/bookings/create/route.ts
let bkCreate = fs.readFileSync('src/app/api/bookings/create/route.ts', 'utf8');
if (!bkCreate.includes('notifySuperAdmin')) {
  bkCreate = bkCreate.replace(
    "import { repo } from '@/lib/db/repository';",
    "import { repo } from '@/lib/db/repository';\nimport { notifySuperAdmin } from '@/lib/notifications/engine';"
  );
  bkCreate = bkCreate.replace(
    'return NextResponse.json({',
    `notifySuperAdmin({
      eventType: 'EVENT_NEW_BOOKING',
      payload: {
        bookingReference: booking.booking_reference,
        customerName: booking.guest_name,
        roomCategory: booking.category_name,
        roomsCount: booking.rooms_count,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        totalAmount: booking.total_amount,
        source: 'online',
      },
    });

    return NextResponse.json({`
  );
  fs.writeFileSync('src/app/api/bookings/create/route.ts', bkCreate, 'utf8');
  console.log('✅ Wired notifySuperAdmin in /api/bookings/create');
}

// 3. Wire src/app/api/bookings/verify/route.ts
let bkVerify = fs.readFileSync('src/app/api/bookings/verify/route.ts', 'utf8');
if (!bkVerify.includes('notifySuperAdmin')) {
  bkVerify = bkVerify.replace(
    "import { repo } from '@/lib/db/repository';",
    "import { repo } from '@/lib/db/repository';\nimport { notifySuperAdmin } from '@/lib/notifications/engine';"
  );
  bkVerify = bkVerify.replace(
    '// Send confirmation notification',
    `// Non-blocking Super Admin payment alert
    notifySuperAdmin({
      eventType: 'EVENT_TRANSACTION',
      payload: {
        transactionId: razorpayPaymentId,
        amount: booking.total_amount,
        currency: 'INR',
        method: 'upi',
        payerName: booking.guest_name,
        bookingReference: booking.booking_reference,
        status: 'captured',
      },
    });

    // Send confirmation notification`
  );
  fs.writeFileSync('src/app/api/bookings/verify/route.ts', bkVerify, 'utf8');
  console.log('✅ Wired notifySuperAdmin in /api/bookings/verify');
}

// 4. Wire src/app/api/admin/operations/route.ts
let opsFile = fs.readFileSync('src/app/api/admin/operations/route.ts', 'utf8');
if (!opsFile.includes('notifySuperAdmin')) {
  opsFile = opsFile.replace(
    "import { repo } from '@/lib/db/repository';",
    "import { repo } from '@/lib/db/repository';\nimport { notifySuperAdmin } from '@/lib/notifications/engine';"
  );

  // Check-In Alert
  opsFile = opsFile.replace(
    'return NextResponse.json({\n          success: true,\n          message: `Guest ${booking.guest_name} successfully checked in.`,',
    `notifySuperAdmin({
          eventType: 'EVENT_CHECK_IN',
          payload: {
            guestName: booking.guest_name,
            roomNumber: updatedBooking?.assigned_room_number || targetRoomIdentifier || 'Room',
            bookingReference: booking.booking_reference,
            checkInTime: new Date().toISOString(),
            staffName,
          },
        });

        return NextResponse.json({
          success: true,
          message: \`Guest \${booking.guest_name} successfully checked in.\`,`
  );

  // Check-Out Alert
  opsFile = opsFile.replace(
    'return NextResponse.json({\n          success: true,\n          message: `Guest ${booking.guest_name} successfully checked out.',
    `notifySuperAdmin({
          eventType: 'EVENT_CHECK_OUT',
          payload: {
            guestName: booking.guest_name,
            roomNumber: booking.assigned_room_number || 'Room',
            bookingReference: booking.booking_reference,
            checkOutTime: new Date().toISOString(),
            balanceStatus: pendingBalance > 0 && !settlementPayment ? 'pending' : 'settled',
            outstandingAmount: pendingBalance > 0 && !settlementPayment ? pendingBalance : 0,
            staffName,
          },
        });

        return NextResponse.json({
          success: true,
          message: \`Guest \${booking.guest_name} successfully checked out.`
  );

  fs.writeFileSync('src/app/api/admin/operations/route.ts', opsFile, 'utf8');
  console.log('✅ Wired notifySuperAdmin in /api/admin/operations');
}
