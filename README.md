# AI-Clinic Client

Frontend test client for the AI-Clinic telemedicine platform.

## Purpose

This is a sample/QA client for the AI-Clinic NestJS server (`../server`, a separate repo). It provides role-based
interfaces for developers and QA engineers to exercise the server end-to-end without Postman or external tools, and it
hosts the full-stack integration test suite (`integration/`).

**Note:** This is NOT a production UX. The server is the product; this client is a replaceable sample.

## Quick Start

### Prerequisites

- Node.js 20+ (the Docker build uses Node 22)
- pnpm, at the version pinned in `package.json` (`packageManager`; `corepack enable` picks it up). npm also works.
- Backend server running on `http://localhost:8080`, with `CORS_ORIGIN` including the client origin
  (the server defaults to `http://localhost:5173`)

### Installation

```bash
cd client
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The dev server also proxies `/api` (HTTP and WebSocket) to
`http://localhost:8080` with the prefix stripped.

### Build

```bash
pnpm build
pnpm preview  # Preview production build
```

### Linting

```bash
pnpm lint        # Check for issues
pnpm lint:fix    # Auto-fix issues
```

### Type Checking

```bash
pnpm type-check  # TypeScript validation
```

### Testing

```bash
pnpm test              # Unit tests (watch mode)
pnpm vitest run        # Unit tests, single run
pnpm test:ui           # Run tests with UI
pnpm test:coverage     # Run with coverage
```

### Docker

```bash
docker build -t ai-clinic-client .   # optional: --build-arg VITE_API_BASE_URL=... --build-arg VITE_WS_URL=...
```

The image serves the build with nginx on port 80. `nginx.conf` proxies `/api/` to `http://server:8080/` (prefix
stripped, WebSocket upgrades included), so the server must be reachable as `server:8080`, e.g. a Compose service
named `server`.

## Environment Variables

Create a `.env` file in the `client/` directory (see `.env.example`):

```bash
VITE_API_BASE_URL=http://localhost:8080
# Optional: where the WebSocket server is, if not at VITE_API_BASE_URL
# VITE_WS_URL=http://localhost:8080
```

Both are read at build time. A path prefix works for either (e.g. `/api`): sockets then connect with the
socket.io path `/api/socket.io`. The Docker build takes both as build args (`VITE_API_BASE_URL` defaults to `/api`,
which `nginx.conf` proxies to the server).

## Project Status

**Coverage:** the server's modules through phase 16 — auth, users, patients, doctors, SOAP, consultations,
scheduling, reviews, admin, human chat, AI chat, matching, notifications, nurses (incl. invitations) and file uploads.
Payment exists only at the API layer (no UI yet).
**Unit tests:** 285 (Vitest)
**Integration tests:** 405 in 18 files (real server + PostgreSQL)

The original February 2026 plan (`docs/TASKS.md`, 104 tasks) was completed; later work went beyond it.

## Features

### Implemented

- ✅ Session-based authentication (cookie + CSRF header)
- ✅ AI chat with SSE streaming (polling fallback), conversation history, SOAP-ready banner
- ✅ Patient profile management, consultations, SOAP notes
- ✅ Doctor panel: dashboard, appointments, consultations, scheduling, documents, profile (re-submit after rejection)
- ✅ Nurse management for doctors (invite, permissions, remove)
- ✅ Nurse panel (dashboard, appointments, chat, consultations, SOAP notes, schedule — per permission)
- ✅ Nurse invitations page (accept/decline)
- ✅ Doctor–patient matching (request, live waiting page, doctor accept/reject)
- ✅ Consultation workflow (create, decide, complete, cancel)
- ✅ Scheduling & booking
- ✅ Reviews & ratings
- ✅ Admin panels (stats, users, verifications, reviews, consultations, appointments)
- ✅ Notifications (list, unread bell, mark read)
- ✅ Human-to-human chat (REST + WebSocket): realtime messages, typing indicators, read receipts, edit/delete, presence
- ✅ Avatar and document uploads
- ✅ Theme customizer (light/dark/system, accent colour)
- ✅ Unit tests and full-stack integration tests

### Not Implemented

- ⏳ Calls & WebRTC (`/calls` placeholder — server phase 19 pending)
- ⏳ Payment UI (`/payment` placeholder — provider TBD; `src/api/payment.api.ts` exists)

## Architecture

### Tech Stack

- **React 18** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v7** for routing (lazy-loaded pages)
- **Zustand** for state management
- **React Query** for server state
- **Axios** for HTTP client
- **Socket.IO** for WebSocket (chat and matching namespaces)
- **Lucide React** for icons
- **Vitest** + Testing Library for tests

### Project Structure

