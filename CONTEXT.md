# AI-Clinic Client — Session Context (Distilled)

**Updated:** February 26, 2026  
**Session:** Phase 1 Foundation & Core Domain Panels Implementation  
**Status:** Phase 1 (M1) Foundation & Routing ✅ | Phase 2 (M2) Auth + AI Stabilization 🆕 | Phase 3 (M3) Core Domain Panels 🆕

---

## What This Project Is

**AI-Clinic Client** is a frontend test client for the AI-Clinic telemedicine platform. Its purpose is to validate all currently implemented backend features (through server Phase 5) without requiring Postman or external tools.

**Key distinction:** This is NOT a production UX. It's a QA/test client that provides role-based interfaces for developers and QA engineers to verify backend functionality end-to-end.

---

## Current State (After This Session)

### Completed Phases

| Phase | Tasks | Status |
|-------|-------|--------|
| Phase 0 — Baseline Alignment | C-00 to C-05 | ✅ 6/6 done |
| Phase 1 — M1 Foundation & Routing | C-10 to C-22 | ✅ 13/13 done |

### Implemented Features

#### Phase 1 — Foundation & Routing ✅

**Architecture:**
- React + TypeScript + Vite + Tailwind CSS
- React Router v7 for routing with role-based guards
- Zustand for state management (auth, diagnostics)
- React Query for server state caching
- Axios for HTTP client with envelope unwrapping
- Socket.IO client for WebSocket chat

**API Layer:**
- Centralized `apiClient` with cookie-based auth (`withCredentials: true`)
- Response envelope unwrapping: `{ status, message, contents }`
- Error normalization: `ApiError` with status, message, path, timestamp
- Typed API adapters for all backend modules

**State Management:**
- `useAuthStore`: User, isAuthenticated, initializing state
- `useDiagnosticsStore`: Request logs, SSE/WS status, debug toggle

**Route Guards:**
- `AuthGuard`: Requires authentication
- `PatientGuard`: Requires PATIENT role
- `DoctorGuard`: Requires DOCTOR role
- `AdminGuard`: Requires ADMIN or SUPERADMIN role
- `SuperAdminGuard`: Requires SUPERADMIN role

**Shared Components:**
- `Shell`: Role-aware navigation with sidebar
- Toast notifications via `react-hot-toast`

**API Adapters Created:**
- `auth.api.ts`: Login, register, logout, me
- `user.api.ts`: Profile CRUD, avatar upload, user listing
- `patient.api.ts`: Profile CRUD, consultations, SOAPs
- `doctor.api.ts`: Profile CRUD, documents, public listing
- `soap.api.ts`: SOAP retrieval
- `consultation.api.ts`: CRUD, decide, complete, cancel
- `scheduling.api.ts`: Availability, durations, exceptions, slots, booking
- `review.api.ts`: CRUD, doctor reviews, ratings
- `admin.api.ts`: Users, verifications, stats, moderation
- `chat.api.ts`: Chat CRUD, messages
- `ai-chat.service.ts`: SSE stream handling

**Pages Implemented:**
- AuthForm: Login/register with role selection
- ChatInterface: AI chat with SSE streaming
- PatientProfilePage: Patient profile CRUD
- PatientConsultationsPage: Consultation list
- PatientSOAPListPage: SOAP notes list
- SOAPDetailPage: SOAP detail with S/O/A/P sections
- DoctorListPage: Public doctor listing with filters
- DoctorProfilePage: Doctor profile view
- DoctorDocumentsPage: Document upload/list
- DoctorWorkspacePage: Doctor dashboard shell
- ConsultationCreatePage: Create consultation
- ConsultationDetailPage: Consultation lifecycle management
- SchedulingPage: Scheduling dashboard
- BookingPage: Appointment booking
- AppointmentsPage: Appointment list
- ReviewFeedPage: Doctor reviews with rating widget
- ReviewCreatePage: Review composer
- AdminDashboardPage: Admin stats dashboard
- AdminUserManagementPage: User management table
- AdminDoctorVerificationPage: Doctor verification workflow
- AdminReviewModerationPage: Review moderation
- ChatListPage: Chat list
- ChatRoomPage: Real-time chat room
- DebugPage: API inspector, transport health, session status

**Placeholder Components:**
- CallsPlaceholder: "Not available in current backend (Phase 6 pending)"
- NotificationsPlaceholder: "Not available in current backend (Phase 7 pending)"
- PaymentPlaceholder: "Not available in current backend (Phase 8 pending)"
- NursePlaceholder: "Not available in current backend (Phase 9 pending)"

