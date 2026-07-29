import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, createRawClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '../helpers/server.js';

/**
 * Phase 17 — Cross-cutting & Security Tests.
 *
 * Tests CSRF enforcement, role-based access, banned/deactivated user
 * handling, rate limiting, and input validation.
 *
 * Register budget (5/60s): 5 (patient + doctor + promoteTarget + banTarget + deactivateTarget) = 5 used
 * Login budget (5/60s): 4 (superadmin + ban-login + promote-login + ws-ban-login) = 4 used
 *
 * IMPORTANT: the CookieAuthGuard has a static 60s status cache keyed by
 * user ID. Any guarded request (GET /user, PATCH /admin/...) for a given
 * user populates this cache. To test ban/deactivation detection, the target
 * user must NOT have any prior guarded requests — otherwise the cache would
 * return stale {isBanned: false} and the guard would pass.
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Cross-cutting & Security', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const patientEmail = `sec-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';
  const doctorEmail = `sec-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const promoteTargetEmail = `sec-promo-${Date.now()}@test.local`;
  const promoteTargetPassword = 'PromoPass456!';
  const banTargetEmail = `sec-ban-${Date.now()}@test.local`;
  const banTargetPassword = 'BanPass456!';
  const deactivateTargetEmail = `sec-deact-${Date.now()}@test.local`;
  const deactivateTargetPassword = 'DeactPass456!';

  let patientTc: TestClient;
  let doctorTc: TestClient;
  let adminTc: TestClient;
  let adminApi: ReturnType<typeof createAdminApi>;

  let promoteTargetUserId: string;

  // These clients must NOT make any guarded request before ban/deactivation
  let banTargetTc: TestClient;
  let banTargetUserId: string;

  let deactivateTargetTc: TestClient;
  let deactivateTargetUserId: string;

  beforeAll(async () => {
    // ── Register patient ──
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'SecPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });

    // ── Register doctor ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'SecDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });

    // ── Login superadmin ──
    adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    adminApi = createAdminApi(adminTc.axios);

    // ── Register promote target (for superadmin role test) ──
    const promoTc = createTestClient();
    await warmUp(promoTc);
    const promoResp = await promoTc.axios.post('/auth/register', {
      firstname: 'PromoTarget',
      lastname: 'Test',
      email: promoteTargetEmail,
      password: promoteTargetPassword,
      role: 'PATIENT',
    });
    promoteTargetUserId = promoResp.data?.id;

    // ── Register ban target ──
    // NO guarded requests after registration — keeps status cache empty
    banTargetTc = createTestClient();
    await warmUp(banTargetTc);
    const banRegResp = await banTargetTc.axios.post('/auth/register', {
      firstname: 'BanTarget',
      lastname: 'Test',
      email: banTargetEmail,
      password: banTargetPassword,
      role: 'PATIENT',
    });
    banTargetUserId = banRegResp.data?.id;

    // ── Register deactivation target ──
    // NO guarded requests after registration — keeps status cache empty
    deactivateTargetTc = createTestClient();
    await warmUp(deactivateTargetTc);
    const deactRegResp = await deactivateTargetTc.axios.post('/auth/register', {
      firstname: 'DeactTarget',
      lastname: 'Test',
      email: deactivateTargetEmail,
      password: deactivateTargetPassword,
      role: 'PATIENT',
    });
    deactivateTargetUserId = deactRegResp.data?.id;
  });

  // ─── CSRF ─────────────────────────────────────────────────────────

  describe('CSRF', () => {
    it('should reject mutating request without CSRF token (403)', async () => {
      const raw = createRawClient();
      await raw.get(`${getServerUrl()}/user`);

      const response = await raw.post(`${getServerUrl()}/auth/login`, {
        email: 'no-csrf@test.local',
        password: 'whatever',
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('CSRF');
    });

    it('should reject mutating request with mismatched CSRF token (403)', async () => {
      const raw = createRawClient();
      await raw.get(`${getServerUrl()}/user`);

      const response = await raw.post(
        `${getServerUrl()}/auth/login`,
        { email: 'wrong-csrf@test.local', password: 'whatever' },
        { headers: { 'X-CSRF-Token': 'totally-wrong-token-value' } },
      );

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('CSRF');
    });

    it('should allow GET requests without CSRF token', async () => {
      const raw = createRawClient();
      const response = await raw.get(`${getServerUrl()}/doctor`);

      expect(response.status).toBe(200);
    });
  });

  // ─── Role-based Access ────────────────────────────────────────────

  describe('Role-based Access', () => {
    it('should reject patient accessing doctor-only endpoint (403)', async () => {
      const response = await patientTc.axios.post('/doctor', {
        startedAt: '2020-01-01T00:00:00.000Z',
        specialty: 'GENERAL',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
        bio: 'Hack',
      });

      expect(response.status).toBe(403);
    });

    it('should reject doctor accessing admin endpoint (403)', async () => {
      const response = await doctorTc.axios.get('/admin/users');

      expect(response.status).toBe(403);
    });

    it('should reject admin accessing superadmin-only endpoint (403)', async () => {
      // Promote a separate user to admin
      await adminApi.adminActions.promote(promoteTargetUserId);

      const promotedTc = createTestClient();
      await warmUp(promotedTc);
      await promotedTc.axios.post('/auth/login', {
        email: promoteTargetEmail,
        password: promoteTargetPassword,
      });

      // Try to promote another user — superadmin-only (SuperAdminGuard)
      const response = await promotedTc.axios.patch(
        `/admin/users/${deactivateTargetUserId}/promote`,
      );

      expect(response.status).toBe(403);

      // Demote back
      await adminApi.adminActions.demote(promoteTargetUserId);
    });

    it('should allow admin/superadmin to bypass role checks', async () => {
      const response = await adminTc.axios.get('/consultation');

      expect(response.status).toBe(200);
    });
  });

  // ─── Banned/Deactivated Users ─────────────────────────────────────

  describe('Banned/Deactivated Users', () => {
    it('should block banned user on next guarded request (403)', async () => {
      await adminApi.users.ban(banTargetUserId, 'Test ban');

      // banTargetTc has never made a guarded request, so no cache entry.
      // Guard will query DB and find isBanned: true.
      const response = await banTargetTc.axios.get('/user');

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('banned');
    });

    it('should allow banned user to login but block subsequent requests', async () => {
      // Login succeeds — the login endpoint has no CookieAuthGuard.
      // verifyAndLogin reads user from DB (isBanned: true) and sets
      // it in the session.
      const freshTc = createTestClient();
      await warmUp(freshTc);
      const loginResponse = await freshTc.axios.post('/auth/login', {
        email: banTargetEmail,
        password: banTargetPassword,
      });

      expect(loginResponse.status).toBe(200);

      // Next guarded request: session data now has isBanned: true
      // (set during login from fresh DB read), so the session-level
      // check in the guard catches it immediately.
      const response = await freshTc.axios.get('/user');
      expect(response.status).toBe(403);
      expect(response.data.message).toContain('banned');
    });

    it('should block deactivated user on next guarded request (403)', async () => {
      await adminApi.users.deactivate(deactivateTargetUserId);

      const response = await deactivateTargetTc.axios.get('/user');

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('deactivated');
    });

    it('should reject banned user WebSocket connection', async () => {
      const serverUrl = getServerUrl();

      // Re-login the banned user so the session cookie reflects
      // isBanned: true. WS middleware reads from session, not DB.
      const wsBanTc = createTestClient();
      await warmUp(wsBanTc);
      await wsBanTc.axios.post('/auth/login', {
        email: banTargetEmail,
        password: banTargetPassword,
      });

      const cookies = await wsBanTc.jar.getCookies(serverUrl);
      const cookieStr = cookies.map((c) => `${c.key}=${c.value}`).join('; ');

      const socket: Socket = io(`${serverUrl}/chat`, {
        transports: ['websocket'],
        extraHeaders: { cookie: cookieStr },
        autoConnect: false,
      });

      const result = await new Promise<{ connected: boolean; error?: string }>((resolve) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          resolve({ connected: false, error: 'timeout' });
        }, 3000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({ connected: true });
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          socket.disconnect();
          resolve({ connected: false, error: err.message });
        });

        socket.connect();
      });

      expect(result.connected).toBe(false);
    });
  });

  // ─── Input Validation ─────────────────────────────────────────────

  describe('Input Validation', () => {
    it('should reject invalid UUID parameter (400)', async () => {
      const response = await patientTc.axios.get('/user/not-a-uuid');

      expect(response.status).toBe(400);
    });

    it('should reject extra/unknown fields via forbidNonWhitelisted (400)', async () => {
      // Use the patient profile endpoint (non-rate-limited, has DTO validation)
      const response = await patientTc.axios.post('/patient/profile', {
        allergies: ['None'],
        hackerField: 'malicious',
      });

      expect(response.status).toBe(400);
    });

    it('should safely handle SQL injection attempt in query params', async () => {
      const response = await patientTc.axios.get('/doctor', {
        params: { search: "'; DROP TABLE users; --" },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });
  });

  // ─── Rate Limiting (last — exhausts IP-based throttle budget) ────

  describe('Rate Limiting', () => {
    it('should enforce auth rate limit on login (429 after >5 attempts)', async () => {
      const tc = createTestClient();
      await warmUp(tc);

      let got429 = false;
      for (let i = 0; i < 10; i++) {
        const response = await tc.axios.post('/auth/login', {
          email: `ratelimit-${Date.now()}-${i}@test.local`,
          password: 'Wrong123!',
        });
        if (response.status === 429) {
          got429 = true;
          break;
        }
      }

      expect(got429).toBe(true);
    });
  });
});