```
client/
├── src/
│   ├── api/              # API modules (createXxxApi factories, bound in index.ts)
│   ├── components/       # Shell, ErrorBoundary, Toast, ProfileModal, ThemeCustomizer
│   ├── features/         # Feature modules
│   │   ├── admin/        # Admin panels
│   │   ├── ai-chat/      # AI chat
│   │   ├── auth/         # Authentication
│   │   ├── chat/         # Human chat
│   │   ├── consultation/ # Consultations
│   │   ├── dashboard/    # Main dashboard
│   │   ├── doctor/       # Doctor panel
│   │   ├── matching/     # Doctor–patient matching
│   │   ├── notification/ # Notifications
│   │   ├── nurse/        # Nurse panel + invitations
│   │   ├── patient/      # Patient features
│   │   ├── review/       # Reviews
│   │   └── scheduling/   # Scheduling
│   ├── lib/
│   │   ├── ai/           # AI chat service
│   │   ├── api/          # HTTP client
│   │   ├── guards/       # Route guards
│   │   ├── socket/       # Chat + matching socket services
│   │   ├── stores/       # Zustand stores
│   │   └── types/        # TypeScript types
│   ├── routes/           # App router
│   └── main.tsx          # Entry point
├── integration/          # Full-stack integration tests (own package.json)
├── Dockerfile
└── nginx.conf
```

## Key Concepts

### Authentication

Session-based cookie authentication (not JWT). The backend sets an HttpOnly session cookie that's sent with all
requests (`withCredentials: true`). Mutating requests also send the `csrf-token` cookie back as `X-CSRF-Token`.

### Response Envelope

All API responses follow this structure:

```typescript
{
  status: number;
  message: string;
  contents: T;  // Actual data
}
```

The HTTP client automatically unwraps the envelope, so you receive `contents` directly.

### Route Guards

- `AuthGuard` - Requires authentication (and an active, non-banned account)
- `PatientGuard` - Requires PATIENT role
- `DoctorGuard` - Requires DOCTOR role
- `NurseGuard` - Requires NURSE role
- `AdminGuard` - Requires admin or superadmin privileges
- `SuperAdminGuard` - Requires superadmin privileges (not used by any route)

### State Management

- **Auth State:** `useAuthStore` from `src/lib/stores/auth.store`
- **Theme:** `useThemeStore` from `src/lib/stores/theme.store`
- **Diagnostics:** `useDiagnosticsStore` from `src/lib/stores/diagnostics.store`
- **Server State:** React Query for caching and synchronization

### WebSocket

Socket.IO clients for real-time features:

- `/chat` namespace: messaging, typing indicators, read receipts, edit/delete, presence. Open chats are re-joined
  automatically on every (re)connect.
- `/matching` namespace: match requests and their outcome

## Testing

### Manual Testing

1. Start backend: `cd server && npm run start:dev`
2. Start frontend: `cd client && pnpm dev`
3. Register accounts at `/auth` and walk through the role panels
4. For chat, follow [docs/CHAT_TESTING_GUIDE.md](docs/CHAT_TESTING_GUIDE.md)

### Automated Testing

```bash
# Unit tests (single run)
pnpm vitest run

# Run specific test
pnpm vitest run src/api/__tests__/auth.api.test.ts

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

Integration tests live in `integration/` (see [integration/README.md](integration/README.md)). They need a built
server (`cd ../server && npm run build`) and a **throwaway** PostgreSQL database: the global setup drops and recreates
the database named by `TEST_DATABASE_URL`.

```bash
cd integration
cp .env.test.example .env.test   # set TEST_DATABASE_URL
npm install
npx vitest run
```

### Test Accounts

There are no pre-seeded test users besides the superadmin:

- Register patients and doctors at `/auth`.
- The server seed creates a superadmin from `SUPERUSER_EMAIL` / `SUPERUSER_PASSWORD` (server env; defaults
  `admin@ai-clinic.com` / `SuperAdmin123!`). A superadmin can promote users to admin at `/admin/users`.
- Doctors need admin verification (`/admin/verifications`) before patients can book or match with them.
- Nurses: a doctor invites a user at `/doctor/nurses`; the invitee accepts at `/invitations`.

## Common Issues

### Build Fails

```bash
# Check for TypeScript errors
pnpm type-check
pnpm build
```

### WebSocket Not Connecting

1. Verify backend is running
2. Check the socket.io connection in the browser dev tools (Network → WS)
3. Verify `VITE_API_BASE_URL` (or `VITE_WS_URL`, if set) is correct; behind a prefix the socket path must be
   `<prefix>/socket.io` and the proxy must forward WebSocket upgrades

### Requests Fail with 401/403 Cross-Origin

1. Check the server's `CORS_ORIGIN` includes the client origin
2. Check the session and `csrf-token` cookies are being set

## Documentation

- [docs/README.md](docs/README.md) - Index: which docs are current and which are historical
- [docs/CONTEXT.md](docs/CONTEXT.md) - Current project context (routes, API modules, sockets, tests, Docker)
- [docs/CHAT_TESTING_GUIDE.md](docs/CHAT_TESTING_GUIDE.md) - Chat testing guide
- [docs/OUT_OF_SCOPE_PLACEHOLDER.md](docs/OUT_OF_SCOPE_PLACEHOLDER.md) - Remaining placeholder routes
- [integration/README.md](integration/README.md) - Integration test suite
- `docs/PRD.md`, `docs/TASKS.md` - Original February 2026 plan (completed)

## Contributing

This is a test client for backend validation. When adding features:

1. Follow existing patterns
2. Use TypeScript strictly
3. Add loading states
4. Handle errors with toast notifications
5. Make it mobile responsive
6. Add tests and update documentation

## License

Private project - AI-Clinic

## Support

For issues or questions, refer to the documentation in `docs/`.

---

**Last Updated:** October 11, 2026
**Status:** Sample/QA client covering server modules through phase 16
