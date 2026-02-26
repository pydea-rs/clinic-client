# AI-Clinic Client PRD (Backend Validation Client)

Version: 1.0  
Date: February 26, 2026  
Status: Draft (Implementation-Ready)  
Owner: Frontend/Test Client

---

## 1. Purpose

This document defines product requirements for the `client/` app as a backend validation client for AI-Clinic.

The goal is not to ship production UX. The goal is to provide a beautiful, usable, role-aware interface that lets developers and QA verify every currently supported backend feature end-to-end.

This PRD is explicitly aligned with completed backend tasks in `TASKS.md` (all completed items through Phase 5).

---

## 2. Scope

### 2.1 In Scope

- Upgrade existing `client/` (currently auth + AI chat baseline) into a full backend test client.
- Keep and refine existing AI chat implementation; do not rebuild from scratch.
- Add role-based test surfaces for:
  - Auth
  - User profile + avatar upload
  - Patient profile + SOAP + consultation list
  - Doctor profile + documents + public doctor discovery
  - Consultation flow
  - Scheduling + booking
  - Reviews + ratings
  - Admin panel endpoints
  - Human-to-human chat (REST + WebSocket)
- Add API visibility and diagnostics so failures are easy to debug.

### 2.2 Out of Scope (Current Backend Does Not Support Fully)

- Calls/WebRTC module (Phase 6 tasks B-71..B-73 not complete)
- Notifications module (Phase 7 tasks B-74..B-80 not complete)
- Payment integration module (Phase 8 tasks B-81..B-82 not complete)
- Nurse module (Phase 9 tasks B-83..B-85 not complete)
- Security hardening items B-93..B-96 (treat current behavior as source of truth)
- Production deployment concerns

---

## 3. Current State (Client)

The current `client/` app provides:

- Session-based login/register/logout
- Basic `GET /user` bootstrap auth state
- AI chat conversation start + send message
- SSE stream listening for AI response messages
- Basic, single-page UX

Gaps:

- No route-level test navigation
- No coverage for most backend endpoints
- No role-specific test dashboards
- No chat (human-to-human) test UI
- No admin test UI
- No structured API error and payload inspector

---

## 4. Product Goals

1. Allow one tester to validate all currently implemented backend features without Postman.
2. Provide clear role-based flows (patient, doctor, admin/superadmin).
3. Keep UX polished and fast so repeated QA cycles are not painful.
4. Make debugging simple through request/response visibility and transport status.
5. Preserve compatibility with backend response envelope `{ status, message, contents }`.

---

## 5. User Personas

- Developer: verifies endpoint correctness while implementing server changes.
- QA Engineer: runs regression checks across role-based workflows.
- Product/Reviewer: manually validates behavior with realistic UI flow.

---

## 6. Functional Requirements

### 6.1 Core Platform

- App must support configurable API base URL and WS base URL via env.
- App must use cookie-based auth (`withCredentials: true`) on HTTP and Socket.IO.
- App must unwrap backend envelope and show both normalized data and raw response in debug mode.
- App must have global error surface with:
  - HTTP status
  - backend `message`
  - endpoint path
  - payload preview

### 6.2 Auth

