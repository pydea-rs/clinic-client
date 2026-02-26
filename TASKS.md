# AI-Clinic Client — Implementation Tasks

**Generated:** February 26, 2026  
**Source:** [PRD.md](PRD.md)  
**Purpose:** Build a frontend test client that validates all currently implemented backend features (through server Phase 5).

**Legend:**
- ✅ = Already done
- 🔧 = Partially done; needs updates
- 🆕 = Not implemented

---

## Phase 0 — Baseline Alignment

> Confirm current state and lock constraints before implementation.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-00 | Rename `chat-client` to `client` | ✅ | — | Folder already present as `client/` in this workspace. |
| C-01 | Audit existing client capabilities | ✅ | — | Existing baseline includes auth + AI chat + SSE stream handling. |
| C-02 | Align scope to completed backend phases only | ✅ | — | Include server features through B-70; exclude calls/notifications/payment/nurse. |
| C-03 | Create client PRD | ✅ | C-01 | `client/PRD.md` created and aligned to backend current state. |
| C-04 | Create client task list from PRD | ✅ | C-03 | This file (`client/TASKS.md`). |
| C-05 | Define out-of-scope placeholder strategy | ✅ | C-02 | Implemented placeholder components for calls/notifications/payment/nurse modules. |

**Phase 0 Status: ✅ 6/6 COMPLETE**

---

## Phase 1 — M1 Foundation & Routing

> Establish architecture, shared infrastructure, and route shell.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-10 | Install core frontend deps | ✅ | C-01 | Add `react-router-dom`, `@tanstack/react-query`, `zustand`, `socket.io-client`, `react-hook-form`, `zod`. |
| C-11 | Reorganize folder structure by domain | ✅ | C-10 | Add `api/`, `routes/`, `features/`, `stores/`, `lib/`, `components/`, `styles/`. |
| C-12 | Build shared axios API client | ✅ | C-10 | `withCredentials: true`, base URL via env, timeout, typed methods. |
| C-13 | Add envelope unwrapping interceptor | ✅ | C-12 | Normalize `{ status, message, contents }` to usable client data. |
| C-14 | Add normalized error model | ✅ | C-12 | Parse backend error envelope (`status`, `message`, `path`, `timestamp`). |
| C-15 | Introduce React Query provider + defaults | ✅ | C-10 | Caching, retries, stale time, global error hooks. |
| C-16 | Create auth/session Zustand store | ✅ | C-10 | Current user, role flags, auth state, session bootstrap state. |
| C-17 | Create diagnostics store | ✅ | C-12 | Request log events, SSE/WS status, debug toggle. |
| C-18 | Implement app router + route groups | ✅ | C-11 | Public/patient/doctor/admin/chat/debug route trees. |
| C-19 | Implement route guards by role | ✅ | C-16 | `AuthGuard`, `PatientGuard`, `DoctorGuard`, `AdminGuard`, `SuperAdminGuard` behavior. |
| C-20 | Build shared app shell + role-aware nav | ✅ | C-18 | Top nav + sidebar + quick role context switch indicators. |
| C-21 | Apply visual system + tokens | ✅ | C-20 | Typography, color tokens, spacing, status badges, animation primitives. |
| C-22 | Mobile responsive layout pass (foundation) | ✅ | C-20 | Validate shell and primary nav on common breakpoints. |

**Phase 1 Status: ✅ 13/13 COMPLETE**

---

## Phase 2 — M2 Auth + AI Stabilization

> Keep AI chat baseline; update contracts and reliability.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-30 | Refactor auth API module | ✅ | C-12 | Implement typed wrappers for `/auth/login`, `/auth/register`, `/auth/logout`, `/user`. |
| C-31 | Update register payload mapping | ✅ | C-30 | Use `firstname`, `lastname`, `email`, `password`, optional `role` (PATIENT/DOCTOR). |
| C-32 | Rebuild auth form with schema validation | ✅ | C-30 | Use React Hook Form + Zod; map backend validation errors cleanly. |
| C-33 | Session bootstrap + rehydrate on load | ✅ | C-16 | `GET /user` on app start, role-aware redirect and guard readiness. |
| C-34 | Logout/session-expired handling | ✅ | C-33 | Clear store, redirect, show controlled toast/state. |
| C-35 | Extract AI chat transport service | ✅ | C-12 | Centralize `start`, `send`, `messages`, `stream` contract handling. |
| C-36 | Upgrade SSE event handling | ✅ | C-35 | Support `connected`, `message_created`, `message_updated`, `soap_ready`, `error`. |
| C-37 | Add AI chat reconnection controls | ✅ | C-36 | Manual reconnect + backoff state visibility + retry count. |
| C-38 | Add polling fallback flow | ✅ | C-35 | Use `/ai-agents/messages/:conversationId` when SSE unavailable. |
| C-39 | Show SOAP-ready events in AI UI | ✅ | C-36 | Display SOAP generated event with `soapId` + action link. |
| C-40 | AI diagnostics panel | ✅ | C-37 | Event timeline, raw payload preview, stream status. |