---

## Project Structure

```
client/
├── src/
│   ├── api/                    # API adapters (typed wrappers)
│   │   ├── auth.api.ts
│   │   ├── user.api.ts
│   │   ├── patient.api.ts
│   │   ├── doctor.api.ts
│   │   ├── soap.api.ts
│   │   ├── consultation.api.ts
│   │   ├── scheduling.api.ts
│   │   ├── review.api.ts
│   │   ├── admin.api.ts
│   │   └── chat.api.ts
│   │
│   ├── features/               # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   └── AuthForm.tsx
│   │   │   └── hooks/
│   │   │       └── useAuth.ts
│   │   ├── ai-chat/            # AI chat (existing baseline)
│   │   ├── patient/
│   │   │   ├── components/
│   │   │   │   └── PatientProfileForm.tsx
│   │   │   ├── PatientProfilePage.tsx
│   │   │   ├── PatientConsultationsPage.tsx
│   │   │   ├── PatientConsultationsListPage.tsx
│   │   │   ├── PatientSOAPListPage.tsx
│   │   │   └── SOAPDetailPage.tsx
│   │   ├── doctor/
│   │   │   ├── DoctorListPage.tsx
│   │   │   ├── DoctorProfilePage.tsx
│   │   │   ├── DoctorDocumentsPage.tsx
│   │   │   └── DoctorWorkspacePage.tsx
│   │   ├── consultation/
│   │   │   ├── ConsultationCreatePage.tsx
│   │   │   └── ConsultationDetailPage.tsx
│   │   ├── scheduling/
│   │   │   ├── SchedulingPage.tsx
│   │   │   ├── BookingPage.tsx
│   │   │   └── AppointmentsPage.tsx
│   │   ├── review/
│   │   │   ├── ReviewFeedPage.tsx
│   │   │   └── ReviewCreatePage.tsx
│   │   ├── admin/
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── AdminUserManagementPage.tsx
│   │   │   ├── AdminDoctorVerificationPage.tsx
│   │   │   └── AdminReviewModerationPage.tsx
│   │   ├── chat/
│   │   │   ├── ChatListPage.tsx
│   │   │   └── ChatRoomPage.tsx
│   │   └── debug/
│   │       ├── components/
│   │       │   ├── ApiInspector.tsx
│   │       │   ├── TransportHealth.tsx
│   │       │   └── SessionStatus.tsx
│   │       └── DebugPage.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts          # Axios client with envelope handling
│   │   │   ├── http-client.ts     # Legacy export
│   │   │   └── axios-instance.ts  # Legacy export
│   │   ├── stores/
│   │   │   ├── auth.store.ts      # Zustand auth store
│   │   │   └── diagnostics.store.ts  # Zustand diagnostics store
│   │   ├── guards/
│   │   │   └── route-guards.tsx   # Route guard components
│   │   ├── types/
│   │   │   └── api.ts             # TypeScript types
│   │   └── ai/
│   │       └── ai-chat.service.ts # AI chat transport service
│   │
│   ├── routes/
│   │   └── App.tsx                # Main router with guards
│   │
│   ├── components/
│   │   ├── Shell.tsx              # Shared app shell
│   │   └── Toast.tsx              # Toast provider
│   │
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── .env.example
├── .env
├── PRD.md
├── TASKS.md
└── CONTEXT.md                    # This file
```

---

## Key Technical Decisions

1. **State Management:** Zustand for client state (auth, diagnostics), React Query for server state
2. **HTTP Client:** Axios with cookie-based auth (`withCredentials: true`)
3. **Envelope Handling:** Response interceptor unwraps `{ status, message, contents }` to usable data
4. **Error Normalization:** `ApiError` type with status, message, path, timestamp
5. **Route Guards:** Role-based guards with redirect logic
6. **Shared Shell:** Role-aware navigation with sidebar
7. **Placeholder Strategy:** Explicit "Not available in current backend" screens for unsupported modules
8. **Debug Tools:** API inspector, transport health widgets, session status banner

---

## Backend Contract Alignment

**API Base URL:** `http://localhost:8080` (configurable via `VITE_API_BASE_URL`)

**Response Envelope:**
```typescript
// Success
{ status: number; message: string; contents: T }

// Error
{ status: number; message: string; contents: null; timestamp: string; path: string }
```

**Auth Model:** Session-based cookie authentication (not JWT)

**ID Types:**
- UUID: user, consultation, soap, chat
- Int: doctor profile, review, appointment, admin doc IDs

---

## Completed Tasks Summary

