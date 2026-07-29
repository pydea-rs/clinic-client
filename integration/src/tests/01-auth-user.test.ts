import { describe, it, expect } from 'vitest';
import { createTestClient, createRawClient, TestClient } from '../helpers/api-client.js';
import { createAuthApi } from '@client/api/auth.api';
import { createUserApi } from '@client/api/user.api';
import { createTestPng, createTestTxt } from '../helpers/test-files.js';

/*
 * Phase 2 — Auth & User Management integration tests.
 *
 * Auth endpoints are throttled at 5 req/60s per IP (/auth/login, /auth/register).
 * Tests carefully budget these calls and share clients to stay under limits.
 *
 * Register budget (5 total): 2 success + 1 duplicate + 1 weak-pw + 1 missing-fields
 * Login budget (5 total):    3 success + 1 wrong-password + 1 CSRF test
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Auth & User Management', () => {
  const patientEmail = `patient-auth-${Date.now()}@test.local`;
  const patientPassword = 'TestPass123!';
  const doctorEmail = `doctor-auth-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const newPassword = 'NewPass789!';

  // Shared test clients — created once, reused throughout
  let patientTc: TestClient;
  let patientAuthApi: ReturnType<typeof createAuthApi>;
  let patientUserApi: ReturnType<typeof createUserApi>;
  let patientUserId: string;

  let doctorTc: TestClient;
  let doctorAuthApi: ReturnType<typeof createAuthApi>;
  let doctorUserId: string;

  // ─── Registration (3 register calls) ──────────────────────────────

  describe('Registration', () => {
    it('should register a patient (defaults to PATIENT role) and auto-create session', async () => {
      // Register call #1 — role omitted to verify server defaults to PATIENT
      patientTc = createTestClient();
      patientAuthApi = createAuthApi(patientTc.axios);
      patientUserApi = createUserApi(patientTc.axios);
      await warmUp(patientTc);

      const response = await patientTc.axios.post('/auth/register', {
        firstname: 'Alice',
        lastname: 'Patient',
        email: patientEmail,
        password: patientPassword,
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      patientUserId = response.data.id;

      // Registration auto-creates a session — me() should work without login
      const user = await patientAuthApi.me();
      expect(user.email).toBe(patientEmail);
      expect(user.role).toBe('PATIENT');
    });

    it('should register a doctor with valid data', async () => {
      // Register call #2
      doctorTc = createTestClient();
      doctorAuthApi = createAuthApi(doctorTc.axios);
      await warmUp(doctorTc);

      const response = await doctorTc.axios.post('/auth/register', {
        firstname: 'Bob',
        lastname: 'Doctor',
        email: doctorEmail,
        password: doctorPassword,
        role: 'DOCTOR',
      });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('id');
      doctorUserId = response.data.id;
    });

});

  // ─── Login & Session (2 login calls) ──────────────────────────────

  describe('Login & Session', () => {
    it('should login with valid credentials and set session cookie', async () => {
      // Login call #1: login the patient (session from register may be stale if we want to test login)
      const response = await patientTc.axios.post('/auth/login', {
        email: patientEmail,
        password: patientPassword,
      });

      expect(response.status).toBe(200);

      const cookies = await patientTc.jar.getCookies(response.config.baseURL!);
      const sessionCookie = cookies.find(
        c => c.key === (process.env.SESSION_COOKIE_NAME || 'test-sid'),
      );
      expect(sessionCookie).toBeDefined();
    });

    it('should return current user via me() after login', async () => {
      const user = await patientAuthApi.me();

      expect(user).toBeDefined();
      expect(user.email).toBe(patientEmail);
      expect(user.firstname).toBe('Alice');
      expect(user.lastname).toBe('Patient');
      expect(user.role).toBe('PATIENT');
      expect(user.password).toBeUndefined();
    });

    it('should persist session across multiple requests', async () => {
      const user1 = await patientAuthApi.me();
      const user2 = await patientAuthApi.me();
      const user3 = await patientAuthApi.me();

      expect(user1.id).toBe(user2.id);
      expect(user2.id).toBe(user3.id);
    });
  });

  // ─── Logout (1 login call) ────────────────────────────────────────

  describe('Logout', () => {
    it('should logout successfully', async () => {
      // Login call #2: login the doctor
      await doctorAuthApi.login(doctorEmail, doctorPassword);
      const user = await doctorAuthApi.me();
      expect(user).toBeDefined();
      expect(user.email).toBe(doctorEmail);

      // Logout
      const logoutResponse = await doctorTc.axios.post('/auth/logout');
      expect(logoutResponse.status).toBe(200);

      // After logout, session is invalidated — must return 401
      const meResponse = await doctorTc.axios.get('/user');
      expect(meResponse.status).toBe(401);
    });

    it('should allow re-login after logout', async () => {
      // Login call #3: re-login the doctor
      await doctorAuthApi.login(doctorEmail, doctorPassword);
      const user = await doctorAuthApi.me();
      expect(user.email).toBe(doctorEmail);
    });
  });

  // ─── Profile Management (no auth calls) ───────────────────────────

  describe('Profile Management', () => {
    it('should get user profile with correct data', async () => {
      const user = await patientUserApi.getCurrentUser();

      expect(user.firstname).toBe('Alice');
      expect(user.lastname).toBe('Patient');
      expect(user.email).toBe(patientEmail);
      expect(user.role).toBe('PATIENT');
    });

    it('should update firstname and lastname', async () => {
      const updated = await patientUserApi.updateProfile({
        firstname: 'AliceUpdated',
        lastname: 'PatientUpdated',
      });

      expect(updated.firstname).toBe('AliceUpdated');
      expect(updated.lastname).toBe('PatientUpdated');

      const user = await patientUserApi.getCurrentUser();
      expect(user.firstname).toBe('AliceUpdated');
      expect(user.lastname).toBe('PatientUpdated');
    });

    it('should get another user by ID', async () => {
      const otherUser = await patientUserApi.getUserById(doctorUserId);

      expect(otherUser).toBeDefined();
      expect(otherUser.id).toBe(doctorUserId);
      expect(otherUser.password).toBeUndefined();
    });
  });

  // ─── Password Change (no auth calls — reuses existing session) ────

  describe('Password Change', () => {
    it('should change password with correct current password', async () => {
      const response = await patientTc.axios.patch('/user/change-password', {
        currentPassword: patientPassword,
        newPassword,
      });
      expect(response.status).toBe(200);

      // Session should still be valid after password change
      const user = await patientAuthApi.me();
      expect(user.email).toBe(patientEmail);
    });

    it('should reject wrong current password with 400', async () => {
      const response = await patientTc.axios.patch('/user/change-password', {
        currentPassword: 'TotallyWrong123!',
        newPassword: 'AnotherPass456!',
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('incorrect');
    });

    it('should reject new password same as current with 400', async () => {
      const response = await patientTc.axios.patch('/user/change-password', {
        currentPassword: newPassword,
        newPassword: newPassword,
      });

      expect(response.status).toBe(400);
    });
  });

  // ─── Avatar Upload (no auth calls) ────────────────────────────────

  describe('Avatar Upload', () => {
    it('should upload a valid PNG avatar', async () => {
      const png = createTestPng();
      const result = await patientUserApi.uploadAvatar(png, 'avatar.png', 'image/png');

      expect(result).toBeDefined();
      expect(result.avatar).toBeTruthy();
    });

    it('should reject invalid file type (txt) with 400', async () => {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      const txt = createTestTxt();
      form.append('file', txt, { filename: 'bad.txt', contentType: 'text/plain' });

      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Invalid file type');
    });

    it('should reject upload without auth', async () => {
      const tc = createTestClient();
      await warmUp(tc);

      const FormData = (await import('form-data')).default;
      const form = new FormData();
      const png = createTestPng();
      form.append('file', png, { filename: 'avatar.png', contentType: 'image/png' });

      const response = await tc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(401);
    });
  });

  // ─── Registration Errors (2 register calls: total 5/5) ───────────

  describe('Registration Errors', () => {
    it('should reject duplicate email with 409', async () => {
      // Register call #4
      const tc = createTestClient();
      await warmUp(tc);

      const response = await tc.axios.post('/auth/register', {
        firstname: 'Dupe',
        lastname: 'User',
        email: patientEmail,
        password: 'TestPass123!',
        role: 'PATIENT',
      });

      expect(response.status).toBe(409);
      expect(response.data.message).toContain('unavailable');
    });

    it('should reject weak password with 400', async () => {
      // Register call #5 (last one in budget)
      const tc = createTestClient();
      await warmUp(tc);

      const response = await tc.axios.post('/auth/register', {
        firstname: 'Weak',
        lastname: 'Pass',
        email: `weak-${Date.now()}@test.local`,
        password: 'weakpassword1',
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Password must be');
    });

    it('should reject missing required fields with 400', async () => {
      const response = await patientTc.axios.post('/auth/register', {
        email: `missing-${Date.now()}@test.local`,
      });

      expect(response.status).toBe(400);
    });
  });

  // ─── Login Errors (2 login calls: total 5/5) ──────────────────────

  describe('Login Errors', () => {
    it('should reject wrong password with 400', async () => {
      // Login call #4
      const response = await doctorTc.axios.post('/auth/login', {
        email: doctorEmail,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Invalid');
    });

    it('should reject nonexistent email with 400', async () => {
      // Login call #5 (last in budget)
      const response = await doctorTc.axios.post('/auth/login', {
        email: 'nobody-ever@test.local',
        password: 'TestPass123!',
      });

      expect(response.status).toBe(400);
    });
  });

  // ─── Auth-Required Routes (no auth calls) ─────────────────────────

  describe('Auth-Required Routes', () => {
    it('should return 401 for GET /user without session', async () => {
      const tc = createTestClient();
      const response = await tc.axios.get('/user');
      expect(response.status).toBe(401);
    });

    it('should return 401 for PATCH /user/profile without session', async () => {
      const tc = createTestClient();
      await warmUp(tc);

      const response = await tc.axios.patch('/user/profile', {
        firstname: 'Hacker',
      });

      expect(response.status).toBe(401);
    });
  });

  // ─── CSRF & Cookie Side Effects (no auth calls) ───────────────────

  describe('CSRF & Cookie Side Effects', () => {
    it('should set CSRF token cookie on first response', async () => {
      const tc = createTestClient();
      await tc.axios.get('/user');

      expect(tc.csrfToken).toBeTruthy();
      expect(typeof tc.csrfToken).toBe('string');
      expect(tc.csrfToken!.length).toBeGreaterThan(0);
    });

    it('should reject mutating request without CSRF token header', async () => {
      const raw = createRawClient();
      await raw.get('/user');

      // Use a non-throttled endpoint — profile update
      const response = await raw.patch('/user/profile', {
        firstname: 'Hacker',
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('CSRF');
    });

    it('should reject mutating request with mismatched CSRF token', async () => {
      const raw = createRawClient();
      await raw.get('/user');

      const response = await raw.patch(
        '/user/profile',
        { firstname: 'Hacker' },
        { headers: { 'X-CSRF-Token': 'totally-wrong-token' } },
      );

      expect(response.status).toBe(403);
    });

    it('should allow GET requests without CSRF token', async () => {
      const raw = createRawClient();
      const response = await raw.get('/user');
      // 401 (no session), NOT 403 (CSRF)
      expect(response.status).toBe(401);
    });

    it('should set session cookie as HttpOnly', async () => {
      const cookies = await patientTc.jar.getCookies(
        patientTc.axios.defaults.baseURL!,
      );
      const sessionCookie = cookies.find(
        c => c.key === (process.env.SESSION_COOKIE_NAME || 'test-sid'),
      );

      expect(sessionCookie).toBeDefined();
      expect(sessionCookie!.httpOnly).toBe(true);
    });

    it('should never expose password in user responses', async () => {
      const user = await patientUserApi.getCurrentUser();
      expect(user.password).toBeUndefined();
      expect(user.passwordHash).toBeUndefined();

      const otherUser = await patientUserApi.getUserById(doctorUserId);
      expect(otherUser.password).toBeUndefined();
      expect(otherUser.passwordHash).toBeUndefined();
    });
  });
});