**Phase 2 Status: ✅ 11/11 COMPLETE**

---

## Phase 3 — M3 Core Domain Panels

> Implement all currently supported non-admin business modules.

### 3A — User Module

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-50 | Create user API adapter | 🆕 | C-12 | `/user`, `/user/profile`, `/user/avatar`, `/user/:id`, `/user/all`. |
| C-51 | Build "My Profile" editor | 🆕 | C-50 | `PATCH /user/profile` form with optimistic UI and error mapping. |
| C-52 | Build avatar uploader | 🆕 | C-50 | Multipart upload to `/user/avatar` with type/size hints. |
| C-53 | Build user detail viewer | 🆕 | C-50 | `GET /user/:id` page with role-aware metadata display. |
| C-54 | Build admin-only users quick list | 🆕 | C-50 | Light table for `/user/all` inside user tools/admin context. |

### 3B — Patient + SOAP

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-55 | Create patient API adapter | 🆕 | C-12 | `/patient/profile`, `/patient/consultations`, `/patient/soaps`. |
| C-56 | Build patient profile CRUD UI | 🆕 | C-55 | Create/update/get profile forms for patient role. |
| C-57 | Build array-field medical editor | 🆕 | C-56 | Reusable chips/list editor for history/allergies/medications/surgeries/familyHistory. |
| C-58 | Build patient consultations list view | 🆕 | C-55 | Paginated list with status filter and quick actions. |
| C-59 | Build patient SOAP list view | 🆕 | C-55 | Paginated list with generated date and conversation links. |
| C-60 | Build SOAP detail renderer | 🆕 | C-59 | Render subjective/objective/assessment/plan/triage/specialty/raw note. |

### 3C — Doctor Public + Doctor Workspace

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-61 | Create doctor API adapter | 🆕 | C-12 | `/doctor`, `/doctor/:id`, `/doctor/:id/rating`, `/doctor/documents`. |
| C-62 | Build doctor profile create/update forms | 🆕 | C-61 | Support specialty, secondaries, startedAt, visit methods/types, bio, clinic location. |
| C-63 | Build public doctor list page | 🆕 | C-61 | Filters: specialty, visit method, location, search; pagination support. |
| C-64 | Build public doctor profile page | 🆕 | C-61 | Profile details + rating card + reviews integration hook. |
| C-65 | Build doctor documents upload tool | 🆕 | C-61 | Multipart file upload with `DocumentTypeEnum` selector. |
| C-66 | Build doctor documents list tool | 🆕 | C-61 | Status, reviewedAt/by, rejection reason surface. |
| C-67 | Build doctor workspace shell | 🆕 | C-20 | Route cluster for profile/documents/consultations/scheduling/chat. |

### 3D — Consultation Flow

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-68 | Create consultation API adapter | 🆕 | C-12 | `/consultation` endpoints including decide/complete/cancel. |
| C-69 | Build consultation create flow | 🆕 | C-68 | Patient creates consultation (doctor + optional soap). |
| C-70 | Build consultation list view | 🆕 | C-68 | Role-aware list (patient/doctor/admin behavior from backend). |
| C-71 | Build consultation detail page | 🆕 | C-68 | Timeline, status, linked entities (doctor/patient/soap/appointment). |
| C-72 | Build doctor decision action panel | 🆕 | C-71 | `doctorDecision` + `visitMethod` form for `/decide`. |
| C-73 | Build consultation completion panel | 🆕 | C-71 | notes + summary + followUpNeeded for `/complete`. |
| C-74 | Build cancellation action flow | 🆕 | C-71 | `/cancel` action with role-safe UI and state refresh. |

