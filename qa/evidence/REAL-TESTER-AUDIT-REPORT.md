# 🏨 Sri Tayi Grand - Real Browser Automated Audit Report

**Audit Executed**: 2026-11-21T18:55:11.574Z  
**Engine**: Google Chrome (Playwright Core)  
**Base URL**: `http://localhost:3000`  
**Test Evidence Directory**: `qa/evidence/real-tester/`  

---

## 📊 Executive Summary Matrix

| Metric | Result |
| :--- | :--- |
| **Total Public Pages Tested** | **19** |
| **Total Admin Dashboard Pages Tested** | **33** |
| **Total Pages Passed (HTTP 200/Valid Render)** | **52** |
| **Total Buttons Discovered across App** | **904** |
| **Interactive Buttons Executed / Tested** | **270** |
| **Button Interactions Passed** | **270** |
| **Button Interactions Failed** | **0** |
| **Modals / Drawers Verified & Dismissed** | **37** |
| **Screenshots Captured** | **54** |

---

## 🌐 Public Website Routes & Button Interactions

| Route | Page Name | HTTP | Status | Buttons Found | Buttons Tested | Screenshot |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `/` | Home Page | 200 | ✅ PASS | 20 | 6 | [`public_home.png`](./real-tester/public_home.png) |
| `/rooms` | Room Catalog | 200 | ✅ PASS | 4 | 4 | [`public_rooms.png`](./real-tester/public_rooms.png) |
| `/rooms/double-room` | Deluxe Double Room Details | 200 | ✅ PASS | 15 | 6 | [`public_rooms_double-room.png`](./real-tester/public_rooms_double-room.png) |
| `/rooms/four-bed-room` | Family Four-Bed Room Details | 200 | ✅ PASS | 15 | 6 | [`public_rooms_four-bed-room.png`](./real-tester/public_rooms_four-bed-room.png) |
| `/rooms/suite-room` | Executive Suite Details | 200 | ✅ PASS | 15 | 6 | [`public_rooms_suite-room.png`](./real-tester/public_rooms_suite-room.png) |
| `/rooms/single-room` | Standard Single Room Details | 200 | ✅ PASS | 8 | 6 | [`public_rooms_single-room.png`](./real-tester/public_rooms_single-room.png) |
| `/availability` | Live Availability Checker | 200 | ✅ PASS | 10 | 6 | [`public_availability.png`](./real-tester/public_availability.png) |
| `/booking` | Online Booking Funnel | 200 | ✅ PASS | 3 | 3 | [`public_booking.png`](./real-tester/public_booking.png) |
| `/booking/checkout` | Booking Checkout | 200 | ✅ PASS | 3 | 3 | [`public_booking_checkout.png`](./real-tester/public_booking_checkout.png) |
| `/booking/confirmation` | Booking Confirmation Lookup | 200 | ✅ PASS | 3 | 3 | [`public_booking_confirmation.png`](./real-tester/public_booking_confirmation.png) |
| `/booking/pickup` | Pickup Code Portal | 200 | ✅ PASS | 5 | 2 | [`public_booking_pickup.png`](./real-tester/public_booking_pickup.png) |
| `/amenities` | Hotel Amenities | 200 | ✅ PASS | 3 | 3 | [`public_amenities.png`](./real-tester/public_amenities.png) |
| `/convention-hall` | Convention Hall & Banquets | 200 | ✅ PASS | 6 | 6 | [`public_convention-hall.png`](./real-tester/public_convention-hall.png) |
| `/gallery` | Photo Gallery | 200 | ✅ PASS | 8 | 6 | [`public_gallery.png`](./real-tester/public_gallery.png) |
| `/about` | About Sri Tayi Grand | 200 | ✅ PASS | 3 | 3 | [`public_about.png`](./real-tester/public_about.png) |
| `/contact` | Contact & Location | 200 | ✅ PASS | 5 | 5 | [`public_contact.png`](./real-tester/public_contact.png) |
| `/policies` | Hotel Policies & Rules | 200 | ✅ PASS | 2 | 2 | [`public_policies.png`](./real-tester/public_policies.png) |
| `/testimonials` | Guest Testimonials & Reviews | 200 | ✅ PASS | 8 | 6 | [`public_testimonials.png`](./real-tester/public_testimonials.png) |
| `/walk-in` | Public Walk-In Fast Booking | 200 | ✅ PASS | 5 | 2 | [`public_walk-in.png`](./real-tester/public_walk-in.png) |

---

## 🛡️ Admin Portal Routes & Button Interactions

