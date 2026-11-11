# Sri Tayi Grand — execution QA and release decision

11 November 2026. Local corrections are prepared for review. **NOT READY — CRITICAL ISSUES REMAIN.**

## A. Executive summary

Actual browser, HTTP, database, provider, restart and concurrency tests were executed. This was not a code-only review. The 28 requested production admin pages were opened, and all 28 were subsequently exercised for rendering in the isolated local app. Fifteen public routes, five additional admin routes/aliases, login, and all three dynamic route templates received limited browser coverage. Dynamic booking confirmation/pickup coverage uses invalid identifiers, not a completed customer lifecycle.

Confirmed failures include public instant Super Admin login in production, unsigned session/header trust in the original local authentication implementation, business fixture contamination of live results, and successful write acknowledgements followed by record loss after a real server restart. The shared repository broadcasts/returns before cloud write confirmation; journal entries have no durable write in their creation path. RFID tap-history permissions also expose anonymous CRUD capability in database metadata.

Authentication, validation, a specific booking conflict, payment input handling, hydration and mobile-header defects were corrected and retested locally. They have not been deployed to production. The production repository/data/policy defects remain. No production business records, database schema, payment captures, physical cards or protected RFID files were changed.

The supplied database configuration identifies the existing production project. A separate disposable staging database was never established. The user confirmed no physical RFID operator is available. The RFID freeze includes `src/lib/db/repository.ts`: [AGENTS.md](../AGENTS.md), Section 7 says **“DO NOT modify, delete, or rewrite any of the files listed in Section 1 and Section 2.”** That restriction prevents the underlying repository repair. It does not make the failing workflows acceptable.

## B. Application coverage

| Discovered item | Count | Meaning |
|---|---:|---|
| Page route definitions | 52 | Includes aliases, login, three dynamic templates |
| API route files | 61 | Methods are separately inventoried in the master checklist |
| Interactive source definitions | 1,221 | JSX definitions, not unique rendered instances |
| Native button definitions | 621 | Some render multiple times or conditionally |
| Form definitions | 53 | Full form acceptance is not complete |
| Link definitions | 137 | 75 NextLink, 15 Link, 47 anchors; includes non-navigation actions |
| Native inputs / selects / textareas | 245 / 16 / 20 | Custom controls are additional definitions |
| Database tables inspected | 49 | Public schema, read-only transaction |
| Indexes / storage buckets inspected | 85 / 6 | Metadata only |
| End-to-end business workflows | Not fully enumerated or accepted | No complete durable cloud workflow can be signed off |

[master-checklist.csv](master-checklist.csv) contains every discovered source control plus executed assertions, route coverage, API-method inventory and outstanding acceptance dependencies. [inventory.json](inventory.json) preserves file/line/label/API references. [connection-matrix.csv](connection-matrix.csv) maps all 52 page routes to source files, discovered APIs, repository methods, observed table connections and verification gaps.

The matrix deliberately keeps source definitions distinct from runtime instances. A source entry marked NOT TESTED may have a separately recorded runtime instance; it is not automatically promoted to PASS. Counts are not a feature pass percentage. Early failures remain in evidence, while successful retests determine current narrow assertions.

### Architecture observed

Browser pages call Next.js route handlers, directly or through `src/lib/realtime-client.ts`. Handlers authenticate with `src/lib/auth.ts` and typically use the singleton `src/lib/db/repository.ts`. That repository initializes arrays from `mock-data.ts`, hydrates/merges cloud data, mutates memory and calls `supabase-sync.ts`. PostgreSQL holds shared hotel tables; several repository writes do not await successful persistence. SSE events can therefore describe an uncommitted memory change. The accounting journal creation path updates arrays and broadcasts without a journal-table write.

RFID adds frozen `card-storage.ts`/`data/cards.json`, Supabase RFID storage and a Be-Tech C# bridge using the proprietary SDK. The browser reaches the local bridge through the configured HTTPS Cloudflare tunnel. Razorpay orders and verification use server/API code plus the provider checkout integration. This run verified a real sandbox order only.