### 3E — Scheduling + Booking

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-75 | Create scheduling API adapter | 🆕 | C-12 | Availability, durations, exceptions, slots, booking, appointments. |
| C-76 | Build availability CRUD panel | 🆕 | C-75 | Doctor weekly schedule editor with day/time validation. |
| C-77 | Build slot durations panel | 🆕 | C-75 | Minutes + price + label + active toggle. |
| C-78 | Build exceptions panel | 🆕 | C-75 | Full-day block and partial override management. |
| C-79 | Build public slot explorer | 🆕 | C-75 | `/doctor/:doctorId/slots` date-range search + duration filters. |
| C-80 | Build booking workflow | 🆕 | C-79 | Select slot + method + duration + price and submit `/scheduling/book`. |
| C-81 | Build appointments list view | 🆕 | C-75 | Unified role-aware list from `/scheduling/appointments`. |
| C-82 | Build appointment detail + cancel | 🆕 | C-81 | `/appointments/:id` and `/appointments/:id/cancel`. |

### 3F — Reviews + Ratings

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-83 | Create review API adapter | 🆕 | C-12 | `/review` CRUD + doctor reviews/rating. |
| C-84 | Build review create/update/delete panel | 🆕 | C-83 | Patient-only review composer and editor. |
| C-85 | Build doctor review feed | 🆕 | C-83 | Public paginated list for `/review/doctor/:doctorId`. |
| C-86 | Build rating aggregate widget | 🆕 | C-83 | Average + total + 1-5 star distribution visualization. |
| C-87 | Integrate rating/review into doctor pages | 🆕 | C-64, C-85 | Show live aggregate and reviews on profile pages. |

---

## Phase 4 — M4 Admin Panels

> Build admin and superadmin validation surfaces.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-90 | Create admin API adapter | 🆕 | C-12 | Users, doctor verification, promotions, moderation, stats endpoints. |
| C-91 | Build admin dashboard stats | 🆕 | C-90 | Cards from `/admin/stats`. |
| C-92 | Build user management table | 🆕 | C-90 | `/admin/users` filters + edit + deactivate actions. |
| C-93 | Build pending doctor verification list | 🆕 | C-90 | `/admin/doctors/pending` list + drill-in actions. |
| C-94 | Build doctor documents review page | 🆕 | C-90 | `/admin/doctors/:id/documents` with file preview links. |
| C-95 | Build verify/reject workflow UI | 🆕 | C-94 | `/admin/doctors/:id/verify` with required reason when rejected. |
| C-96 | Build superadmin promote/demote UI | 🆕 | C-92 | `/admin/users/:id/promote` and `/demote` with role checks. |
| C-97 | Build admin review moderation action | 🆕 | C-90 | `DELETE /admin/reviews/:id` tool from moderation screen. |

---

## Phase 5 — M5 Human-to-Human Chat (REST + WS)

> Implement full chat testing surface for current server support.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-100 | Create chat REST API adapter | 🆕 | C-12 | `/chat`, `/chat/:id`, `/chat/:id/messages`, `/chat/:id/message`. |
| C-101 | Create socket service for `/chat` namespace | 🆕 | C-10 | Cookie-based Socket.IO client connection and lifecycle management. |
| C-102 | Build chat list page | 🆕 | C-100 | Show participants, unread count, last message, online status. |
| C-103 | Build chat create workflow | 🆕 | C-100 | Create/reopen chat with `participantId` (+ optional topic/consultationId). |
| C-104 | Build chat room message history | 🆕 | C-102 | Paginated history with day grouping and sender metadata. |
| C-105 | Implement realtime send/receive | 🆕 | C-101, C-104 | `chat:message` emit + `chat:message` listener sync with REST cache. |
| C-106 | Implement typing indicators | 🆕 | C-101, C-104 | `chat:typing` outbound and inbound state rendering. |
| C-107 | Implement read receipts | 🆕 | C-101, C-104 | `chat:read` flows and visual read markers. |
| C-108 | Implement message edit/delete | 🆕 | C-101, C-104 | `chat:edit`, `chat:delete`, and `chat:edited`/`chat:deleted` handling. |
| C-109 | Implement explicit join/leave room behavior | 🆕 | C-101, C-104 | `chat:join` on room open, `chat:leave` on unmount/switch. |
| C-110 | Implement presence event UI | 🆕 | C-101, C-102 | `user:online` state per participant across open chats. |
| C-111 | Add WS transport debug panel | 🆕 | C-101 | Connection state, reconnect attempts, emitted/received payload logs. |

