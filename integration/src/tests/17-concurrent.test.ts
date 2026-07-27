import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createChatApi } from '@client/api/chat.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createMatchingApi } from '@client/api/matching.api';
import { createPatientApi } from '@client/api/patient.api';
import { createSchedulingApi } from '@client/api/scheduling.api';
import { createUserApi } from '@client/api/user.api';
import {
  createMatchingSocket,
  connectSocket,
  waitForEvent,
  disconnectSocket,
} from '../helpers/ws-client.js';

/**
 * Phase 18 — Concurrent Operations Tests.
 *
 * Tests parallel-safe operations and race conditions.
 * Each test fires multiple requests simultaneously and asserts
 * that the server handles them correctly (no crashes, correct
 * conflict detection, data consistency).
 *
 * Register budget (5/60s): 5 (doctor + 3 patients + profileRacer)
 * Login budget (5/60s): 1 (superadmin)
 *
 * Uses PSYCHIATRY specialty for the doctor to avoid matching
 * collisions with doctors from earlier test phases.
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

function futureMonday(weeksAhead = 2): Date {
  const now = new Date();
  const daysUntilMonday = ((1 - now.getUTCDay()) + 7) % 7 || 7;
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday + (7 * weeksAhead),
    10, 0, 0, 0,
  ));
}

describe('Concurrent Operations', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `conc-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patient1Email = `conc-pat1-${Date.now()}@test.local`;
  const patient1Password = 'PatPass456!';
  const patient2Email = `conc-pat2-${Date.now()}@test.local`;
  const patient2Password = 'PatPass456!';
  const patient3Email = `conc-pat3-${Date.now()}@test.local`;
  const patient3Password = 'PatPass456!';
  const profileRacerEmail = `conc-racer-${Date.now()}@test.local`;
  const profileRacerPassword = 'RacerPass456!';

  let doctorTc: TestClient;
  let doctorProfileId: number;

  let patient1Tc: TestClient;
  let patient1Scheduling: ReturnType<typeof createSchedulingApi>;
  let patient1Matching: ReturnType<typeof createMatchingApi>;
  let patient1Chat: ReturnType<typeof createChatApi>;

  let patient2Tc: TestClient;
  let patient2Scheduling: ReturnType<typeof createSchedulingApi>;

  let patient3Tc: TestClient;
  let patient3Scheduling: ReturnType<typeof createSchedulingApi>;

  let profileRacerTc: TestClient;

  let chatId: string;

  beforeAll(async () => {
    // ── Register doctor (PSYCHIATRY — unique to this test) ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'ConcDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    const doctorApi = createDoctorApi(doctorTc.axios);

    const profile = await doctorApi.createProfile({
      startedAt: '2015-01-01T00:00:00.000Z',
      specialty: 'PSYCHIATRY',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'Concurrent test psychiatrist',
    });
    doctorProfileId = profile.id;

    // ── Verify doctor ──
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(doctorProfileId, true);

    // ── Set up availability + slot duration ──
    const doctorScheduling = createSchedulingApi(doctorTc.axios);
    const monday = futureMonday(3);
    const dayOfWeek = monday.getUTCDay();
    await doctorScheduling.createAvailability({
      dayOfWeek,
      startTime: '08:00',
      endTime: '18:00',
    });
    await doctorScheduling.createSlotDuration({
      minutes: 30,
      price: 50,
      label: 'Concurrent test slot',
    });

    // ── Register patient 1 ──
    patient1Tc = createTestClient();
    await warmUp(patient1Tc);
    await patient1Tc.axios.post('/auth/register', {
      firstname: 'ConcPat1',
      lastname: 'Test',
      email: patient1Email,
      password: patient1Password,
      role: 'PATIENT',
    });
    patient1Scheduling = createSchedulingApi(patient1Tc.axios);
    patient1Matching = createMatchingApi(patient1Tc.axios);
    patient1Chat = createChatApi(patient1Tc.axios);
    await createPatientApi(patient1Tc.axios).createProfile({ allergies: ['None'] });

    // ── Register patient 2 ──
    patient2Tc = createTestClient();
    await warmUp(patient2Tc);
    await patient2Tc.axios.post('/auth/register', {
      firstname: 'ConcPat2',
      lastname: 'Test',
      email: patient2Email,
      password: patient2Password,
      role: 'PATIENT',
    });
    patient2Scheduling = createSchedulingApi(patient2Tc.axios);
    await createPatientApi(patient2Tc.axios).createProfile({ allergies: ['None'] });

    // ── Register patient 3 ──
    patient3Tc = createTestClient();
    await warmUp(patient3Tc);
    await patient3Tc.axios.post('/auth/register', {
      firstname: 'ConcPat3',
      lastname: 'Test',
      email: patient3Email,
      password: patient3Password,
      role: 'PATIENT',
    });
    patient3Scheduling = createSchedulingApi(patient3Tc.axios);
    await createPatientApi(patient3Tc.axios).createProfile({ allergies: ['None'] });

    // ── Register profile racer ──
    profileRacerTc = createTestClient();
    await warmUp(profileRacerTc);
    await profileRacerTc.axios.post('/auth/register', {
      firstname: 'Racer',
      lastname: 'Test',
      email: profileRacerEmail,
      password: profileRacerPassword,
      role: 'PATIENT',
    });

    // ── Create a chat between doctor and patient1 ──
    const doctorUserId = (await doctorTc.axios.get('/user')).data?.id;
    const chat = await patient1Chat.create({
      participantId: doctorUserId,
      topic: 'Concurrent message test',
    });
    chatId = chat.id;
  });

  // ─── Parallel-safe Operations ─────────────────────────────────────

  describe('Parallel-safe Operations', () => {
    it('should handle multiple patients fetching doctor list simultaneously', async () => {
      const results = await Promise.all([
        patient1Tc.axios.get('/doctor'),
        patient2Tc.axios.get('/doctor'),
        patient3Tc.axios.get('/doctor'),
      ]);

      for (const r of results) {
        expect(r.status).toBe(200);
        expect(r.data).toBeDefined();
      }
    });

    it('should handle multiple patients booking different slots simultaneously', async () => {
      const monday = futureMonday(3);

      // Use widely spaced, non-overlapping slots
      const slot1 = new Date(monday);
      slot1.setUTCHours(8, 0, 0, 0);

      const slot2 = new Date(monday);
      slot2.setUTCHours(12, 0, 0, 0);

      const slot3 = new Date(monday);
      slot3.setUTCHours(16, 0, 0, 0);

      // Serializable transactions on the same doctor can trigger P2034
      // even for non-overlapping slots, so some may get 409. All requests
      // should complete without 500 errors.
      const [r1, r2, r3] = await Promise.all([
        patient1Tc.axios.post('/scheduling/book', {
          doctorId: doctorProfileId,
          dateTime: slot1.toISOString(),
          durationMinutes: 30,
          price: 50,
          method: 'CHAT',
        }),
        patient2Tc.axios.post('/scheduling/book', {
          doctorId: doctorProfileId,
          dateTime: slot2.toISOString(),
          durationMinutes: 30,
          price: 50,
          method: 'CHAT',
        }),
        patient3Tc.axios.post('/scheduling/book', {
          doctorId: doctorProfileId,
          dateTime: slot3.toISOString(),
          durationMinutes: 30,
          price: 50,
          method: 'CHAT',
        }),
      ]);

      const responses = [r1, r2, r3];

      // No 500s — server handles concurrency gracefully
      for (const r of responses) {
        expect(r.status).toBeLessThan(500);
      }

      // At least one booking must succeed (201 wrapped as 200 by envelope)
      const successCount = responses.filter(
        (r) => r.status === 200 || r.status === 201,
      ).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Conflicting ones get 409
      const conflictCount = responses.filter((r) => r.status === 409).length;
      expect(successCount + conflictCount).toBe(3);
    });

    it('should handle multiple users sending chat messages simultaneously', async () => {
      const doctorChat = createChatApi(doctorTc.axios);

      const [m1, m2, m3, m4] = await Promise.all([
        patient1Chat.sendMessage(chatId, { content: 'Concurrent msg 1' }),
        doctorChat.sendMessage(chatId, { content: 'Concurrent msg 2' }),
        patient1Chat.sendMessage(chatId, { content: 'Concurrent msg 3' }),
        doctorChat.sendMessage(chatId, { content: 'Concurrent msg 4' }),
      ]);

      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      expect(m3).toBeDefined();
      expect(m4).toBeDefined();

      const { messages } = await patient1Chat.getMessages(chatId, { limit: 50 });
      const contents = messages.map((m: any) => m.content);
      expect(contents).toContain('Concurrent msg 1');
      expect(contents).toContain('Concurrent msg 2');
      expect(contents).toContain('Concurrent msg 3');
      expect(contents).toContain('Concurrent msg 4');

      // Verify message IDs are unique (no duplicates from concurrency)
      const ids = messages.map((m: any) => m.id.toString());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle concurrent login/logout without session interference', async () => {
      const tcA = createTestClient();
      await warmUp(tcA);
      const tcB = createTestClient();
      await warmUp(tcB);

      await Promise.all([
        tcA.axios.post('/auth/login', {
          email: patient1Email,
          password: patient1Password,
        }),
        tcB.axios.post('/auth/login', {
          email: patient2Email,
          password: patient2Password,
        }),
      ]);

      const [userA, userB] = await Promise.all([
        tcA.axios.get('/user'),
        tcB.axios.get('/user'),
      ]);

      expect(userA.data?.email).toBe(patient1Email);
      expect(userB.data?.email).toBe(patient2Email);
    });
  });

  // ─── Race Conditions ──────────────────────────────────────────────

  describe('Race Conditions', () => {
    it('should reject double-booking the same slot (one succeeds, one gets 409)', async () => {
      const monday = futureMonday(4);
      const slotTime = new Date(monday);
      slotTime.setUTCHours(10, 0, 0, 0);

      const bookingPayload = {
        doctorId: doctorProfileId,
        dateTime: slotTime.toISOString(),
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      };

      const [r1, r2] = await Promise.all([
        patient1Tc.axios.post('/scheduling/book', bookingPayload),
        patient2Tc.axios.post('/scheduling/book', bookingPayload),
      ]);

      const codes = [r1.status, r2.status].sort((a, b) => a - b);

      // Envelope interceptor returns 200 for successful 201.
      // One succeeds (200/201), one conflicts (409).
      const successCount = [r1, r2].filter(
        (r) => r.status === 200 || r.status === 201,
      ).length;
      const conflictCount = [r1, r2].filter(
        (r) => r.status === 409,
      ).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);
    });

    it('should handle concurrent profile updates (last write wins, no corruption)', async () => {
      const userApi = createUserApi(profileRacerTc.axios);

      await Promise.all([
        userApi.updateProfile({ firstname: 'Alpha' }),
        userApi.updateProfile({ firstname: 'Beta' }),
        userApi.updateProfile({ firstname: 'Gamma' }),
      ]);

      const user = await userApi.getCurrentUser();
      expect(['Alpha', 'Beta', 'Gamma']).toContain(user.firstname);
      expect(user.lastname).toBe('Test');
    });

    it('should handle doctor accepting match while patient cancels', async () => {
      const patientSocket = await createMatchingSocket(patient1Tc.jar);
      await connectSocket(patientSocket);

      const doctorSocket = await createMatchingSocket(doctorTc.jar);
      await connectSocket(doctorSocket);

      const searchingPromise = waitForEvent<any>(patientSocket, 'match:searching', 10_000);
      const offerPromise = waitForEvent<any>(doctorSocket, 'match:request', 10_000);

      // PSYCHIATRY specialty ensures only our doctor matches
      patientSocket.emit('match:request', { specialty: 'PSYCHIATRY' });

      const [searching, offer] = await Promise.all([
        searchingPromise,
        offerPromise,
      ]);

      const matchId = searching.matchRequestId;
      expect(matchId).toBeDefined();

      // Fire both simultaneously: doctor accepts via WS, patient cancels via REST
      const acceptResultPromise = new Promise<any>((resolve) => {
        const timeout = setTimeout(() => resolve({ event: 'timeout' }), 5000);

        doctorSocket.once('match:accepted', (data: any) => {
          clearTimeout(timeout);
          resolve({ event: 'accepted', data });
        });
        doctorSocket.once('match:error', (data: any) => {
          clearTimeout(timeout);
          resolve({ event: 'error', data });
        });
      });

      const cancelPromise = patient1Tc.axios.patch(`/matching/${matchId}/cancel`);

      doctorSocket.emit('match:accept', { matchRequestId: matchId });

      const [acceptResult, cancelResult] = await Promise.all([
        acceptResultPromise,
        cancelPromise,
      ]);

      // One wins; the other gets an error or conflict.
      // Key assertion: match ends up in a consistent terminal state.
      const status = await patient1Matching.getStatus(matchId);
      const terminalStatuses = ['CONSULTATION_CREATED', 'CANCELLED'];
      expect(terminalStatuses).toContain(status.status);

      await disconnectSocket(patientSocket);
      await disconnectSocket(doctorSocket);
    });
  });
});
