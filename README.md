# AI-Clinic Client

Frontend test client for the AI-Clinic telemedicine platform.

## Purpose

This is a QA/test client designed to validate all backend features without requiring Postman or external tools. It provides role-based interfaces for developers and QA engineers to verify backend functionality end-to-end.

**Note:** This is NOT a production UX. It's a testing tool.

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:8080`

### Installation

```bash
cd client
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build

```bash
npm run build
npm run preview  # Preview production build
```

### Linting

```bash
npm run lint
```

## Environment Variables

Create a `.env` file in the `client/` directory:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

## Project Status

**Progress:** 86/104 tasks (83%)  
**Build:** ✅ Passing  
**TypeScript:** ✅ No errors  
**Linting:** ✅ Clean

### Completed Phases

- ✅ Phase 0: Baseline Alignment (6/6)
- ✅ Phase 1: Foundation & Routing (13/13)
- ✅ Phase 2: Auth + AI Stabilization (11/11)
- ✅ Phase 3: Core Domain Panels (38/38)
- ✅ Phase 4: Admin Panels (8/8)
- ✅ Phase 5: Human Chat Realtime (12/12)

### Remaining Phases

- 🆕 Phase 6: QA Tooling (0/8)
- 🆕 Phase 7: Quality (0/8)

## Features

### Implemented

- ✅ Session-based authentication
- ✅ AI chat with SSE streaming
- ✅ Patient profile management
- ✅ Doctor profile management
- ✅ SOAP note viewing
- ✅ Consultation workflow
- ✅ Scheduling & booking
- ✅ Reviews & ratings
- ✅ Admin panels
- ✅ Human-to-human chat (REST + WebSocket)
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Read receipts
- ✅ Message edit/delete
- ✅ Presence tracking
- ✅ Debug tools

### Not Implemented (Backend Pending)

- ⏳ Calls & WebRTC (Phase 6 backend)
- ⏳ Notifications (Phase 7 backend)
- ⏳ Payment (Phase 8 backend)
- ⏳ Nurse management (Phase 9 backend)

## Architecture

### Tech Stack

- **React 18** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v7** for routing
- **Zustand** for state management
- **React Query** for server state
- **Axios** for HTTP client
- **Socket.IO** for WebSocket
- **Lucide React** for icons

### Project Structure

```
client/src/
├── api/              # API adapters
├── components/       # Shared components
├── features/         # Feature modules
│   ├── admin/       # Admin panels
│   ├── ai-chat/     # AI chat
│   ├── auth/        # Authentication
│   ├── chat/        # Human chat
│   ├── consultation/# Consultations
│   ├── debug/       # Debug tools
│   ├── doctor/      # Doctor features
│   ├── patient/     # Patient features
│   ├── review/      # Reviews
│   └── scheduling/  # Scheduling
├── lib/
│   ├── api/         # HTTP client
│   ├── guards/      # Route guards
│   ├── socket/      # WebSocket service
│   ├── stores/      # Zustand stores
│   └── types/       # TypeScript types
├── routes/          # App router
└── main.tsx         # Entry point
```

## Key Concepts

### Authentication

Session-based cookie authentication (not JWT). The backend sets an HttpOnly cookie that's automatically sent with all requests.

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

- `AuthGuard` - Requires authentication
- `PatientGuard` - Requires PATIENT role
- `DoctorGuard` - Requires DOCTOR role
- `AdminGuard` - Requires admin privileges
- `SuperAdminGuard` - Requires superadmin privileges

### State Management

- **Auth State:** `useAuthStore` from `src/lib/stores/auth.store`
- **Diagnostics:** `useDiagnosticsStore` from `src/lib/stores/diagnostics.store`
- **Server State:** React Query for caching and synchronization

### WebSocket

Socket.IO client for real-time features:

- Chat messaging
- Typing indicators
- Read receipts
- Presence tracking

## Testing

### Manual Testing

1. Start backend: `cd server && npm run start:dev`
2. Start frontend: `cd client && npm run dev`
3. Create test accounts (patient, doctor, admin)
4. Navigate to `/debug` for diagnostics

### Test Accounts

You'll need to create accounts via the registration form or database:

- **Patient:** Any user with `role: 'PATIENT'`
- **Doctor:** Any user with `role: 'DOCTOR'`
- **Admin:** Any user with `isAdmin: true`
- **Superadmin:** Any user with `isSuperAdmin: true`

### Debug Tools

Navigate to `/debug` to access:

- API request inspector
- Session status
- Transport health (SSE/WebSocket)
- WebSocket event logs

## Common Issues

### Build Fails

```bash
# Check for TypeScript errors
npm run build

# Check imports
grep -r "from.*stores/" src/
```

### WebSocket Not Connecting

1. Verify backend is running
2. Check `/debug` WebSocket panel
3. Verify `VITE_API_BASE_URL` is correct

### State Not Updating

1. Check store imports (must use `lib/stores/`)
2. Verify using correct store methods
3. Check React DevTools

## Documentation

- `docs/CONTEXT.md` - Complete project context
- `docs/TASKS.md` - Task tracking
- `docs/PRD.md` - Product requirements
- `docs/COMPREHENSIVE_AUDIT_AND_FIXES.md` - Audit report
- `docs/CHAT_TESTING_GUIDE.md` - Chat testing guide
- `docs/SESSION_8_FINAL_SUMMARY.md` - Latest session summary

## Contributing

This is a test client for backend validation. When adding features:

1. Follow existing patterns
2. Use TypeScript strictly
3. Add loading states
4. Handle errors with toast notifications
5. Make it mobile responsive
6. Update documentation

## License

Private project - AI-Clinic

## Support

For issues or questions, refer to the documentation in `docs/` or check the debug panel at `/debug`.

---

**Last Updated:** February 26, 2026  
**Version:** 0.0.0 (Development)  
**Status:** 83% Complete (86/104 tasks)