Support:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /user` (session bootstrap)

Requirements:

- Registration form must map to backend schema (`firstname`, `lastname`, `email`, `password`, optional role).
- Role options for self-register: `PATIENT`, `DOCTOR` (match backend constraint).
- Persist auth state from cookie session only; no JWT storage.

### 6.3 AI Chat (Existing, Upgrade Only)

Support:

- `POST /ai-agents/start`
- `POST /ai-agents/message`
- `GET /ai-agents/messages/:conversationId` (poll fallback screen)
- `GET /ai-agents/stream/:conversationId` (SSE primary)

Requirements:

- Keep current chat UI and SSE architecture.
- Update behavior to current server contracts:
  - endpoints are auth-protected currently
  - server picks active conversation in send flow
  - SSE named events support: `connected`, `message_created`, `message_updated`, `soap_ready`, `error`
- Display SOAP detection event (`soap_ready`) in UI as a test artifact.
- Add reconnect diagnostics and manual reconnect button.

### 6.4 User Module

Support:

- `PATCH /user/profile`
- `POST /user/avatar` (multipart)
- `GET /user/:id`
- `GET /user/all` (admin only)

Requirements:

- Profile editor (self).
- Avatar uploader with client-side validation hints (type/size).
- Admin users table (for `GET /user/all`) with filters in client-side view.

### 6.5 Patient Module

Support:

- `POST /patient/profile`
- `PATCH /patient/profile`
- `GET /patient/profile`
- `GET /patient/consultations`
- `GET /patient/soaps`

Requirements:

- Patient profile form (array fields editor for history/allergies/medications/surgeries/family history).
- Patient SOAP list with detail drawer.
- Patient consultation list with status badges and detail links.

### 6.6 Doctor Module

Support:

- `POST /doctor`
- `PATCH /doctor/profile`
- `POST /doctor/documents` (multipart + optional `type`)
- `GET /doctor/documents`
- `GET /doctor` (public filtered listing)
- `GET /doctor/:id`
- `GET /doctor/:id/rating`

Requirements:

- Doctor onboarding/profile editor.
- Document upload tester with explicit doc type selector.
- Public doctor browser page with filter controls:
  - specialty
  - visit method
  - location
  - name search

### 6.7 SOAP Module

Support:

- `GET /soap`
- `GET /soap/:id`

Requirements:

- SOAP viewer that displays structured sections:
  - subjective
  - objective
  - assessment
  - plan
  - triage and specialty if present

### 6.8 Consultation Module

Support:

- `POST /consultation`
- `GET /consultation`
- `GET /consultation/:id`
- `PATCH /consultation/:id/decide`
- `PATCH /consultation/:id/complete`
- `PATCH /consultation/:id/cancel`

Requirements:

- Consultation lifecycle board view by role.
- Doctor decision panel (mode + visit method).
- Completion panel (notes/summary/follow-up).
- Status transition feedback (success/failure with backend message).

### 6.9 Scheduling Module

Support:

- Doctor:
  - `POST/GET/PATCH/DELETE /scheduling/availability`
  - `POST/GET /scheduling/slot-durations`
  - `POST/GET/DELETE /scheduling/exceptions`
- Public:
  - `GET /scheduling/doctor/:doctorId/slots`
  - `GET /scheduling/doctor/:doctorId/durations`
- Patient/auth:
  - `POST /scheduling/book`
  - `GET /scheduling/appointments`
  - `GET /scheduling/appointments/:id`
  - `PATCH /scheduling/appointments/:id/cancel`

Requirements:

- Calendar and slot matrix for slot discovery.
- Booking form linked to consultation and selected duration.
- Appointment list with role-aware filters/status.

### 6.10 Review Module

Support:

- `POST /review`
- `PATCH /review/:id`
- `DELETE /review/:id`
- `GET /review/doctor/:doctorId`
- `GET /review/doctor/:doctorId/rating`

Requirements:

- Review CRUD for patient role.
- Public review feed and aggregate rating widget.
- Distribution chart (1-5 stars).

### 6.11 Admin Module

Support:

- `GET /admin/users`
- `PATCH /admin/users/:id`
- `PATCH /admin/users/:id/deactivate`
- `GET /admin/doctors/pending`
- `GET /admin/doctors/:id/documents`
- `PATCH /admin/doctors/:id/verify`
- `PATCH /admin/users/:id/promote` (superadmin)
- `PATCH /admin/users/:id/demote` (superadmin)
- `DELETE /admin/reviews/:id`
- `GET /admin/stats`

Requirements:

- Admin dashboard cards for stats.
- User management table with inline edit/deactivate.
- Verification workflow view with document preview links.
- Review moderation actions.

### 6.12 Chat Module (Human-to-Human)

REST support:

- `POST /chat`
- `GET /chat`
- `GET /chat/:id`
- `GET /chat/:id/messages`
- `POST /chat/:id/message`

WebSocket namespace:

- `/chat`

Client -> server events:

- `chat:join`
- `chat:leave`
- `chat:message`
- `chat:typing`
- `chat:read`
- `chat:edit` (implementation present)
- `chat:delete` (implementation present)

Server -> client events:

- `chat:message`
- `chat:typing`
- `chat:read`
- `chat:edited`
- `chat:deleted`
- `user:online`
- `chat:error`

Requirements:

- Chat list + room UI.
- Live typing and presence indicators.
- Read receipt markers.
- Edit/delete UI for own messages.
- Transport log panel for socket lifecycle and event payloads.

---

## 7. Information Architecture

Top-level routes:

- `/` Home / quick role entry
- `/auth` Login/register
- `/ai` AI chat
- `/doctors` Public doctors
- `/doctor/:id` Public profile
- `/patient/*` Patient tools
- `/doctor/*` Doctor tools
- `/admin/*` Admin tools
- `/chat/*` Human chat
- `/debug/api` API explorer and request log

Role-aware navigation:

- Patient: profile, soaps, consultations, booking, reviews, chat, AI
- Doctor: profile, documents, consultations, scheduling, appointments, chat
- Admin: users, verifications, stats, moderation

---

## 8. UX and Visual Direction

### 8.1 Experience Principles

- Fast to scan, low friction for repetitive testing.
- Human-friendly but technical: every action exposes exact backend result.
- Avoid generic dashboard look; use a distinctive clinical-tech visual language.

### 8.2 UI Direction

- Typography: `Manrope` (UI) + `IBM Plex Mono` (payload/diagnostics).
- Color system:
  - Primary: deep cyan/teal
  - Accent: warm lime for success
  - Critical: coral/red for errors
  - Neutral: slate surfaces
- Surfaces:
  - layered gradient backdrop
  - elevated cards with subtle blur
  - clear state colors for statuses
- Motion:
  - route transition fade+slide
  - staggered list entry
  - socket status pulse (subtle)

### 8.3 Accessibility

- Keyboard navigation for all interactive controls.
- Visible focus rings.
- Color contrast >= WCAG AA for body text and actionable controls.
- Reduced motion mode support.

---

## 9. Technical Requirements (Client)

- Stack: React + TypeScript + Vite + Tailwind.
- Add:
  - `react-router-dom`
  - `@tanstack/react-query`
  - `zustand`
  - `socket.io-client`
  - `react-hook-form`
  - `zod`
- HTTP client:
  - shared axios instance
  - `withCredentials: true`
  - response envelope unwrapping
  - normalized API error model
- Realtime:
  - SSE manager for AI
  - Socket.IO service for chat
  - reconnect/backoff and connection status handling

---

## 10. Backend Contract Notes

- Base URL default: `http://localhost:8080`
- No global API prefix in current backend.
- Auth model: secure cookie session (not JWT).
- Standard HTTP envelope:
  - success: `{ status, message, contents }`
  - error: `{ status, message, contents: null, timestamp, path }`
- ID types:
  - UUID: user, consultation, soap, chat
  - int: doctor profile, review, appointment, admin doc IDs

---

## 11. Validation Features (Must Have for QA)

- Request inspector panel:
  - method, URL, headers, payload
  - response status and latency
  - raw response body
- Toggle for showing envelope vs unwrapped `contents`.
- Copy request/response JSON buttons.
- Session status banner:
  - authenticated user id/role
  - cookie/session live state
- Network transport monitors:
  - SSE state (open/closed/retrying)
  - WS state (connected/reconnecting/disconnected)

---

## 12. Milestones

### M1: Foundation and Routing

- App shell, route guards, API layer, query client, state stores, theme system.

### M2: Auth + AI Stabilization

- Keep existing AI chat; align events/contracts with current backend.
- Complete auth flows and session bootstrap.

### M3: Core Domain Panels

- Patient, doctor, consultation, scheduling, review modules.

### M4: Admin Panels

- Users, verification, stats, moderation.

### M5: Human Chat Realtime

- REST chat history + live socket messaging/presence/read/edit/delete.

### M6: QA Tooling Pass

- API inspector, logs, transport diagnostics, regression checklist.

---

## 13. Acceptance Criteria

1. A tester can validate every currently supported backend endpoint from UI.
2. Authenticated session survives refresh and role-based routing behaves correctly.
3. AI chat works through SSE and shows SOAP-ready event when emitted.
4. Doctor and patient workflows can complete consultation and appointment scenarios.
5. Admin can complete verification and moderation workflows.
6. Human chat works through REST + WebSocket with presence and read receipts.
7. Each action clearly exposes success/failure payload from backend.
8. Unsupported backend modules are visibly marked "Not available in current backend."

---

## 14. Explicit Exclusions for This PRD

- No implementation of new backend capabilities.
- No call signaling UI beyond placeholder "coming in backend Phase 6".
- No notification center connected to backend endpoints.
- No payment processing UX beyond static placeholder.
- No nurse assignment UX.

---

## 15. Risks and Mitigations

- Risk: backend contract drift while client is built.
  - Mitigation: maintain typed endpoint map and centralized API adapters.
- Risk: SSE/WS intermittent issues in local dev.
  - Mitigation: strong reconnect logic, transport logs, manual reconnect actions.
- Risk: role-dependent flows hard to test with one account.
  - Mitigation: quick account switching and saved local test identities.

---

## 16. Definition of Done

The client is done when:

- Feature coverage equals backend completed tasks through Phase 5.
- QA can run an end-to-end manual checklist without external tools.
- UI is clean, responsive, and stable on desktop and mobile.
- Docs include setup steps and a role-based test checklist.

---

End of document.
