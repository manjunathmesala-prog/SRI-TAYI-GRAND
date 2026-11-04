# SRI TAYI GRAND HOTEL — PRODUCTION SYSTEM
### Luxury Hotel Booking Website & Comprehensive Hotel Management SaaS

Official Hotel: **SRI TAYI GRAND**  
Address: **4585+F8J, Opp. Girls High School, Bypass Road, Tadipatri – Pulivendula – Kadiri Road, Revenue Colony, Kadiri – 515591, Anantapur District, Andhra Pradesh, India**  
Official Contact: **084942 23379** | WhatsApp: **+91 84942 23379**

---

## 1. System Overview

Sri Tayi Grand is an enterprise-grade digital hotel booking and operational management platform engineered with Next.js 15 (App Router), TypeScript, Tailwind CSS, and Supabase PostgreSQL.

### Architecture Highlights:
- **Public Guest Platform:**
  - Responsive, high-fidelity luxury hospitality visual system conforming strictly to the official brand palette: Deep Espresso Brown (`#382216`), Dark Chocolate (`#25150F`), Champagne Gold (`#D8AD56`), Warm Ivory (`#F8F1E9`), and Soft Beige (`#EFE3D6`).
  - Dynamic Room Showcase for all active categories: **Suite Room**, **Double Bed Room**, **Double Room**, and **Single Bed Room**.
  - Real-time database inventory calculation preventing overbooking.
  - Multi-step checkout with server-side validation and price re-calculation.
  - Razorpay payment gateway integration with server-side HMAC SHA256 signature verification.
  - "Pay at Hotel" support.
  - Grand Convention Hall showcase with structured inquiry submission.
  - Verified property amenities directory.
  - Photo gallery with category filtering and full-screen lightbox.
  - Contact page with direct calling, WhatsApp routing, and Google Maps directions.
  - Transparent legal policies (Cancellation, Refund, Booking, Privacy).

- **Hotel Management SaaS Administration Portal (`/admin`):**
  - **Operational Dashboard Overview (`/admin/dashboard`):** Real-time operational KPIs (occupancy rates, active stays, today's arrivals, pending collections, monthly revenue).
  - **Front Desk Operations (`/admin/front-desk`):** Streamlined reception workspace with instant guest check-in, physical room assignment, RFID key issuance, stay folios, incidental charge additions, and checkout settlement.
  - **Physical Room Inventory (`/admin/rooms/inventory`):** Visual room board across Floors 1–3 tracking operational statuses (`Available`, `Occupied`, `Reserved`, `Cleaning`, `Maintenance`, `Out of Service`) and housekeeping statuses (`Clean`, `Dirty`, `In Progress`, `Inspected`).
  - **Room Category Management (`/admin/rooms/categories`):** Add, edit, activate/deactivate room categories, update tariffs, bed types, and guest limits.
  - **Booking Management (`/admin/bookings`):** Complete reservation register with filters, room assignment, offline payment recording, and cancellation.
  - **Housekeeping Board (`/admin/housekeeping`):** Real-time cleaning board for room turnover and inspection sign-offs.
  - **Convention Hall Pipeline (`/admin/convention-hall`):** Banquet inquiry management, quotation creation, and date blocking.
  - **Guest CRM (`/admin/guests`):** Master guest directory with stay frequency and contact history.
  - **Financial Ledger (`/admin/payments`):** Razorpay gateway logs, reception cash/UPI receipts, and refund auditing.
  - **RFID Smart Room Key Integration (`/admin/rfid`):** Vendor-independent RFID device registry, keycard issuance, door access tap event logs, and test tap simulator.
  - **Reports & Analytics (`/admin/reports`):** Occupancy benchmarking, ADR calculation, and one-click CSV export.
  - **Website CMS (`/admin/content`):** Live editing of hero copy, address, and contact numbers without code deployment.
  - **Hotel Settings (`/admin/settings`):** Configurable check-in/out times, GST rates (12%), and hold lease limits.
  - **Staff RBAC (`/admin/staff`):** Role-based permissions for Super Admin, Hotel Manager, Front Desk, Housekeeping, Accounts, and Event Manager.

---

## 2. Technology Stack

- **Framework:** Next.js 15 (App Router with Server Actions & API Routes)
- **Language:** TypeScript 5.7+
- **Styling:** Tailwind CSS 3.4 with custom hospitality design tokens
- **Icons:** Lucide Icons
- **Motion:** Framer Motion
- **Database:** Supabase PostgreSQL with 36 normalized tables, RLS, and constraints
- **Payments:** Razorpay REST API with SHA-256 webhook & signature verification
- **Infrastructure:** Vercel Deploy Ready

---

## 3. Database Setup (Supabase PostgreSQL)

1. Open your Supabase Dashboard: [https://database.new](https://database.new).
2. Go to **SQL Editor**.
3. Run the schema migration script located at:
   `supabase/migrations/20261104000000_sri_tayi_grand_master_schema.sql`
4. Run the seed data script located at:
   `supabase/seed.sql`
5. Copy your project URL, anon key, and service role key into your `.env.local` file.

---

## 4. Environment Variables (`.env.local`)

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Hotel Metadata
NEXT_PUBLIC_HOTEL_NAME="SRI TAYI GRAND"
NEXT_PUBLIC_HOTEL_PHONE="084942 23379"
NEXT_PUBLIC_HOTEL_WHATSAPP="+918494223379"
NEXT_PUBLIC_HOTEL_EMAIL="contact@sritayigrand.com"
NEXT_PUBLIC_HOTEL_ADDRESS="4585+F8J, Opp. Girls High School, Bypass Road, Kadiri – 515591, Anantapur District, Andhra Pradesh, India"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Default Admin Credentials
ADMIN_DEFAULT_EMAIL=admin@sritayigrand.com
ADMIN_DEFAULT_PASSWORD=GrandHotel@Kadiri2026!
```

---

## 5. Running the Project Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
http://localhost:3000
```

### Accessing the Admin Console:
Navigate to `http://localhost:3000/admin/login` or click **Staff Portal** in the website footer.
Use the pre-configured credentials:
- **Email:** `admin@sritayigrand.com`
- **Password:** `GrandHotel@Kadiri2026!`
(Or click any of the instant role switchers on the login screen for evaluation.)

---

## 6. Verification & Production Deployment

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```
