# 🏨 SRI TAYI GRAND - ROLE-BASED ACCESS CONTROL (RBAC) MANUAL TEST REPORT
**Audited Target**: Manager Roles (Hari Achari & Sagar) vs. Super Admin  
**Timestamp**: 2026-11-22T06:15:46.605Z  
**Engine**: Google Chrome 122+ (Playwright Core)  
**Database**: Supabase Cloud PostgreSQL (`aws-0-ap-northeast-1.pooler.supabase.com`)  
**Base URL**: http://localhost:3000  

---

## 1. Executive Summary

| Metric | Result |
| :--- | :--- |
| **Total Test Checks** | **39** |
| **Passed Checks** | **39** |
| **Failed Checks** | **0** |
| **Overall Compliance** | **100.0%** |
| **Production Mock Data** | **0% (100% Real-Time Supabase PostgreSQL)** |

---

## 2. Tested Accounts & Credentials Matrix

| Account Name | Email | Configured Role | Access Level | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Hari Achari** | `hari@sritayigrand.com` | `Hotel Manager` | Core Operations & Financials | ✅ Active Verified |
| **Sagar** | `sagar@sritayigrand.com` | `Hotel Manager` | Core Operations & Financials | ✅ Active Verified |
| **Super Admin** | `admin@sritayigrand.com` | `Super Admin` | Universal Full Access | ✅ Active Verified |

---

## 3. Test Cases & Verification Results

| Category | Description | Status | Details |
| :--- | :--- | :---: | :--- |
| **Frontend Login** | Quick preset cards present for Super Admin, Hari Achari, Sagar, and Front Desk | ✅ PASSED | {} |
| **Frontend Login** | Hari Achari preset pre-fills email and password correctly | ✅ PASSED | {} |
| **Authentication** | Hari Achari successfully authenticated and redirected to /admin/dashboard | ✅ PASSED | {} |
| **Dashboard Identity** | Dashboard displays Hari Achari identity and purple "Hotel Manager" badge | ✅ PASSED | {} |
| **Dashboard Shortcuts** | All 6 Manager Operational Shortcuts rendered (Walk-In, Attendance, Expenses, Hall, Night Audit, ERP) | ✅ PASSED | {} |
| **Sidebar RBAC** | All 7 Super Admin exclusive links are strictly HIDDEN from Manager sidebar | ✅ PASSED | {} |
| **Sidebar RBAC** | Staff Management base directory hidden while Staff Attendance is permitted | ✅ PASSED | {} |
| **Operations Flow** | Manager Hari Achari executed Staff Attendance Clock-In | ✅ PASSED | {} |
| **Supabase Sync** | Live attendance row verified in PostgreSQL table staff_attendance | ✅ PASSED | {"id":"att-1795328051900","staff_id":"50aba2e5-0000-4fbd-bb89-000000000001","shift":"morning","status":"present","clock_in":"2026-11-22T06:14:11.900Z","notes":"Manager Hari Achari Morning Shift Operational Duty"} |
| **Operations Flow** | Manager Hari Achari successfully recorded operational expense (₹250) | ✅ PASSED | {} |
| **Supabase Sync** | Live expense record verified in PostgreSQL table expenses | ✅ PASSED | {"id":"exp-1795328057576-215","title":"Staff Operational Tea & Refreshments - Manager Hari","amount":"250.00","category":"staff_welfare","payment_method":"cash","created_at":"2026-11-22T06:14:17.576Z"} |
| **Permitted Route** | Manager can access Walk-In Quick Desk (/admin/walk-in) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access Bookings & Reservations (/admin/bookings) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access Room Categories & Tariffs (/admin/rooms/categories) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access Convention & Function Hall (/admin/convention-hall) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access Night Audit System (/admin/night-audit) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access General Ledger ERP (/admin/accounting) without restriction | ✅ PASSED | {} |
| **Permitted Route** | Manager can access RFID Keycards Management (/admin/rfid) without restriction | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted Analytics & KPIs (/admin/analytics) -> Redirected to 403 | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted Financial Reports (/admin/reports) -> Redirected to 403 | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted Dynamic Pricing (/admin/pricing) -> Redirected to 403 | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted Hotel Settings (/admin/settings) -> Redirected to 403 | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted System Audit Logs (/admin/audit-logs) -> Redirected to 403 | ✅ PASSED | {} |
| **Security 403 Guard** | Edge Middleware correctly intercepted Channel Manager (/admin/channels) -> Redirected to 403 | ✅ PASSED | {} |
| **Backend API RBAC** | POST /api/admin/settings blocked with HTTP 403 Forbidden for Manager | ✅ PASSED | {} |
| **Backend API RBAC** | POST /api/admin/pricing blocked with HTTP 403 Forbidden for Manager | ✅ PASSED | {} |
| **Backend API RBAC** | POST /api/admin/staff blocked with HTTP 403 Forbidden for Manager | ✅ PASSED | {} |
| **Backend API RBAC** | GET /api/admin/expenses accessible with HTTP 200 OK for Manager | ✅ PASSED | {} |
| **Backend API RBAC** | GET /api/admin/night-audit/settings accessible with HTTP 200 OK for Manager | ✅ PASSED | {} |
| **Frontend Login** | Sagar preset pre-fills email and password correctly | ✅ PASSED | {} |
| **Dashboard Identity** | Dashboard displays Sagar identity and purple "Hotel Manager" badge | ✅ PASSED | {} |
| **Security 403 Guard** | Manager Sagar correctly intercepted from /admin/pricing -> Redirected to 403 | ✅ PASSED | {} |
| **Super Admin Access** | All Super Admin exclusive links (Analytics, Reports, Pricing, Channels, Settings, Audit Logs, Content) visible in sidebar | ✅ PASSED | {} |
| **Super Admin Access** | Super Admin accesses /admin/analytics with 200 OK (no 403 redirect) | ✅ PASSED | {} |
| **Super Admin Access** | Super Admin accesses /admin/settings with 200 OK (no 403 redirect) | ✅ PASSED | {} |
| **Database Integrity** | Hari Achari profile strictly verified in Supabase PostgreSQL (Role: Hotel Manager) | ✅ PASSED | {"id":"50aba2e5-0000-4fbd-bb89-000000000001","full_name":"Hari Achari","role":"Hotel Manager","is_active":true,"phone":"9440812346","email":"hari@sritayigrand.com"} |
| **Database Integrity** | Sagar profile strictly verified in Supabase PostgreSQL (Role: Hotel Manager) | ✅ PASSED | {"id":"50aba2e5-0000-4fbd-bb89-000000000002","full_name":"Sagar","role":"Hotel Manager","is_active":true,"phone":"9440812347","email":"sagar@sritayigrand.com"} |
| **Database Integrity** | Super Admin profile strictly verified in Supabase PostgreSQL (Role: Super Admin) | ✅ PASSED | {"id":"e6e40243-6f98-44dc-94ad-3c56303cf61a","full_name":"Sri Tayi Grand Admin","role":"Super Admin","is_active":true,"phone":"084942 23379","email":"admin@sritayigrand.com"} |
| **Database Integrity** | Hotel Manager role definition verified in Supabase PostgreSQL roles table | ✅ PASSED | {"id":"b0000000-0000-0000-0000-000000000002","name":"Hotel Manager","description":"Operational management, walk-ins, folios, expenditure, general ledger, banquet, attendance, and night audit"} |