## C. Test results

These counts describe assertions, not complete feature acceptance. Detailed requests, responses, controls and outcomes are retained under [evidence](evidence/).

| Category | Passed evidence | Failed / unresolved | Not tested / limit |
|---|---|---|---|
| Navigation | 28 requested local admin routes; 15 public routes; five extra admin aliases; login; four dynamic valid/invalid cases | Initial cold-build/resource navigation failures recovered on retest | Full back/forward matrix and every sidebar/link path |
| Buttons | Six module CSV export actions produced files; login/logout assertions | 56 clicks remain PARTIALLY CONNECTED because business results were not asserted | All remaining source definitions retained individually |
| Forms | 11 admin modal openings; 10 initial cancellations plus journal retest; eight required-field checks plus disabled journal; three public required-field checks | Original journal harness tried clicking an intentionally disabled button, corrected on retest | Full valid/edit/duplicate/delete lifecycle for all 53 forms |
| Frontend | 390px document-width checks on requested pages; header controls fit after fix; tablet accounting render; housekeeping reload hydration retest | One generic audit-page `Event` error is inconclusive; no resolved claim | Images/embeds blocked in final public run; exhaustive accessibility and browser matrix |
| Backend | 52 production GET probes; six invalid payloads now HTTP 400; local booking concurrency gives 200 + 409 with one record | Four endpoints acknowledge data that are lost on restart | Most write methods and cross-endpoint atomicity |
| Database | 49 tables, columns, constraints, policies and counts; 85 indexes; six buckets inspected | Unsafe RFID history grants/policy; API/cloud count differences | Durable isolated cloud CRUD, migration rehearsal, relational write checks |
| Local persistence | Actual process restart executed | Four acknowledged records disappear | Offline queue/retry/conflict recovery |
| Cloud persistence | Read-only cloud connection works | Outage tests demonstrate false success; no successful writes accepted | Separate staging unavailable |
| Realtime | Existing isolated software tests execute | Memory broadcast cannot prove commit | Persisted multi-session updates, reconnect/recovery/leak tests |
| RFID software/provider | Two bridge status URLs return 200; ten baselined frozen files unchanged | Anonymous RFID history policy unresolved | Issue/activate/revoke/event retry/deduplication acceptance |
| RFID hardware | None | None fabricated | Physical encoding, card taps, revocation and door denial NOT TESTED |
| Security | Seven targeted auth tests; 11 actual HTTP authorization checks; invalid login and logout browser checks | Production shortcut remains until controlled deployment; RFID RLS unresolved | Full XSS/SQL injection/upload/rate-limit/cross-user matrix |
| Performance | Actual HTTP timings saved; two-request local concurrency exercised | Normal build initially hit host process/resource exhaustion; one-worker build succeeded | Load, percentile latency, slow-query plans and soak tests |
| Automated regression | 10 targeted tests and 41 existing isolated tests passed | No complete provider/cloud E2E acceptance | RFID production-hardening suite excluded from isolated run for safety |

Evidence: `regression-security-final.txt`, `existing-all-isolated.txt`, `rbac-http.json`, `negative-api-before.json`, `negative-api-after.json`, `browser-execution.json`, `browser-retest.json`, `additional-browser.json`, `public-browser.json`, `final-browser.json`, `form-execution.json`.

Test harness corrections are explicit: the original NaN HTTP 500 was wrongly classified as PASS and corrected to FAIL; the settings read authorization expectation was corrected to its existing contract (Front Desk GET allowed, POST denied); journal submission is intentionally disabled when empty; the checkout availability POST is a read-only background request, not a booking mutation. Initial evidence is retained instead of concealed.

## D. Missing connections and incomplete acceptance