| Route | Page Name | HTTP | Status | Buttons Found | Buttons Tested | Screenshot |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `/admin/dashboard` | Admin Dashboard Overview | 200 | ✅ PASS | 5 | 5 | [`admin_dashboard.png`](./real-tester/admin_dashboard.png) |
| `/admin/front-desk` | Front Desk Operations | 200 | ✅ PASS | 1 | 1 | [`admin_front-desk.png`](./real-tester/admin_front-desk.png) |
| `/admin/walk-in` | Reception Walk-In Booking | 200 | ✅ PASS | 16 | 8 | [`admin_walk-in.png`](./real-tester/admin_walk-in.png) |
| `/admin/bookings` | Bookings & Reservations Manager | 200 | ✅ PASS | 8 | 7 | [`admin_bookings.png`](./real-tester/admin_bookings.png) |
| `/admin/reservations` | Timeline Calendar Reservations | 200 | ✅ PASS | 8 | 7 | [`admin_reservations.png`](./real-tester/admin_reservations.png) |
| `/admin/rooms` | Rooms Management | 200 | ✅ PASS | 10 | 8 | [`admin_rooms.png`](./real-tester/admin_rooms.png) |
| `/admin/rooms/board` | Visual Room Board | 200 | ✅ PASS | 10 | 8 | [`admin_rooms_board.png`](./real-tester/admin_rooms_board.png) |
| `/admin/rooms/categories` | Room Categories & Tariffs | 200 | ✅ PASS | 5 | 2 | [`admin_rooms_categories.png`](./real-tester/admin_rooms_categories.png) |
| `/admin/rooms/inventory` | Daily Room Inventory Grid | 200 | ✅ PASS | 3 | 3 | [`admin_rooms_inventory.png`](./real-tester/admin_rooms_inventory.png) |
| `/admin/guests` | Guest Directory & CRM | 200 | ✅ PASS | 147 | 8 | [`admin_guests.png`](./real-tester/admin_guests.png) |
| `/admin/housekeeping` | Housekeeping & Turndown | 200 | ✅ PASS | 57 | 8 | [`admin_housekeeping.png`](./real-tester/admin_housekeeping.png) |
| `/admin/maintenance` | Maintenance & Work Orders | 200 | ✅ PASS | 17 | 8 | [`admin_maintenance.png`](./real-tester/admin_maintenance.png) |
| `/admin/convention-hall` | Convention Hall Reservations | 200 | ✅ PASS | 4 | 4 | [`admin_convention-hall.png`](./real-tester/admin_convention-hall.png) |
| `/admin/enquiries` | Guest Enquiries & Leads | 200 | ✅ PASS | 6 | 6 | [`admin_enquiries.png`](./real-tester/admin_enquiries.png) |
| `/admin/rfid` | RFID Keycard Operations (Protected Safety Mode) | 200 | ✅ PASS | 14 | 8 | [`admin_rfid.png`](./real-tester/admin_rfid.png) |
| `/admin/rfid/standee` | RFID QR Standee Kiosk | 200 | ✅ PASS | 0 | 0 | [`admin_rfid_standee.png`](./real-tester/admin_rfid_standee.png) |
| `/admin/payments` | Payment Transactions & Settlements | 200 | ✅ PASS | 116 | 7 | [`admin_payments.png`](./real-tester/admin_payments.png) |
| `/admin/cashbook` | Cashbook & Shift Register | 200 | ✅ PASS | 83 | 8 | [`admin_cashbook.png`](./real-tester/admin_cashbook.png) |
| `/admin/expenses` | Expense Tracker & Vouchers | 200 | ✅ PASS | 5 | 4 | [`admin_expenses.png`](./real-tester/admin_expenses.png) |
| `/admin/accounting` | Hotel Accounting & P&L | 200 | ✅ PASS | 12 | 8 | [`admin_accounting.png`](./real-tester/admin_accounting.png) |
| `/admin/daily-closing` | Daily Financial Closing | 200 | ✅ PASS | 3 | 3 | [`admin_daily-closing.png`](./real-tester/admin_daily-closing.png) |
| `/admin/night-audit` | Night Audit Automation | 200 | ✅ PASS | 11 | 8 | [`admin_night-audit.png`](./real-tester/admin_night-audit.png) |
| `/admin/analytics` | Revenue Analytics & KPIs | 200 | ✅ PASS | 7 | 5 | [`admin_analytics.png`](./real-tester/admin_analytics.png) |
| `/admin/reports` | Reports Generator & CSV/PDF | 200 | ✅ PASS | 3 | 3 | [`admin_reports.png`](./real-tester/admin_reports.png) |
| `/admin/staff` | Staff Management & Payroll | 200 | ✅ PASS | 16 | 8 | [`admin_staff.png`](./real-tester/admin_staff.png) |
| `/admin/staff/attendance` | Staff Shifts & Attendance | 200 | ✅ PASS | 11 | 8 | [`admin_staff_attendance.png`](./real-tester/admin_staff_attendance.png) |
| `/admin/pricing` | Tariff Rules & Dynamic Pricing | 200 | ✅ PASS | 15 | 8 | [`admin_pricing.png`](./real-tester/admin_pricing.png) |
| `/admin/channels` | OTA Channel Manager | 200 | ✅ PASS | 19 | 8 | [`admin_channels.png`](./real-tester/admin_channels.png) |
| `/admin/reviews` | Google Reviews Moderation | 200 | ✅ PASS | 139 | 8 | [`admin_reviews.png`](./real-tester/admin_reviews.png) |
| `/admin/content` | Content & CMS Management | 200 | ✅ PASS | 1 | 1 | [`admin_content.png`](./real-tester/admin_content.png) |
| `/admin/settings` | Hotel & Property Settings | 200 | ✅ PASS | 0 | 0 | [`admin_settings.png`](./real-tester/admin_settings.png) |
| `/admin/audit-logs` | Security Audit Logs | 200 | ✅ PASS | 11 | 8 | [`admin_audit-logs.png`](./real-tester/admin_audit-logs.png) |
| `/admin/403` | Role Access Denied Page | 200 | ✅ PASS | 0 | 0 | [`admin_403.png`](./real-tester/admin_403.png) |

---

## 🔒 RFID Safety & Do-Not-Touch Verification
- **Hardware Protection Compliance**: Verified. No physical card writes or Be-Tech hardware commands were executed during testing.
- **Hotel Property Identity**: Verified strictly as **Sri Tayi Grand**.

---
*Report generated automatically by Real Tester Suite.*
