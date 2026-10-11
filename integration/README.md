# Integration Tests

Full-stack integration test suite for the AI-Clinic platform. These tests boot the **real NestJS server** (with Fastify), connect to a **real PostgreSQL database**, and exercise every API endpoint, WebSocket gateway, and guard the same way the browser does — with cookie-based sessions, CSRF tokens, and role enforcement.

Only third-party services are mocked (Botpress, OpenAI, Calendly, Email, WebPush). Everything else — database queries, authentication, authorization, validation, rate limiting — runs against the actual production code.

## Prerequisites

- **Node.js** 22+
- **PostgreSQL** running locally (or accessible via network), with a **throwaway** test database — the global setup
  drops and recreates the database named by `TEST_DATABASE_URL` on every run
- **Server built**: the test harness loads from `server/dist/`, so the server must be compiled first

```bash
cd server
npm run build
```

## Setup

1. **Create the test database** (if it doesn't exist):

```sql
CREATE DATABASE ai_clinic_test;
```

2. **Configure environment**: copy `.env.test.example` to `.env.test` and set your database URL:

```bash
cp .env.test.example .env.test
```

Edit `.env.test`:
```env
TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/ai_clinic_test
```

The remaining variables have sensible defaults. AI service keys are dummy values since those services are mocked.

3. **Install dependencies**:

```bash
cd client/integration
npm install
```

## Running

```bash
# From the integration directory
npx vitest run

# Or with an explicit database URL
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/ai_clinic_test" npx vitest run

# Watch mode (re-runs on file changes)
npx vitest

# Skip the rate-limit tests (they boot a second, production-mode app)
RUN_RATE_LIMIT_TESTS=false npx vitest run
```

The global setup automatically:
- Drops and recreates the test database
- Runs all Prisma migrations
- Seeds the superadmin account
- Boots the NestJS server on a random port
- Cleans up temp files on teardown

## Test Architecture

### How it works

- **One server instance** shared across all test files (booted once, reused)
- **Cookie jar per client** — each `createTestClient()` simulates an independent browser session
- **Real CSRF** — the test client captures the `csrf-token` cookie from responses and replays it as the `X-CSRF-Token` header on mutating requests, exactly like the frontend
- **Response envelope unwrapping** — the test client automatically extracts `contents` from the `{ status, message, contents }` envelope, so test assertions work on the actual data
- **Client code reused** — the `@client` alias points at `client/src`, so tests call the client's own `createXxxApi`
  factories and `socketTarget`
- **Sequential execution** — test files run in order (`00` → `17`) because later phases depend on data created by earlier ones
- **`validateStatus: () => true`** — axios never throws on HTTP errors; tests assert on `response.status` directly

### What's mocked (and why)

| Service | Mock | Reason |
|---------|------|--------|
| Botpress (AI chat) | `MockBotpressService` | External API, requires webhook credentials |
| OpenAI (SOAP generation) | `MockOpenAiService` | External API, pay-per-call |
| Calendly (scheduling) | `MockCalendlyService` | External API, OAuth-based |
| Email (nodemailer) | `MockEmailChannel` | No SMTP server in test; captures sent emails for assertion |
| WebPush | `MockWebPushChannel` | No push subscription in test; captures notifications |

### What's NOT mocked

- PostgreSQL database (real queries, constraints, indexes, cascades)
- Cookie-based session authentication (`@fastify/secure-session`)
- CSRF double-submit cookie guard
- Role-based authorization guards (CookieAuthGuard, RolesGuard, AdminGuard, SuperAdminGuard)
- Rate limiting (ThrottlerGuard)
- Input validation (ValidationPipe with `forbidNonWhitelisted`)
- WebSocket authentication (the session cookie, decoded with `@fastify/secure-session`)
- File upload handling (`@fastify/multipart`)
- Response compression, Helmet headers

## Test Suites

| # | File | Tests | Covers |
|---|------|-------|--------|
| 00 | `00-smoke.test.ts` | 4 | Server boot, health check, DB connectivity, Helmet headers |
| 01 | `01-auth-user.test.ts` | 29 | Registration, login, logout, session, profile CRUD, password change, avatar upload, CSRF cookies |
| 02 | `02-doctor.test.ts` | 18 | Doctor profile creation, update, document upload, public listing, validation |
| 03 | `03-admin.test.ts` | 45 | User management, verification, rejection and re-submission, ban/unban, deactivate, promote/demote, stats, self-protection |
| 04 | `04-patient.test.ts` | 7 | Patient profile, medical history, allergies, auth/validation guards |
| 05 | `05-scheduling.test.ts` | 34 | Availability, slot durations, exceptions, slots, appointments, double-booking, signed Calendly webhooks |
| 06 | `06-consultation.test.ts` | 19 | Full consultation lifecycle (create → decide → complete), doctor rejection, cancellation |
| 07 | `07-payment.test.ts` | 19 | Payment records, confirmation (direct, via consultation, by admin), filters, role/validation guards |
| 08 | `08-review.test.ts` | 14 | Doctor reviews, ratings, admin deletion, invalid rating validation |
| 09 | `09-chat.test.ts` | 52 | HTTP + WebSocket chat, HTTP sends broadcast, typing, read receipts, edit/delete, who may start a chat, grouped notifications for chats not open |
| 10 | `10-matching.test.ts` | 21 | Doctor-patient matching over WebSocket and REST, accept/reject/cancel |
| 11 | `11-ai-agents.test.ts` | 18 | Botpress conversations, OpenAI SOAP generation, AI triage |
| 12 | `12-notification.test.ts` | 13 | Email/WebPush notifications, pagination, push subscriptions, auth guards |
| 13 | `13-nurse.test.ts` | 28 | Nurse invitations, assignment, permissions and their enforcement, dashboard |
| 14 | `14-soap.test.ts` | 15 | SOAP note access control (incl. linked doctor/nurse), AI flow creation, auth guards |
| 15 | `15-file-upload.test.ts` | 30 | File upload, MIME validation, size limits, serving uploads, path traversal, banned owners |
| 16 | `16-security.test.ts` | 32 | CSRF, role enforcement, socket target behind an `/api` reverse proxy, forged cookies, ban/deactivation, input validation, rate limiting |
| 17 | `17-concurrent.test.ts` | 7 | Parallel reads, concurrent bookings, chat races, double-booking, profile races, match accept/cancel race |
| | **Total** | **405** | |

## File Structure

```
integration/
├── .env.test.example          # Environment template
├── .env.test                  # Local config (git-ignored)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── global-setup.ts        # DB reset + migrate + seed (runs once)
│   ├── global-teardown.ts     # Temp file cleanup (runs once)
│   ├── setup.ts               # Per-file: boots server if not running
│   ├── helpers/
│   │   ├── api-client.ts      # Axios + cookie jar + CSRF + envelope unwrap
│   │   ├── ws-client.ts       # Socket.IO test client (uses the client's socketTarget)
│   │   ├── prefix-proxy.ts    # /api reverse proxy mimicking the client's nginx.conf
│   │   ├── sse-client.ts      # SSE test client
│   │   ├── seed.ts            # Test data factories
│   │   ├── cleanup.ts         # DB truncation utilities
│   │   ├── server.ts          # NestJS app bootstrap + mock wiring
│   │   └── test-files.ts      # Dummy PNG/PDF/JPEG buffer generators
│   ├── mocks/
│   │   ├── mock-botpress.service.ts
│   │   ├── mock-openai.service.ts
│   │   ├── mock-calendly.service.ts
│   │   ├── mock-email.channel.ts
│   │   └── mock-webpush.channel.ts
│   └── tests/
│       ├── 00-smoke.test.ts
│       ├── ...
│       ├── 16-security.test.ts
│       └── 17-concurrent.test.ts
└── .tmp-uploads/              # Created at runtime, cleaned on teardown
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Real DB, not mocked | Tests actual SQL, constraints, indexes, cascades, transactions |
| Mock only third-party services | Tests our code exactly as deployed; only external dependencies are faked |
| Cookie jar per client | Simulates multiple browser sessions; tests session isolation |
| CSRF token capture/replay | Validates the actual double-submit cookie protection |
| Sequential test files | Later phases build on state created by earlier ones (users, doctors, etc.) |
| Random OS-assigned port | Avoids conflicts with a running dev server |
| Global DB reset per run | Clean slate every time; no stale data between runs |
| `validateStatus: () => true` | Tests assert status codes directly instead of catching exceptions |