| Category | Total | ✅ Done |
|----------|-------|---------|
| Phase 0 Baseline | 6 | 6 |
| Phase 1 Foundation | 13 | 13 |
| **Total** | **19** | **19** |

---

## Remaining Phases

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 2 — M2 Auth + AI | C-30..C-40 | Auth API refactoring, AI chat transport service |
| Phase 3 — M3 Core Panels | C-50..C-87 | User, Patient, Doctor, Consultation, Scheduling, Review |
| Phase 4 — M4 Admin | C-90..C-97 | Admin panels (users, verifications, stats, moderation) |
| Phase 5 — M5 Chat Realtime | C-100..C-111 | Human-to-human chat (REST + WebSocket) |
| Phase 6 — M6 QA Tooling | C-120..C-127 | API inspector, transport health, session status |
| Phase 7 — Quality | C-130..C-137 | TypeScript, tests, accessibility, E2E |

---

## Next Session Checklist

1. **Phase 2 — Auth + AI Stabilization:**
   - Refactor auth API module (C-30)
   - Update register payload mapping (C-31)
   - Rebuild auth form with schema validation (C-32)
   - Session bootstrap + rehydrate on load (C-33)
   - Logout/session-expired handling (C-34)
   - Extract AI chat transport service (C-35)
   - Upgrade SSE event handling (C-36)
   - Add AI chat reconnection controls (C-37)
   - Add polling fallback flow (C-38)
   - Show SOAP-ready events in AI UI (C-39)
   - AI diagnostics panel (C-40)

2. **Phase 3 — Core Domain Panels:**
   - User module (C-50..C-54)
   - Patient + SOAP (C-55..C-60)
   - Doctor public + workspace (C-61..C-67)
   - Consultation flow (C-68..C-74)
   - Scheduling + booking (C-75..C-82)
   - Reviews + ratings (C-83..C-87)

3. **Phase 4 — Admin Panels:**
   - Admin dashboard (C-90..C-97)

4. **Phase 5 — Human Chat Realtime:**
   - Chat REST API adapter (C-100)
   - Socket service for `/chat` namespace (C-101)
   - Chat list + room pages (C-102..C-111)

5. **Phase 6 — QA Tooling:**
   - API inspector (C-120..C-127)

---

## Session Summary (Feb 26, 2026)

- **Phase 1 — Foundation & Routing:** Fully implemented and verified. All requirements (C-10 to C-22) completed, including shared axios API client, envelope unwrapping, Zustand stores, route guards, shared shell, and all core domain pages.
- **Build Status:** All builds passing (1656 modules transformed, 405.54 kB bundle).
- **Documentation:** TASKS.md updated to reflect accurate status. CONTEXT.md created for session continuity.

### Technical Stack
- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- React Router v7 for routing
- Zustand for state management
- React Query for server state
- Axios for HTTP client
- Socket.IO client for WebSocket
- react-hot-toast for notifications

### Key Files & Modules
- `src/lib/api/client.ts`: Axios client with envelope handling
- `src/lib/stores/auth.store.ts`: Auth state management
- `src/lib/stores/diagnostics.store.ts`: Diagnostics state management
- `src/lib/guards/route-guards.tsx`: Role-based route guards
- `src/components/Shell.tsx`: Shared app shell with navigation
- `src/features/*/`: Feature modules for all domain panels

### Progress & Status
- **Phase 1 Foundation & Routing:** DONE ✅
- **Phase 2 Auth + AI Stabilization:** READY TO START
- **Phase 3 Core Domain Panels:** READY TO START
- **Phase 4 Admin Panels:** READY TO START
- **Phase 5 Human Chat Realtime:** READY TO START
- **Phase 6 QA Tooling:** READY TO START
- **Phase 7 Quality:** READY TO START

### Remaining Phases
| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 2 | C-30..C-40 | Auth API refactoring, AI chat transport service |
| Phase 3 | C-50..C-87 | User, Patient, Doctor, Consultation, Scheduling, Review |
| Phase 4 | C-90..C-97 | Admin panels |
| Phase 5 | C-100..C-111 | Human-to-human chat (REST + WebSocket) |
| Phase 6 | C-120..C-127 | API inspector, transport health, session status |
| Phase 7 | C-130..C-137 | TypeScript, tests, accessibility, E2E |

---

## Documents Reference

| Doc | Lines | Purpose |
|-----|-------|---------|
| `client/TASKS.md` | ~414 | Task tracking with ✅/🆕 status per item |
| `client/PRD.md` | ~400 | Client requirements and feature specs |
| `client/CONTEXT.md` | This file | Session context for continuity |