---

## Phase 6 — M6 QA Tooling & Validation Surface

> Add explicit QA affordances for repeatable backend verification.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-120 | Build API request inspector | 🆕 | C-17 | Show method/url/headers/payload/status/latency per request. |
| C-121 | Add response viewer modes | 🆕 | C-120 | Toggle raw envelope vs unwrapped `contents`. |
| C-122 | Add copy JSON controls | 🆕 | C-120 | Copy request/response payloads for bug reports. |
| C-123 | Build session status banner | 🆕 | C-16 | Show user id, role, auth state, and permission summary. |
| C-124 | Build transport health widgets | 🆕 | C-17 | SSE state, WS state, retry status, last event timestamps. |
| C-125 | Add unsupported-module placeholders | 🆕 | C-05 | Calls/notifications/payment/nurse explicitly marked unavailable. |
| C-126 | Build role-based manual test checklist page | 🆕 | C-120 | In-app checklist for patient/doctor/admin/superadmin scenarios. |
| C-127 | Add seed account quick-switch helper (client-only) | 🆕 | C-123 | Optional dev utility to speed local multi-role testing. |

---

## Phase 7 — Quality, Accessibility, and Release Readiness

> Stabilize and verify before handoff.

| # | Task | Status | Depends On | Details |
|---|------|--------|------------|---------|
| C-130 | Add strict TypeScript + lint gates | 🆕 | C-11 | Ensure clean build, type safety, and lint compliance. |
| C-131 | Add unit tests for API adapters | 🆕 | C-12 | Envelope parsing, error normalization, payload mapping. |
| C-132 | Add component tests for auth + AI chat | 🆕 | C-32, C-36 | Validate form logic, SSE rendering, reconnect behavior. |
| C-133 | Add integration tests for route guards | 🆕 | C-19 | Role-based navigation and unauthorized redirects. |
| C-134 | Add E2E smoke tests (critical flows) | 🆕 | C-80, C-105 | Auth, AI chat, consultation create/decide, scheduling, admin verify. |
| C-135 | Responsive QA pass (desktop + mobile) | 🆕 | C-22 | Validate all primary pages and panels across breakpoints. |
| C-136 | Accessibility QA pass | 🆕 | C-22 | Keyboard flow, contrast, focus states, reduced motion behavior. |
| C-137 | Final regression pass vs acceptance criteria | 🆕 | C-126 | Validate all PRD acceptance criteria before sign-off. |

---

## Milestone Mapping

| Milestone | Mapped Tasks |
|-----------|--------------|
| M1 Foundation & Routing | C-10..C-22 |
| M2 Auth + AI Stabilization | C-30..C-40 |
| M3 Core Domain Panels | C-50..C-87 |
| M4 Admin Panels | C-90..C-97 |
| M5 Human Chat Realtime | C-100..C-111 |
| M6 QA Tooling Pass | C-120..C-127 |
| Release Quality Pass | C-130..C-137 |

---

## Suggested Execution Order

1. Complete Phase 1 first (`C-10..C-22`) to avoid rewrites.
2. Run Phase 2 next (`C-30..C-40`) because auth + AI are prerequisite for all role workflows.
3. Implement Phase 3 by sub-blocks in order: 3A -> 3B -> 3C -> 3D -> 3E -> 3F.
4. Implement Phase 4 (admin) after core entities are testable.
5. Implement Phase 5 (chat realtime) after shared infra is stable.
6. Complete Phase 6 and 7 for QA hardening and sign-off.

---

## Quick Stats

| Category | Total | ✅ Done | 🔧 Partial | 🆕 New |
|----------|-------|---------|------------|--------|
| Phase 0 Baseline | 6 | 6 | 0 | 0 |
| Phase 1 Foundation | 13 | 13 | 0 | 0 |
| Phase 2 Auth + AI | 11 | 11 | 0 | 0 |
| Phase 3 Core Panels | 38 | 0 | 0 | 38 |
| Phase 4 Admin | 8 | 0 | 0 | 8 |
| Phase 5 Chat Realtime | 12 | 0 | 0 | 12 |
| Phase 6 QA Tooling | 8 | 0 | 0 | 8 |
| Phase 7 Quality | 8 | 0 | 0 | 8 |
| **TOTAL** | **104** | **30** | **0** | **74** |

---

End of task list.