---

## 4. Supabase Cloud Database Verification

### Verified Profiles in `profiles` table:
```json
[
  {
    "id": "50aba2e5-0000-4fbd-bb89-000000000001",
    "full_name": "Hari Achari",
    "role": "Hotel Manager",
    "is_active": true,
    "phone": "9440812346",
    "email": "hari@sritayigrand.com"
  },
  {
    "id": "50aba2e5-0000-4fbd-bb89-000000000002",
    "full_name": "Sagar",
    "role": "Hotel Manager",
    "is_active": true,
    "phone": "9440812347",
    "email": "sagar@sritayigrand.com"
  },
  {
    "id": "e6e40243-6f98-44dc-94ad-3c56303cf61a",
    "full_name": "Sri Tayi Grand Admin",
    "role": "Super Admin",
    "is_active": true,
    "phone": "084942 23379",
    "email": "admin@sritayigrand.com"
  }
]
```

### Role Definition in `roles` table:
```json
{
  "id": "b0000000-0000-0000-0000-000000000002",
  "name": "Hotel Manager",
  "description": "Operational management, walk-ins, folios, expenditure, general ledger, banquet, attendance, and night audit"
}
```

---

## 5. Visual Proof & Screenshots Captured

- `qa/evidence/manual-tester/01_login_portal_chips.png`
- `qa/evidence/manual-tester/02_hari_dashboard_view.png`
- `qa/evidence/manual-tester/03_hari_sidebar_menu.png`
- `qa/evidence/manual-tester/04_hari_attendance_initial.png`
- `qa/evidence/manual-tester/05_hari_clockin_verified.png`
- `qa/evidence/manual-tester/06_hari_expenses_initial.png`
- `qa/evidence/manual-tester/07_hari_expenses_created.png`
- `qa/evidence/manual-tester/08_hari_walkin_desk.png`
- `qa/evidence/manual-tester/09_hari_bookings.png`
- `qa/evidence/manual-tester/10_hari_room_categories.png`
- `qa/evidence/manual-tester/11_hari_function_hall.png`
- `qa/evidence/manual-tester/12_hari_night_audit.png`
- `qa/evidence/manual-tester/13_hari_accounting_erp.png`
- `qa/evidence/manual-tester/14_hari_rfid_center.png`
- `qa/evidence/manual-tester/15_hari_security_403_analytics.png`
- `qa/evidence/manual-tester/16_hari_security_403_reports.png`
- `qa/evidence/manual-tester/17_hari_security_403_pricing.png`
- `qa/evidence/manual-tester/18_hari_security_403_settings.png`
- `qa/evidence/manual-tester/19_hari_security_403_audit_logs.png`
- `qa/evidence/manual-tester/20_hari_security_403_channels.png`
- `qa/evidence/manual-tester/21_sagar_dashboard_view.png`
- `qa/evidence/manual-tester/22_sagar_security_403_pricing.png`
- `qa/evidence/manual-tester/23_superadmin_dashboard.png`
- `qa/evidence/manual-tester/24_superadmin_analytics_allowed.png`
- `qa/evidence/manual-tester/25_superadmin_settings_allowed.png`

---

## 6. Security & Architectural Conformance

1. **Edge Middleware Interception**: Verified that unpermitted routes (`/admin/analytics`, `/admin/reports`, `/admin/pricing`, `/admin/settings`, `/admin/audit-logs`, `/admin/channels`) are intercepted at edge runtime before any React components or data queries are rendered, redirecting Managers to `/admin/403`.
2. **Backend API Route Hardening**: Verified that sensitive mutation APIs (`/api/admin/settings`, `/api/admin/pricing`, `/api/admin/staff`) reject Manager tokens with HTTP 403 Forbidden.
3. **Sidebar Navigation Isolation**: Verified that the frontend `AdminSidebar.tsx` strictly purges Super Admin links from the DOM when a Manager is authenticated.
4. **Hotel Identity Preservation**: Verified that the hotel identity is strictly preserved as **Sri Tayi Grand**.
5. **No Mock Data**: Real-time Supabase PostgreSQL integration verified end-to-end.
