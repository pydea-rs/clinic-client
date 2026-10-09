import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createAuthApi } from '@client/api/auth.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createNotificationApi } from '@client/api/notification.api';
import { createTestPdf } from '../helpers/test-files.js';
import { getServerUrl } from '../helpers/server.js';

/**
 * Phase 4 — Admin & Verification integration tests.
 *
 * Login budget (5/60s): 1 superadmin + 1 banned-login + 1 deactivated-login = 3 used
 * Role/admin and ban/deactivation changes are checked on the users' existing (registration) sessions.
 * Register budget (5/60s): 3 (doctor + victim + a patient for the re-submit check) = 3 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

/** A second client holding a copy of tc's session cookies. */
async function cloneSession(tc: TestClient): Promise<TestClient> {
  const clone = createTestClient();
  const url = getServerUrl();
  for (const cookie of await tc.jar.getCookies(url)) {
    await clone.jar.setCookie(cookie.toString(), url);
  }
  return clone;
}

describe('Admin & Verification', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';

  const doctorEmail = `admin-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';

  const victimEmail = `admin-victim-${Date.now()}@test.local`;
  const victimPassword = 'VictimPass456!';

  let adminTc: TestClient;
  let adminApi: ReturnType<typeof createAdminApi>;

  let doctorTc: TestClient;
  let doctorApi: ReturnType<typeof createDoctorApi>;
  let doctorUserId: string;
  let doctorProfileId: number;

  let victimTc: TestClient;
  let victimUserId: string;

  beforeAll(async () => {
    // Login #1: seeded superadmin
    adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    adminApi = createAdminApi(adminTc.axios);

    // Register #1: doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    const docReg = await doctorTc.axios.post('/auth/register', {
      firstname: 'AdminDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorUserId = docReg.data.id;
    doctorApi = createDoctorApi(doctorTc.axios);

    // Create doctor profile + upload document
    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'DERMATOLOGY',
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'Dermatology specialist',
    });
    doctorProfileId = profile.id;

    const pdf = createTestPdf();
    await doctorApi.uploadDocument(pdf, 'license.pdf', 'application/pdf', 'LICENSE');

    // Register #2: victim patient
    victimTc = createTestClient();
    await warmUp(victimTc);
    const victimReg = await victimTc.axios.post('/auth/register', {
      firstname: 'Victim',
      lastname: 'Patient',
      email: victimEmail,
      password: victimPassword,
      role: 'PATIENT',
    });
    victimUserId = victimReg.data.id;
  });

  // ─── List Users ───────────────────────────────────────────────────

  describe('List Users', () => {
    it('should list users with pagination', async () => {
      const result = await adminApi.users.list({ take: 10 });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.take).toBe(10);
    });

    it('should filter users by role', async () => {
      const result = await adminApi.users.list({ role: 'DOCTOR' });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      for (const user of result.data) {
        expect(user.role).toBe('DOCTOR');
      }
    });

    it('should search users by name', async () => {
      const result = await adminApi.users.list({ search: 'AdminDoc' });

      expect(result.data.length).toBeGreaterThanOrEqual(1);
      const found = result.data.find((u: any) => u.email === doctorEmail);
      expect(found).toBeDefined();
    });
  });

  // ─── Pending Doctors & Documents ──────────────────────────────────

  describe('Pending Doctors', () => {
    it('should list unverified doctors with their documents', async () => {
      const pending = await adminApi.verifications.listPending();

      expect(Array.isArray(pending)).toBe(true);
      const found = pending.find((d) => d.user.id === doctorUserId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(doctorProfileId);
      expect(found?.verified).toBe(false);
      expect(found?.user.email).toBe(doctorEmail);
      expect(found?.documents).toHaveLength(1);
      expect(found?.documents[0].type).toBe('LICENSE');
      expect(found?.documents[0].doctorId).toBe(doctorProfileId);
    });

    it('should get doctor documents', async () => {
      const docs = await adminApi.verifications.getDocuments(doctorProfileId);

      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThanOrEqual(1);
      expect(docs[0].mimeType).toBe('application/pdf');
    });
  });

  // ─── Verify Doctor (approve) ──────────────────────────────────────

  describe('Verify Doctor', () => {
    it('should approve a doctor', async () => {
      const result = await adminApi.verifications.verify(doctorProfileId, true);

      expect(result.verified).toBe(true);
      expect(result.verifiedAt).toBeTruthy();
      expect(result.rejectionReason).toBeNull();
    });

    it('should show verified doctor in public listing', async () => {
      const unauthTc = createTestClient();
      const unauthDoctorApi = createDoctorApi(unauthTc.axios);
      const { doctors } = await unauthDoctorApi.getDoctors();

      const found = doctors.find((d: any) => d.id === doctorProfileId);
      expect(found).toBeDefined();
      expect(found.specialty).toBe('DERMATOLOGY');
    });

    it('should remove doctor from pending list after approval', async () => {
      const pending = await adminApi.verifications.listPending();
      const found = pending.find((d) => d.id === doctorProfileId);
      expect(found).toBeUndefined();
    });
  });

  // ─── Update User ──────────────────────────────────────────────────

  describe('Update User', () => {
    it('should update a user\'s name via admin', async () => {
      const updated = await adminApi.users.update(victimUserId, {
        firstname: 'VictimUpdated',
      });

      expect(updated.firstname).toBe('VictimUpdated');
      expect(updated.email).toBe(victimEmail);
    });

    it("should apply a role change to the user's existing session on their next request", async () => {
      expect((await victimTc.axios.get('/nurse/dashboard')).status).toBe(403);

      await adminApi.users.update(victimUserId, { role: 'NURSE' });

      expect((await victimTc.axios.get('/user')).data.role).toBe('NURSE');
      expect((await victimTc.axios.get('/nurse/dashboard')).status).toBe(200);

      await adminApi.users.update(victimUserId, { role: 'PATIENT' });

      expect((await victimTc.axios.get('/user')).data.role).toBe('PATIENT');
      expect((await victimTc.axios.get('/nurse/dashboard')).status).toBe(403);
    });
  });

  // ─── Ban / Unban ──────────────────────────────────────────────────

  describe('Ban & Unban', () => {
    it('should ban a user with reason', async () => {
      const banned = await adminApi.users.ban(victimUserId, 'Violated ToS');

      expect(banned.isBanned).toBe(true);
      expect(banned.banReason).toBe('Violated ToS');
      expect(banned.bannedAt).toBeTruthy();
    });

    it("should reject the banned user's existing session", async () => {
      // A copy, because the guard ends the banned session and victimTc is used again after the unban
      const existingSession = await cloneSession(victimTc);

      const response = await existingSession.axios.get('/user');
      expect(response.status).toBe(403);
      expect(response.data.message).toContain('banned');
    });

    it('should refuse login for the banned user', async () => {
      // Login #2
      const bannedTc = createTestClient();
      await warmUp(bannedTc);
      const response = await bannedTc.axios.post('/auth/login', {
        email: victimEmail,
        password: victimPassword,
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('Violated ToS');
    });

    it('should reject banning already banned user with 400', async () => {
      const response = await adminTc.axios.patch(`/admin/users/${victimUserId}/ban`, {
        reason: 'Double ban',
      });
      expect(response.status).toBe(400);
    });

    it('should unban a user', async () => {
      const unbanned = await adminApi.users.unban(victimUserId);

      expect(unbanned.isBanned).toBe(false);
      expect(unbanned.banReason).toBeNull();
    });
  });

  // ─── Deactivate / Reactivate ──────────────────────────────────────

  describe('Deactivate & Reactivate', () => {
    it('should deactivate a user', async () => {
      const deactivated = await adminApi.users.deactivate(victimUserId);

      expect(deactivated.isActive).toBe(false);
    });

    it("should reject the deactivated user's existing session", async () => {
      const existingSession = await cloneSession(victimTc);

      const response = await existingSession.axios.get('/user');
      expect(response.status).toBe(403);
      expect(response.data.message).toContain('deactivated');
    });

    it('should refuse login for the deactivated user', async () => {
      // Login #3
      const deactivatedTc = createTestClient();
      await warmUp(deactivatedTc);
      const response = await deactivatedTc.axios.post('/auth/login', {
        email: victimEmail,
        password: victimPassword,
      });

      expect(response.status).toBe(403);
      expect(response.data.message).toContain('deactivated');
    });

    it('should reactivate a user via update', async () => {
      const reactivated = await adminApi.users.update(victimUserId, {
        isActive: true,
      });

      expect(reactivated.isActive).toBe(true);
    });
  });

  // ─── Access Control (before promote/demote changes roles) ─────────

  describe('Access Control', () => {
    it('should return 403 when doctor accesses admin endpoints', async () => {
      const usersResponse = await doctorTc.axios.get('/admin/users');
      expect(usersResponse.status).toBe(403);

      const statsResponse = await doctorTc.axios.get('/admin/stats');
      expect(statsResponse.status).toBe(403);

      const pendingResponse = await doctorTc.axios.get('/admin/doctors/pending');
      expect(pendingResponse.status).toBe(403);
    });

    it('should return 401 when unauthenticated user accesses admin endpoints', async () => {
      const unauthTc = createTestClient();
      await warmUp(unauthTc);

      const response = await unauthTc.axios.get('/admin/users');
      expect(response.status).toBe(401);
    });
  });

  // ─── Promote / Demote (Superadmin only) ───────────────────────────

  describe('Promote & Demote', () => {
    it('should promote a user to admin', async () => {
      const promoted = await adminApi.adminActions.promote(victimUserId);

      expect(promoted.isAdmin).toBe(true);
    });

    it("should grant admin access to the promoted user's existing session", async () => {
      const response = await victimTc.axios.get('/admin/users');

      expect(response.status).toBe(200);
      expect((await victimTc.axios.get('/user')).data.isAdmin).toBe(true);
    });

    it('should reject promoting already-admin user', async () => {
      const response = await adminTc.axios.patch(`/admin/users/${victimUserId}/promote`);
      expect(response.status).toBe(400);
    });

    it('should demote an admin', async () => {
      const demoted = await adminApi.adminActions.demote(victimUserId);

      expect(demoted.isAdmin).toBe(false);
    });

    it("should revoke admin access from the demoted user's existing session immediately", async () => {
      const response = await victimTc.axios.get('/admin/users');

      expect(response.status).toBe(403);
      expect((await victimTc.axios.get('/user')).data.isAdmin).toBe(false);
    });
  });

  // ─── Superadmin-only Actions ──────────────────────────────────────

  describe('Superadmin-only Actions', () => {
    let promotedAdminTc: TestClient;

    beforeAll(async () => {
      await adminApi.adminActions.promote(doctorUserId);
      promotedAdminTc = doctorTc;
    });

    it('should allow promoted admin to list users', async () => {
      const promotedAdminApi = createAdminApi(promotedAdminTc.axios);
      const result = await promotedAdminApi.users.list({ take: 5 });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should reject non-superadmin promote attempt with 403', async () => {
      const response = await promotedAdminTc.axios.patch(`/admin/users/${victimUserId}/promote`);
      expect(response.status).toBe(403);
    });

    it('should reject non-superadmin demote attempt with 403', async () => {
      const response = await promotedAdminTc.axios.patch(`/admin/users/${victimUserId}/demote`);
      expect(response.status).toBe(403);
    });

    it('should allow admin to ban non-admin users', async () => {
      const response = await promotedAdminTc.axios.patch(`/admin/users/${victimUserId}/ban`, {
        reason: 'Admin ban test',
      });
      expect(response.status).toBe(200);

      // Cleanup: unban via superadmin
      await adminApi.users.unban(victimUserId);
    });
  });

  // ─── Reject Doctor Verification ───────────────────────────────────

  describe('Reject Doctor Verification', () => {
    it('should reject a doctor with reason', async () => {
      const result = await adminApi.verifications.verify(doctorProfileId, false, 'Insufficient credentials');

      expect(result.verified).toBe(false);
      expect(result.rejectionReason).toBe('Insufficient credentials');
    });

    it('should require reason when rejecting', async () => {
      const response = await adminTc.axios.patch(`/admin/doctors/${doctorProfileId}/verify`, {
        approved: false,
      });

      expect(response.status).toBe(400);
    });

    it('should return 404 for nonexistent doctor verification', async () => {
      const response = await adminTc.axios.patch('/admin/doctors/999999/verify', {
        approved: true,
      });

      expect(response.status).toBe(404);
    });

    it('should require a non-blank reason when rejecting', async () => {
      const response = await adminTc.axios.patch(`/admin/doctors/${doctorProfileId}/verify`, {
        approved: false,
        reason: '   ',
      });

      expect(response.status).toBe(400);
      expect((await doctorApi.getMyProfile()).rejectionReason).toBe('Insufficient credentials');
    });

    it('should leave the rejected doctor out of the pending list', async () => {
      const pending = await adminApi.verifications.listPending();
      expect(pending.find((d) => d.id === doctorProfileId)).toBeUndefined();
    });

    it('should show the doctor the reason and notify them', async () => {
      expect((await doctorApi.getMyProfile()).rejectionReason).toBe('Insufficient credentials');

      // Sent after the response, so it may need a moment to appear.
      const doctorNotif = createNotificationApi(doctorTc.axios);
      const findRejection = async () =>
        (await doctorNotif.list({ take: 100 })).data.find(
          (n) => n.type === 'DOCTOR_VERIFIED' && n.data?.approved === false,
        );
      let rejection = await findRejection();
      for (let i = 0; !rejection && i < 30; i++) {
        await new Promise((r) => setTimeout(r, 100));
        rejection = await findRejection();
      }

      expect(rejection?.data?.reason).toBe('Insufficient credentials');
      expect(rejection?.body).toContain('Insufficient credentials');
    });

    it('should put the doctor back in the pending list once they re-submit', async () => {
      const result = await doctorApi.resubmitForReview();

      expect(result.verified).toBe(false);
      expect(result.rejectionReason).toBeNull();
      const pending = await adminApi.verifications.listPending();
      expect(pending.find((d) => d.id === doctorProfileId)).toBeDefined();
    });

    it('should return 409 when re-submitting a profile already awaiting review', async () => {
      const response = await doctorTc.axios.post('/doctor/profile/resubmit');

      expect(response.status).toBe(409);
    });

    it('should count the doctor as pending while awaiting review, not once rejected', async () => {
      const pending = async () => (await adminApi.stats()).pendingVerifications;
      const awaiting = await pending();

      await adminApi.verifications.verify(doctorProfileId, false, `Blurry scan ${Date.now()}`);
      expect(await pending()).toBe(awaiting - 1);

      await doctorApi.resubmitForReview();
      expect(await pending()).toBe(awaiting);
    });

    it('should return 409 when re-submitting an already verified profile', async () => {
      await adminApi.verifications.verify(doctorProfileId, true);

      const response = await doctorTc.axios.post('/doctor/profile/resubmit');

      expect(response.status).toBe(409);
      expect((await doctorApi.getMyProfile()).verified).toBe(true);
    });

    it('should return 403 when a non-doctor re-submits', async () => {
      const patientTc = createTestClient();
      await warmUp(patientTc);
      await patientTc.axios.post('/auth/register', {
        firstname: 'AdminPat',
        lastname: 'Test',
        email: `admin-pat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        password: victimPassword,
        role: 'PATIENT',
      });

      const response = await patientTc.axios.post('/doctor/profile/resubmit');

      expect(response.status).toBe(403);
    });
  });

  // ─── Platform Stats ───────────────────────────────────────────────

  describe('Platform Stats', () => {
    it('should return platform statistics', async () => {
      const stats = await adminApi.stats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalUsers).toBe('number');
      expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
      expect(typeof stats.totalDoctors).toBe('number');
      expect(typeof stats.totalPatients).toBe('number');
      expect(typeof stats.totalConsultations).toBe('number');
      expect(typeof stats.pendingVerifications).toBe('number');
      expect(typeof stats.activeConsultations).toBe('number');
      expect(typeof stats.bannedUsers).toBe('number');
      expect(typeof stats.totalAppointments).toBe('number');
      expect(typeof stats.newUsersThisMonth).toBe('number');
      expect(stats.totalRevenue).toBeDefined();
    });
  });

  // ─── Self-protection ──────────────────────────────────────────────

  describe('Self-protection', () => {
    it('should not allow superadmin to ban themselves', async () => {
      const me = await createAuthApi(adminTc.axios).me();
      const response = await adminTc.axios.patch(`/admin/users/${me.id}/ban`, {
        reason: 'Self ban',
      });
      expect(response.status).toBe(403);
    });

    it('should not allow superadmin to deactivate themselves', async () => {
      const me = await createAuthApi(adminTc.axios).me();
      const response = await adminTc.axios.patch(`/admin/users/${me.id}/deactivate`);
      expect(response.status).toBe(403);
    });

    it('should not allow superadmin to demote themselves', async () => {
      const me = await createAuthApi(adminTc.axios).me();
      const response = await adminTc.axios.patch(`/admin/users/${me.id}/demote`);
      expect(response.status).toBe(403);
    });
  });
});