| Connection | Observed gap | Required acceptance work |
|---|---|---|
| Business API → durable commit | Expense, maintenance and quote writes return without cloud confirmation | Await transactional persistence, propagate failure, test rollback and restart in staging |
| Journal → durable ledger | In-memory creation path; journal/account tables not present in inspected public schema | Approved storage design/migration, balanced durable transaction, restart and ledger reconciliation |
| Cloud → authoritative UI | Repository keeps source fixtures alongside hydrated cloud records | Remove production fixture initialization while preserving genuine configuration; reconcile fresh process/API/DB counts |
| Mutation → realtime | Event broadcast is not tied to confirmed commit | Two authorized sessions, commit correlation, reconnect recovery and duplicate prevention |
| Offline → cloud recovery | No durable queue acceptance demonstrated | Specify supported offline operations, pending/error state, retry/conflict tests |
| Payment → provider → webhook → ledger | Real test order only | Sandbox authorization/capture, signed webhook, idempotency, failure/refund and durable ledger tests |
| RFID → physical acceptance | Status reachable but no operator/card/door event | Designated card and door; actual encode/tap/revoke/denial evidence |
| Settings/CMS/storage | Reads and bucket metadata only | Upload MIME/size/access tests and durable content propagation in staging |
| Channel manager → OTA | Channel API uses repository sync paths; real provider acceptance absent | Actual configured OTA contract, credentials, inventory/rate round trip and failure tests |
| Staff/permissions → shared persistent identity | Source staff list remains part of auth; complete staff-write persistence not verified | Role change/deactivation/password lifecycle tests across sessions and restarts |

Each remaining unexecuted control is listed in the master matrix. Full CRUD, cancellation/rescheduling, check-in/out, housekeeping completion, cash closing, room changes, staff edits, uploads, destructive actions and physical RFID operations are not represented as PASS.

## E. Fixes implemented and retested

| Defect and reproduction | Correction | Retest evidence / limit |
|---|---|---|
| Production Instant Enter enters Super Admin without credential entry; original server accepts unsigned/header-based identity | `src/app/admin/login/page.tsx`, `src/components/admin/AdminHeader.tsx`, `src/lib/auth.ts`: remove embedded/default password flows, instant login/role switch, unsigned legacy tokens, trusted role header and development auth bypass; require configured signing secret/password | Auth before/after, 7 unit assertions, 11 HTTP checks, actual login/logout browser tests. Production unchanged |
| Middleware trusts decoded role without verifying signature | New `src/lib/auth-edge.ts`; `src/middleware.ts` verifies HMAC and numeric expiry | Forged/expired page requests redirect to login; valid login renders dashboard |
| Payment accepts non-finite/unsafe amount; missing provider config fabricates orders | `src/lib/razorpay.ts`: finite safe amount checks; fake order restricted to test environment | Two targeted boundary tests plus actual sandbox order create/fetch. No capture claim |
| Invalid expenses, nonexistent maintenance room, invalid hall quote and journal accounts accepted | Four `src/app/api/admin/{expenses,maintenance,convention-hall,accounting}/route.ts` files validate relevant fields | Six original failing requests now 400. Four valid local requests still accepted; durability remains FAIL |
| Concurrent room request inserts rejected booking before assignment failure | `src/app/api/admin/bookings/route.ts` validates dates, room identity/active state and conflicts before repository insertion | Before: 200/400 with two confirmed entries. After: 200/409 with one entry; targeted regression passes. Does not guarantee distributed locking or fix `/api/admin/operations`/public callers |
| Analytics initially shows fabricated room totals/channel proportions | `src/app/admin/analytics/page.tsx` uses unknown placeholders and response-derived distribution; client-loaded timestamp | Browser screenshots and route retest. Fixture-backed upstream metrics remain unresolved |
| Housekeeping server/client printable timestamp differs, causing hydration failure | `src/app/admin/housekeeping/page.tsx` computes timestamp on client and before print | Actual reload retest no hydration mismatch |
| Mobile admin header actions clip at 390px; extra layout spacing | `src/components/admin/AdminHeader.tsx`, `src/app/admin/layout.tsx` wrap controls/remove redundant padding | Measured controls fit; menu opens; `mobile-header-after.png` and `mobile-menu.png` |
| Isolated copied source causes duplicate TypeScript class identities | `tsconfig.json` excludes `scratch` | Final TypeScript check and production build pass |

