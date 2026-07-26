import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import {
  createNotificationApi,
  createDoctorApi,
  createConsultationApi,
  createAdminApi,
} from '../helpers/frontend-api.js';
import { mockEmail, mockWebPush } from '../helpers/server.js';

/**
 * Phase 13 — Notification Tests.
 *
 * Notifications are side effects of other operations (consultation create,
 * doctor verification, doctor decision). We trigger those operations here
 * and verify the notification endpoints + mock channel captures.
 *
 * Register budget (5/60s): 2 (doctor + patient) = 2 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

async function waitForUnread(
  notifApi: ReturnType<typeof createNotificationApi>,
  minCount: number,
  timeoutMs = 3000,
): Promise<number> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const count = await notifApi.getUnreadCount();
    if (count >= minCount) return count;
    await new Promise((r) => setTimeout(r, 100));
  }
  return notifApi.getUnreadCount();
}

describe('Notifications', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `notif-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `notif-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorUserId: string;
  let doctorNotif: ReturnType<typeof createNotificationApi>;

  let patientTc: TestClient;
  let patientUserId: string;
  let patientNotif: ReturnType<typeof createNotificationApi>;

  let emailCountBefore: number;
  let pushCountBefore: number;

  beforeAll(async () => {
    // Snapshot mock counts before our operations (prior tests may have added entries)
    emailCountBefore = mockEmail.count;
    pushCountBefore = mockWebPush.count;

    // ── Register doctor ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'NotifDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorUserId = (await doctorTc.axios.get('/user')).data?.id;
    doctorNotif = createNotificationApi(doctorTc.axios);

    const doctorApi = createDoctorApi(doctorTc.axios);
    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'Notification test doctor',
    });

    // ── Admin verifies doctor → triggers DOCTOR_VERIFIED notification ──
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(profile.id, true);

    // ── Register patient ──
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'NotifPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientUserId = (await patientTc.axios.get('/user')).data?.id;
    patientNotif = createNotificationApi(patientTc.axios);

    // ── Patient creates consultation → CONSULTATION_REQUEST to doctor ──
    const patientConsultation = createConsultationApi(patientTc.axios);
    const consultation = await patientConsultation.create({
      doctorId: profile.id,
    });

    // ── Doctor decides → DOCTOR_DECISION to patient ──
    const doctorConsultation = createConsultationApi(doctorTc.axios);
    await doctorConsultation.decide(consultation.id, {
      doctorDecision: 'ONLINE',
      visitMethod: 'CHAT',
    });

    // Wait for fire-and-forget notifications to persist
    await waitForUnread(doctorNotif, 2);
    await waitForUnread(patientNotif, 1);
  });

  // ─── Happy: List Notifications ────────────────────────────────────

  describe('Happy Paths', () => {
    it('should list notifications with pagination', async () => {
      const result = await doctorNotif.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(typeof result.total).toBe('number');
      expect(typeof result.skip).toBe('number');
      expect(typeof result.take).toBe('number');

      const first = result.data[0];
      expect(first.id).toBeDefined();
      expect(first.type).toBeDefined();
      expect(first.title).toBeDefined();
      expect(first.body).toBeDefined();
      expect(first.userId).toBe(doctorUserId);
    });

    it('should return unread count > 0', async () => {
      const count = await doctorNotif.getUnreadCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should mark a single notification as read', async () => {
      const countBefore = await doctorNotif.getUnreadCount();
      const list = await doctorNotif.list();
      const unread = list.data.find((n: any) => !n.isRead);
      expect(unread).toBeDefined();

      const updated = await doctorNotif.markAsRead(unread.id);

      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();

      const countAfter = await doctorNotif.getUnreadCount();
      expect(countAfter).toBe(countBefore - 1);
    });

    it('should mark all notifications as read', async () => {
      const result = await doctorNotif.markAllAsRead();

      expect(typeof result.count).toBe('number');

      const countAfter = await doctorNotif.getUnreadCount();
      expect(countAfter).toBe(0);
    });

    it('should contain correct notification types for triggered events', async () => {
      const doctorList = await doctorNotif.list();
      const doctorTypes = doctorList.data.map((n: any) => n.type);

      expect(doctorTypes).toContain('DOCTOR_VERIFIED');
      expect(doctorTypes).toContain('CONSULTATION_REQUEST');

      const patientList = await patientNotif.list();
      const patientTypes = patientList.data.map((n: any) => n.type);

      expect(patientTypes).toContain('DOCTOR_DECISION');
    });

    it('should have captured emails via mock channel', async () => {
      const newEmails = mockEmail.getEmails().slice(emailCountBefore);

      expect(newEmails.length).toBeGreaterThanOrEqual(3);

      const doctorEmails = newEmails.filter(
        (e: any) => e.userId === doctorUserId,
      );
      expect(doctorEmails.length).toBeGreaterThanOrEqual(2);

      const patientEmails = newEmails.filter(
        (e: any) => e.userId === patientUserId,
      );
      expect(patientEmails.length).toBeGreaterThanOrEqual(1);
    });

    it('should have captured push notifications via mock channel', async () => {
      const newPush = mockWebPush.getNotifications().slice(pushCountBefore);

      expect(newPush.length).toBeGreaterThanOrEqual(3);

      const doctorPush = newPush.filter(
        (p: any) => p.userId === doctorUserId,
      );
      expect(doctorPush.length).toBeGreaterThanOrEqual(2);

      const patientPush = newPush.filter(
        (p: any) => p.userId === patientUserId,
      );
      expect(patientPush.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should return 404 for marking nonexistent notification', async () => {
      const response = await doctorTc.axios.patch('/notification/999999/read');

      expect(response.status).toBe(404);
    });

    it('should return 403 for marking another user\'s notification', async () => {
      const patientList = await patientNotif.list();
      const patientNotifId = patientList.data[0]?.id;
      expect(patientNotifId).toBeDefined();

      const response = await doctorTc.axios.patch(
        `/notification/${patientNotifId}/read`,
      );

      expect(response.status).toBe(403);
    });
  });

  // ─── Push Subscription ────────────────────────────────────────────

  describe('Push Subscription', () => {
    const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-sub-12345';

    it('should subscribe to push notifications', async () => {
      await patientNotif.subscribePush({
        endpoint: testEndpoint,
        keys: { p256dh: 'test-p256dh-key', auth: 'test-auth-key' },
      });

      // No error means success (201 Created)
    });

    it('should unsubscribe from push notifications', async () => {
      await patientNotif.unsubscribePush(testEndpoint);

      // No error means success (204 No Content)
    });
  });
});
