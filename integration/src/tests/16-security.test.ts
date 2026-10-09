import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createRawClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { io, Socket } from 'socket.io-client';
import { socketTarget } from '@client/lib/socket/socket-url';
import axios from 'axios';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySecureSession from '@fastify/secure-session';
import { createHash, randomUUID } from 'crypto';
import {
  getServerUrl,
  bootstrapRateLimitServer,
  shutdownRateLimitServer,
} from '../helpers/server.js';
import { startPrefixProxy } from '../helpers/prefix-proxy.js';

/**
 * Phase 17 — Cross-cutting & Security Tests.
 *
 * Tests CSRF enforcement, role-based access, banned/deactivated user
 * handling, rate limiting, and input validation.
 *
 * The shared test server runs without rate limiting (APP_ENV=test), so registrations and
 * logins here aren't budgeted; the rate-limit test boots its own app.
 *
 * Admin ban/deactivate actions clear the server's 60s account-status cache, so
 * they apply to the target's existing HTTP sessions and WebSockets right away.
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

  async function cookieHeader(tc: TestClient): Promise<string> {
    const cookies = await tc.jar.getCookies(getServerUrl());
    return cookies.map((c) => `${c.key}=${c.value}`).join('; ');
  }

  // Connects where the client app would, so these tests also cover its socket target.
  async function connectSocket(namespace: '/chat' | '/matching', cookie: string, base = getServerUrl()) {
    const { url, path } = socketTarget(namespace, base);
    const socket: Socket = io(url, {
      path,
      transports: ['websocket'],
      extraHeaders: { cookie },
      autoConnect: false,
      reconnection: false,
    });

    const result = await new Promise<{ connected: boolean; error?: string }>((resolve) => {
      const timeout = setTimeout(() => resolve({ connected: false, error: 'timeout' }), 3000);
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve({ connected: true });
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        resolve({ connected: false, error: err instanceof Error ? err.message : 'Unknown error' });
      });
      socket.connect();
    });

    return { socket, ...result };
  }

  describe('WebSocket target', () => {
    it.each(['/chat', '/matching'] as const)(
      'should connect an active user to %s at the target the client app computes',
      async (namespace) => {
        const { socket, connected, error } = await connectSocket(namespace, await cookieHeader(patientTc));

        // The server refuses unknown namespaces, so connecting proves the namespace is right.
        expect(error).toBeUndefined();
        expect(connected).toBe(true);
        socket.close();
      },
    );

    describe('behind a reverse proxy that serves the API under /api (like the Docker nginx)', () => {
      let proxy: Awaited<ReturnType<typeof startPrefixProxy>>;

      beforeAll(async () => {
        proxy = await startPrefixProxy(getServerUrl(), '/api');
      });

      afterAll(async () => {
        await proxy.close();
      });

      it('should reach the API with the prefix stripped', async () => {
        const response = await axios.get(`${proxy.url}/api/user`, {
          headers: { cookie: await cookieHeader(patientTc) },
          validateStatus: () => true,
        });

        expect(response.status).toBe(200);
        expect(response.data.contents.id).toBe((await patientTc.axios.get('/user')).data.id);
      });

      it.each(['/chat', '/matching'] as const)(
        'should connect %s through the proxy at the target the client app computes',
        async (namespace) => {
          const { socket, connected, error } = await connectSocket(
            namespace,
            await cookieHeader(patientTc),
            `${proxy.url}/api`,
          );
          socket.close();

          expect(error).toBeUndefined();
          expect(connected).toBe(true);
        },
      );
    });
  });

  describe('Forged session cookies', () => {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'sid';
    const sessionValue = (cookie: string) =>
      cookie.split('; ').find((c) => c.startsWith(`${cookieName}=`))!.slice(cookieName.length + 1);
    const withSession = (cookie: string, value: string) =>
      cookie
        .split('; ')
        .map((c) => (c.startsWith(`${cookieName}=`) ? `${cookieName}=${value}` : c))
        .join('; ');

    /** A well-formed session cookie for `user`, encrypted with a key the server doesn't have. */
    async function foreignKeySession(user: unknown): Promise<string> {
      const app = Fastify();
      await app.register(fastifyCookie);
      await app.register(fastifySecureSession, {
        key: createHash('sha256').update(`not-the-server-secret-${randomUUID()}`).digest(),
        cookieName,
        cookie: { path: '/' },
      });
      app.get('/', (request: any, reply) => {
        request.session.set('user', user);
        reply.send('ok');
      });
      const response = await app.inject({ url: '/' });
      await app.close();
      const setCookie = [response.headers['set-cookie']].flat()[0]!;
      return setCookie.split(';')[0].slice(cookieName.length + 1);
    }

    it.each(['/chat', '/matching'] as const)('should refuse a tampered session cookie on %s', async (namespace) => {
      const cookie = await cookieHeader(patientTc);
      const value = sessionValue(cookie);
      const i = Math.floor(Math.random() * value.length);
      const tampered = value.slice(0, i) + (value[i] === 'A' ? 'B' : 'A') + value.slice(i + 1);

      const { socket, connected, error } = await connectSocket(namespace, withSession(cookie, tampered));
      socket.close();

      expect(connected).toBe(false);
      expect(error).toBe('Unauthorized: No valid session');
    });

    it.each(['/chat', '/matching'] as const)(
      'should refuse a session cookie encrypted with another key on %s, even for a real user',
      async (namespace) => {
        const cookie = await cookieHeader(patientTc);
        const user = (await patientTc.axios.get('/user')).data;

        const { socket, connected, error } = await connectSocket(
          namespace,
          withSession(cookie, await foreignKeySession(user)),
        );
        socket.close();

        expect(connected).toBe(false);
        expect(error).toBe('Unauthorized: No valid session');
      },
    );
  });

  describe('Banned/Deactivated Users', () => {
    // The ban target's registration session, copied before the ban: still a validly signed cookie afterwards
    let preBanCookie: string;

    it('should block banned user on next guarded request (403)', async () => {
      preBanCookie = await cookieHeader(banTargetTc);
      await adminApi.users.ban(banTargetUserId, 'Test ban');

      // banTargetTc has never made a guarded request, so no cache entry.
      // Guard will query DB and find isBanned: true.
      const response = await banTargetTc.axios.get('/user');

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('banned');
    });

    it('should refuse login for a banned user (403) and start no session', async () => {
      const freshTc = createTestClient();
      await warmUp(freshTc);
      const loginResponse = await freshTc.axios.post('/auth/login', {
        email: banTargetEmail,
        password: banTargetPassword,
      });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.data.message).toContain('banned');
      expect(loginResponse.data.message).toContain('Test ban');

      const response = await freshTc.axios.get('/user');
      expect(response.status).toBe(401);
    });

    it('should not reveal the ban to a wrong password (400)', async () => {
      const freshTc = createTestClient();
      await warmUp(freshTc);
      const loginResponse = await freshTc.axios.post('/auth/login', {
        email: banTargetEmail,
        password: 'WrongPass456!',
      });

      expect(loginResponse.status).toBe(400);
      expect(JSON.stringify(loginResponse.data)).not.toContain('banned');
    });

    it.each(['/chat', '/matching'] as const)(
      'should reject a %s WebSocket using a session issued before the ban',
      async (namespace) => {
        const { socket, connected, error } = await connectSocket(namespace, preBanCookie);
        socket.disconnect();

        expect(connected).toBe(false);
        expect(error).toBe('Unauthorized: Account banned');
      },
    );

    it("should disconnect the user's open WebSockets once banned", async () => {
      const tc = createTestClient();
      await warmUp(tc);
      const registration = await tc.axios.post('/auth/register', {
        firstname: 'LiveBan',
        lastname: 'Test',
        email: `sec-liveban-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        password: banTargetPassword,
        role: 'PATIENT',
      });
      const cookie = await cookieHeader(tc);
      const sockets = await Promise.all([connectSocket('/chat', cookie), connectSocket('/matching', cookie)]);
      expect(sockets.map((s) => s.connected)).toEqual([true, true]);
      const disconnected = Promise.all(
        sockets.map(
          ({ socket }) =>
            new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => resolve(false), 3000);
              socket.on('disconnect', () => {
                clearTimeout(timeout);
                resolve(true);
              });
            }),
        ),
      );

      await adminApi.users.ban(registration.data.id, 'Live ban');

      expect(await disconnected).toEqual([true, true]);
      sockets.forEach(({ socket }) => socket.disconnect());
      expect((await tc.axios.get('/user')).status).toBe(403);
    });

    it('should let an unbanned user log in, use the API and connect WebSockets again', async () => {
      await adminApi.users.unban(banTargetUserId);
      const freshTc = createTestClient();
      await warmUp(freshTc);

      const login = await freshTc.axios.post('/auth/login', {
        email: banTargetEmail,
        password: banTargetPassword,
      });

      expect(login.status).toBe(200);
      expect((await freshTc.axios.get('/user')).data.id).toBe(banTargetUserId);
      const { socket, connected } = await connectSocket('/chat', await cookieHeader(freshTc));
      socket.close();
      expect(connected).toBe(true);
    });

    it("should disconnect the user's open WebSockets and block HTTP once deactivated", async () => {
      const cookie = await cookieHeader(deactivateTargetTc);
      const sockets = await Promise.all([connectSocket('/chat', cookie), connectSocket('/matching', cookie)]);
      expect(sockets.map((s) => s.connected)).toEqual([true, true]);

      const disconnected = Promise.all(
        sockets.map(
          ({ socket }) =>
            new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => resolve(false), 3000);
              socket.on('disconnect', () => {
                clearTimeout(timeout);
                resolve(true);
              });
            }),
        ),
      );

      await adminApi.users.deactivate(deactivateTargetUserId);

      expect(await disconnected).toEqual([true, true]);
      sockets.forEach(({ socket }) => socket.disconnect());

      const response = await deactivateTargetTc.axios.get('/user');
      expect(response.status).toBe(403);
      expect(response.data.message).toContain('deactivated');
    });

    it.each([
      ['banned', (id: string) => adminApi.users.ban(id, 'AI abuse')],
      ['deactivated', (id: string) => adminApi.users.deactivate(id)],
    ])('should treat a session issued before the user was %s as a guest on the AI chat', async (_case, block) => {
      const tc = createTestClient();
      await warmUp(tc);
      const registration = await tc.axios.post('/auth/register', {
        firstname: 'AiBlock',
        lastname: 'Test',
        email: `sec-ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        password: 'AiBlockPass456!',
        role: 'PATIENT',
      });
      const userId = registration.data?.id;
      const startAiChat = () => tc.axios.post('/ai-agents/start', {});

      const before = await startAiChat();
      expect(before.status).toBe(200);
      expect(before.data.userId).toBe(userId);

      await block(userId);
      const after = await startAiChat();

      expect(after.status).toBe(200);
      expect(after.data.guest).toBe(true);
      expect(after.data.userId).toBeUndefined();
    });

    it('should refuse login for a deactivated user (403)', async () => {
      const freshTc = createTestClient();
      await warmUp(freshTc);
      const loginResponse = await freshTc.axios.post('/auth/login', {
        email: deactivateTargetEmail,
        password: deactivateTargetPassword,
      });

      expect(loginResponse.status).toBe(403);
      expect(loginResponse.data.message).toContain('deactivated');
    });

    it('should reject a WebSocket for a deactivated user', async () => {
      const { socket, connected, error } = await connectSocket('/chat', await cookieHeader(deactivateTargetTc));
      socket.disconnect();

      expect(connected).toBe(false);
      expect(error).toBe('Unauthorized: Account deactivated');
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

  // ─── Rate Limiting (isolated prod-env app) ───────────────────────
  // The shared test server disables throttling (APP_ENV=test) so bulk-login
  // tests aren't blocked by the 5/min auth limit. To actually exercise rate
  // limiting we boot a dedicated app with APP_ENV=production forced, which
  // flips only the ThrottlerGuard on. Set RUN_RATE_LIMIT_TESTS=false to skip
  // this block (e.g. in constrained CI); it is enabled by default.
  const runRateLimitTests = process.env.RUN_RATE_LIMIT_TESTS !== 'false';

  describe.skipIf(!runRateLimitTests)('Rate Limiting (isolated prod-env app)', () => {
    let rateLimitUrl = '';

    beforeAll(async () => {
      rateLimitUrl = await bootstrapRateLimitServer();
    }, 120_000);

    afterAll(async () => {
      await shutdownRateLimitServer();
    }, 30_000);

    it('should enforce auth rate limit on login (429 after >5 attempts)', async () => {
      const tc = createTestClient(rateLimitUrl);
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