Checkout RFID hooks and the protected repository were not altered. Ten baselined protected file hashes match; [frozen-verification.json](evidence/frozen-verification.json) lists them. Other frozen files have no Git changes. No bridge/tunnel restart or reconfiguration was performed.

## F. Database verification and cleanup plan

The live cloud inspection ran inside `BEGIN READ ONLY` and rolled back. All 49 public tables had RLS enabled; enabling RLS alone is not proof of safe policies. The query returned no public triggers/routines visible in its scope. No migration was applied. Four public asset buckets and two private buckets (`guest-documents`, `invoices`) have 10 MB limits and unrestricted MIME metadata; actual upload/access acceptance is outstanding.

| Data set | Live database count | Authenticated production API count |
|---|---:|---:|
| Bookings | 2 | 5 |
| Guests | 2 | 3 |
| Expenses | 0 | 3 |
| Maintenance | 0 | 3 |
| Hall enquiries | 0 | 2 |
| Convention quotes | 0 | 2 |
| Cash shifts | 0 | 1 |
| Daily closings | 0 | 1 |

These differences, combined with repository fixture initialization, establish non-authoritative business results. They do **not** identify database rows safe to delete. The targeted test-marker booking query returned zero. Confirmed production deletion candidates: **none established; zero deleted**. Exact counts for every inspected table are in `database-readonly.json`.

In the isolated app, each of expenses, maintenance, convention quotes and accounting accepted one uniquely marked valid record. After a real Next.js process restart, each had zero matching records. PostgreSQL was intentionally unreachable at loopback port 9. `positive-api.json` and `restart-persistence.json` prove acknowledged-data loss under database outage; they are not cloud persistence successes.

Before any future cleanup: export the identified staging/production data and schema, record checksums, restore into a separate database and verify counts/relationships; identify exact unwanted IDs with owner review; obtain deletion approval; remove only those rows in a transaction; verify genuine bookings/guests/payment/RFID relationships and UI counts. No production backup/restore or deletion was needed or claimed in this run.

## G. RFID verification

The observed integration identifies Be-Tech BIS SDK, C# bridge, ACR120 proprietary reader mode, port 1 and reader type 4. Local HTTP bridge status at port 8989 returned 200 with service identity. The documented HTTPS tunnel returned 200 with `isOnline: true` and `hardwareConnected: true`. The local response itself omitted `hardwareConnected`.

These are software/provider-reported status observations only. There was no physical card encoding, tap, access event, lock unlock, door-open telemetry, card purge or revocation attempt. No simulated event is presented as physical evidence. User-confirmed missing dependency: reception operator with a designated test card/door. Card issue/toggle/delete and checkout hardware lifecycle remain NOT TESTED under the freeze.

Database metadata shows an `rfid_tap_history` public ALL policy with unconditional access and anonymous SELECT/INSERT/UPDATE/DELETE grants. A destructive anonymous request was not sent. Repair is blocked by the explicit protected persistence policy; this is an unresolved security finding, not a hardware failure.

## H. Security and performance

Local authentication now rejects unsigned/expired/forged identities, and login no longer supplies default passwords. Production remains on its previous implementation. Secure configured credentials and a signing secret of at least 32 characters are prerequisites before deploying these changes; existing legacy sessions will need reauthentication. Credentials supplied in chat or embedded in existing configuration need controlled rotation, not publication in this report. The local Git remote also contains an embedded credential; its value is not included in the change set or report.

The normal test configuration loads the live `.env.local`, and protected/shared database code contains production fallbacks. Therefore tests were run with explicit QA isolation configs, mocked persistence and a copied app with loopback-only service settings. `tests/unit/rfid-production-hardening.test.ts` was excluded from that isolated suite because it invokes protected persistence and contains outdated time-window assumptions incompatible with the freeze. It was not deleted or silently declared green.

Actual read request timings are in `api-readonly.json`, and bridge/provider timings in their evidence files. These are sequential observations, not load percentiles or a scalability claim. A final unrestricted production build hit host `spawn UNKNOWN` resource exhaustion. After stopping only the QA server and limiting worker count with `CIRCLE_NODE_TOTAL=2`, the same final source built successfully. Existing lint warnings remain: two walk-in hook dependencies, two notification-bell dependencies, one realtime-client dependency. No memory-leak or sustained-load acceptance was performed.

## I. Remaining defects and dependencies

| ID | Priority | Impact / state | Required resolution |
|---|---|---|---|
| R1 | P0 | Expense/maintenance/quote false success and restart loss; journal memory-only | Scoped exception for non-RFID repository work plus isolated staging; transactional writes and failure propagation |
| R2 | P0 | Unsafe production instant-login/auth behavior; local fixes only | Review configuration and corrections, rotate exposed/default credentials, controlled deployment and live regression |
| R3 | P0 | Anonymous RFID tap-history CRUD grants/policy | Explicitly approved protected-policy correction and role tests without disturbing hardware |
| R4 | P1 | Production fixture contamination distorts operations/reports | Remove production business seeds in frozen initialization/hydration path; preserve real configuration/data |
| R5 | P1 | Only one booking entry point has conflict guard; distributed atomicity unverified | Database transaction/constraint and concurrent multi-instance tests across all booking callers |
| R6 | P1 | Full payment/check-in/out/cloud persistence acceptance incomplete | Dedicated staging with sandbox payment webhook and safe booking/card fixtures |
| R7 | Acceptance dependency | Physical RFID lifecycle untested | Reception operator, designated card and door, preserved hardware protocol |
| R8 | P2 | OTA, offline/realtime reconciliation, staff persistence and uploads unverified | Finish listed matrix assertions with actual configured services |
| R9 | P2 | Default test setup can load production configuration | Establish a safe default test environment under project policy before normal broad test execution |
| R10 | P3 | Generic audit-page Event error, existing hook warnings, incomplete asset/browser coverage | Reproduce in stable staging; verify subscriptions/images and responsive/accessibility matrix |

## J. Build, deployment and rollback

TypeScript passed; lint passed with five existing warnings; 10 targeted and 41 existing isolated tests passed. Production build succeeded with one worker. Browser runs tested the actual local Next app at port 3006, an expressly authorized QA-only exception. Ports 3000/3001 belong to other projects and were left alone. Bridge ports and configuration were untouched.

No production deployment, database migration, schema cleanup or credential change was performed. Vercel environment configuration, deployment logs, backup restoration and production webhook acceptance were not verified. Git publication is a review handoff, not release acceptance. Source changes belong on a `codex/` review branch; do not promote while R1–R6 remain unresolved.

Reproducible software checks from the repository root:

```powershell
npx vitest run --config qa/vitest.config.mjs
npx vitest run --config qa/vitest-existing.config.mjs
npx tsc --noEmit
npm run lint
$env:CIRCLE_NODE_TOTAL='2'
npm run build
node qa/build-connection-matrix.cjs
node qa/finalize-checklist.cjs
```

Browser scripts require the isolated runtime prepared under `scratch/qa-runtime`, loopback service settings and the specified QA browser; they must never be pointed at production for write tests. Initial preparation generates credentials; the recorded run used a synthetic local credential only. No real account password is needed in test source.

Rollback: no live rollback is required because no live release/data mutation was made. Keep the review commit/evidence, revert that commit if local changes must be withdrawn, and leave protected RFID files intact. For an eventual release, record the previous deployment ID, verify a restorable backup before schema/data changes, deploy staging first, and use the prior Vercel deployment if runtime/auth checks fail. Do not “roll back” by reintroducing known insecure credentials.

## K. Final decision

**NOT READY — CRITICAL ISSUES REMAIN.**

The completed execution pass and local fixes provide evidence for review. They do not fulfill every requested button/form/workflow acceptance criterion. Unexecuted elements remain explicitly listed, and production readiness is blocked by the demonstrated persistence/security defects, unavailable separate staging database, frozen repository/persistence scope and missing physical operator.
