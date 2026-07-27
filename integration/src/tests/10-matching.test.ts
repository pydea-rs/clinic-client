import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createConsultationApi } from '@client/api/consultation.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createMatchingApi } from '@client/api/matching.api';
import { createPatientApi } from '@client/api/patient.api';
import {
  createMatchingSocket,
  connectSocket,
  waitForEvent,
  disconnectSocket,
} from '../helpers/ws-client.js';
import { Socket } from 'socket.io-client';

/**
 * Phase 11 — Matching integration tests (REST + WebSocket /matching namespace).
 *
 * Both test doctors use CARDIOLOGY specialty so they always score higher than
 * GENERAL doctors from earlier phases. Since tied scores produce a
 * non-deterministic DB ordering, the first test detects which doctor is
 * offered and assigns firstDoc/secondDoc accordingly.
 *
 * After the first accept, firstDoc has +1 consultation → scores strictly
 * higher for the remainder of the suite (until the reject flow which is last).
 *
 * Timeout + browse tests are skipped: the server hard-codes a 5-minute
 * timeout with no config override, making it impractical in integration.
 *
 * Register budget (5/60s): 3 used (doctor1 + doctor2 + patient)
 * Login budget (5/60s): 1 used (superadmin)
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Matching', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';

  const doctor1Email = `match-doc1-${Date.now()}@test.local`;
  const doctor1Password = 'DocPass456!';
  const doctor2Email = `match-doc2-${Date.now()}@test.local`;
  const doctor2Password = 'DocPass456!';
  const patientEmail = `match-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctor1Tc: TestClient;
  let doctor1UserId: string;
  let doctor1ProfileId: number;
  let doctor1Matching: ReturnType<typeof createMatchingApi>;

  let doctor2Tc: TestClient;
  let doctor2UserId: string;
  let doctor2ProfileId: number;
  let doctor2Matching: ReturnType<typeof createMatchingApi>;

  let patientTc: TestClient;
  let patientUserId: string;
  let patientMatching: ReturnType<typeof createMatchingApi>;

  let patientSocket: Socket;
  let doctor1Socket: Socket;
  let doctor2Socket: Socket;

  // Determined dynamically in the first accept-flow test
  let firstDocSocket: Socket;
  let firstDocUserId: string;
  let firstDocProfileId: number;
  let firstDocMatching: ReturnType<typeof createMatchingApi>;
  let secondDocSocket: Socket;
  let secondDocUserId: string;
  let secondDocProfileId: number;

  let acceptFlowMatchId: string;
  let acceptFlowConsultationId: string;

  /**
   * Listen on both doctor sockets for a specific event.
   * Resolves with whichever fires first.
   */
  function waitForEitherDoctor(
    eventName: string,
    timeoutMs = 10_000,
  ): Promise<{ data: any; isDoc1: boolean }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        doctor1Socket.off(eventName, onDoc1);
        doctor2Socket.off(eventName, onDoc2);
        reject(new Error(`Timeout waiting for ${eventName} on either doctor`));
      }, timeoutMs);

      function onDoc1(data: any) {
        clearTimeout(timer);
        doctor2Socket.off(eventName, onDoc2);
        resolve({ data, isDoc1: true });
      }
      function onDoc2(data: any) {
        clearTimeout(timer);
        doctor1Socket.off(eventName, onDoc1);
        resolve({ data, isDoc1: false });
      }

      doctor1Socket.once(eventName, onDoc1);
      doctor2Socket.once(eventName, onDoc2);
    });
  }

  beforeAll(async () => {
    // ── Doctor 1 (CARDIOLOGY) ──
    doctor1Tc = createTestClient();
    await warmUp(doctor1Tc);
    await doctor1Tc.axios.post('/auth/register', {
      firstname: 'MatchDoc1',
      lastname: 'Cardio',
      email: doctor1Email,
      password: doctor1Password,
      role: 'DOCTOR',
    });
    doctor1UserId = (await doctor1Tc.axios.get('/user')).data?.id;
    const doc1Api = createDoctorApi(doctor1Tc.axios);
    doctor1Matching = createMatchingApi(doctor1Tc.axios);

    const profile1 = await doc1Api.createProfile({
      startedAt: '2015-01-01T00:00:00.000Z',
      specialty: 'CARDIOLOGY',
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'Cardiologist for matching tests',
    });
    doctor1ProfileId = profile1.id;

    // ── Doctor 2 (CARDIOLOGY) ──
    doctor2Tc = createTestClient();
    await warmUp(doctor2Tc);
    await doctor2Tc.axios.post('/auth/register', {
      firstname: 'MatchDoc2',
      lastname: 'Cardio2',
      email: doctor2Email,
      password: doctor2Password,
      role: 'DOCTOR',
    });
    doctor2UserId = (await doctor2Tc.axios.get('/user')).data?.id;
    const doc2Api = createDoctorApi(doctor2Tc.axios);
    doctor2Matching = createMatchingApi(doctor2Tc.axios);

    const profile2 = await doc2Api.createProfile({
      startedAt: '2018-01-01T00:00:00.000Z',
      specialty: 'CARDIOLOGY',
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'Cardiologist #2 for matching tests',
    });
    doctor2ProfileId = profile2.id;

    // ── Verify both doctors ──
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(doctor1ProfileId, true);
    await adminApi.verifications.verify(doctor2ProfileId, true);

    // ── Patient ──
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'MatchPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientUserId = (await patientTc.axios.get('/user')).data?.id;
    await createPatientApi(patientTc.axios).createProfile({ allergies: ['None'] });
    patientMatching = createMatchingApi(patientTc.axios);

    // ── WebSocket connections ──
    patientSocket = await createMatchingSocket(patientTc.jar);
    await connectSocket(patientSocket);

    doctor1Socket = await createMatchingSocket(doctor1Tc.jar);
    await connectSocket(doctor1Socket);

    doctor2Socket = await createMatchingSocket(doctor2Tc.jar);
    await connectSocket(doctor2Socket);
  });

  afterAll(async () => {
    if (patientSocket?.connected) await disconnectSocket(patientSocket);
    if (doctor1Socket?.connected) await disconnectSocket(doctor1Socket);
    if (doctor2Socket?.connected) await disconnectSocket(doctor2Socket);
  });

  // ─── Accept Flow ──────────────────────────────────────────

  describe('WebSocket: Accept Flow', () => {
    it('should emit match:searching to patient and offer to a CARDIOLOGY doctor', async () => {
      const searchingPromise = waitForEvent<any>(patientSocket, 'match:searching', 10_000);
      const offerPromise = waitForEitherDoctor('match:request');

      patientSocket.emit('match:request', { specialty: 'CARDIOLOGY' });

      const [searching, { data: offer, isDoc1 }] = await Promise.all([
        searchingPromise,
        offerPromise,
      ]);

      // Assign first/second based on who the server actually offered
      if (isDoc1) {
        firstDocSocket = doctor1Socket;
        firstDocUserId = doctor1UserId;
        firstDocProfileId = doctor1ProfileId;
        firstDocMatching = doctor1Matching;
        secondDocSocket = doctor2Socket;
        secondDocUserId = doctor2UserId;
        secondDocProfileId = doctor2ProfileId;
      } else {
        firstDocSocket = doctor2Socket;
        firstDocUserId = doctor2UserId;
        firstDocProfileId = doctor2ProfileId;
        firstDocMatching = doctor2Matching;
        secondDocSocket = doctor1Socket;
        secondDocUserId = doctor1UserId;
        secondDocProfileId = doctor1ProfileId;
      }

      expect(searching.matchRequestId).toBeDefined();
      expect(searching.candidates).toBeGreaterThanOrEqual(2);
      expect(offer.doctorId).toBe(firstDocProfileId);

      acceptFlowMatchId = searching.matchRequestId;
    });

    it('REST: getActive returns the active match for patient', async () => {
      const active = await patientMatching.getActive();

      expect(active).toBeDefined();
      expect(active.id).toBe(acceptFlowMatchId);
      expect(active.status).toBe('MATCHED');
    });

    it('REST: getPending returns the pending match for doctor', async () => {
      const pending = await firstDocMatching.getPending();

      expect(Array.isArray(pending)).toBe(true);
      const found = pending.find((m: any) => m.id === acceptFlowMatchId);
      expect(found).toBeDefined();
      expect(found.status).toBe('MATCHED');
    });

    it('should accept and emit match:accepted to both parties', async () => {
      const docAcceptedPromise = waitForEvent<any>(firstDocSocket, 'match:accepted', 10_000);
      const patAcceptedPromise = waitForEvent<any>(patientSocket, 'match:accepted', 10_000);

      firstDocSocket.emit('match:accept', { matchRequestId: acceptFlowMatchId });

      const [docAccepted, patAccepted] = await Promise.all([
        docAcceptedPromise,
        patAcceptedPromise,
      ]);

      expect(docAccepted.matchRequestId).toBe(acceptFlowMatchId);
      expect(docAccepted.consultationId).toBeDefined();

      expect(patAccepted.matchRequestId).toBe(acceptFlowMatchId);
      expect(patAccepted.consultationId).toBe(docAccepted.consultationId);
      expect(patAccepted.doctor).toBeDefined();
      expect(patAccepted.doctor.userId).toBe(firstDocUserId);

      acceptFlowConsultationId = docAccepted.consultationId;
    });

    it('should have created a consultation in PENDING_DOCTOR_REVIEW', async () => {
      const consultation = await createConsultationApi(patientTc.axios).getConsultationById(
        acceptFlowConsultationId,
      );

      expect(consultation).toBeDefined();
      expect(consultation.id).toBe(acceptFlowConsultationId);
      expect(consultation.status).toBe('PENDING_DOCTOR_REVIEW');
    });

    it('REST: getStatus shows CONSULTATION_CREATED', async () => {
      const status = await patientMatching.getStatus(acceptFlowMatchId);

      expect(status.status).toBe('CONSULTATION_CREATED');
      expect(status.consultationId).toBe(acceptFlowConsultationId);
    });

    it('REST: getActive returns null after resolution', async () => {
      const active = await patientMatching.getActive();

      expect(active).toBeNull();
    });
  });

  // ─── Cancel Flow ──────────────────────────────────────────
  // firstDoc now has +1 consultation → deterministically offered first

  describe('WebSocket: Cancel Flow', () => {
    let cancelMatchId: string;

    it('should initiate match and offer to doctor', async () => {
      const searchingPromise = waitForEvent<any>(patientSocket, 'match:searching', 10_000);
      const offerPromise = waitForEvent<any>(firstDocSocket, 'match:request', 10_000);

      patientSocket.emit('match:request', { specialty: 'CARDIOLOGY' });

      const [searching, offer] = await Promise.all([searchingPromise, offerPromise]);

      cancelMatchId = searching.matchRequestId;
      expect(offer.matchRequestId).toBe(cancelMatchId);
    });

    it('should cancel and notify both patient and matched doctor', async () => {
      const patCancelledPromise = waitForEvent<any>(patientSocket, 'match:cancelled', 10_000);
      const docCancelledPromise = waitForEvent<any>(firstDocSocket, 'match:cancelled', 10_000);

      patientSocket.emit('match:cancel', { matchRequestId: cancelMatchId });

      const [patCancelled, docCancelled] = await Promise.all([
        patCancelledPromise,
        docCancelledPromise,
      ]);

      expect(patCancelled.matchRequestId).toBe(cancelMatchId);
      expect(docCancelled.matchRequestId).toBe(cancelMatchId);
    });
  });

  // ─── REST Create + Cancel ─────────────────────────────────

  describe('REST: Create & Cancel via HTTP', () => {
    let restMatchId: string;

    it('should create match request via REST', async () => {
      const response = await patientTc.axios.post('/matching/request', {
        specialty: 'CARDIOLOGY',
      });

      expect(response.status).toBe(201);
      const body = response.data;
      expect(body.matchRequest).toBeDefined();
      expect(body.matchRequest.status).toBe('SEARCHING');
      expect(body.matchRequest.patientId).toBe(patientUserId);
      expect(body.doctors).toBeDefined();
      expect(body.doctors.length).toBeGreaterThanOrEqual(2);

      restMatchId = body.matchRequest.id;
    });

    it('should cancel via REST PATCH endpoint', async () => {
      const result = await patientMatching.cancel(restMatchId);

      expect(result.status).toBe('CANCELLED');
      expect(result.resolvedAt).toBeDefined();
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────
  // Run before reject flow so firstDoc still scores strictly higher

  describe('Unhappy Paths', () => {
    it('should reject duplicate active match request (400)', async () => {
      // Create active match
      const searchingPromise = waitForEvent<any>(patientSocket, 'match:searching', 10_000);
      patientSocket.emit('match:request', { specialty: 'CARDIOLOGY' });
      const searching = await searchingPromise;
      const activeId = searching.matchRequestId;

      // Consume doctor offer
      await waitForEvent<any>(firstDocSocket, 'match:request', 10_000);

      // Duplicate via REST → 400
      const response = await patientTc.axios.post('/matching/request', {
        specialty: 'CARDIOLOGY',
      });
      expect(response.status).toBe(400);

      // Clean up: cancel
      const patCancelledPromise = waitForEvent<any>(patientSocket, 'match:cancelled', 10_000);
      const docCancelledPromise = waitForEvent<any>(firstDocSocket, 'match:cancelled', 10_000);
      patientSocket.emit('match:cancel', { matchRequestId: activeId });
      await Promise.all([patCancelledPromise, docCancelledPromise]);
    });

    it('should error when non-doctor tries match:accept via WebSocket', async () => {
      const errorPromise = waitForEvent<any>(patientSocket, 'match:error', 10_000);

      patientSocket.emit('match:accept', { matchRequestId: acceptFlowMatchId });

      const error = await errorPromise;
      expect(error.message).toBeDefined();
    });

    it('should error when doctor accepts already-resolved match', async () => {
      const errorPromise = waitForEvent<any>(firstDocSocket, 'match:error', 10_000);

      firstDocSocket.emit('match:accept', { matchRequestId: acceptFlowMatchId });

      const error = await errorPromise;
      expect(error.message).toBeDefined();
    });

    it('should reject WebSocket connection without auth', async () => {
      const { io } = await import('socket.io-client');
      const { getServerUrl } = await import('../helpers/server.js');
      const unauthSocket = io(`${getServerUrl()}/matching`, {
        transports: ['websocket'],
        autoConnect: false,
      });

      await expect(
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5_000);
          unauthSocket.on('connect', () => {
            clearTimeout(timeout);
            unauthSocket.disconnect();
            reject(new Error('Should not have connected'));
          });
          unauthSocket.on('connect_error', () => {
            clearTimeout(timeout);
            resolve();
          });
          unauthSocket.connect();
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ─── Reject → Next Doctor ─────────────────────────────────
  // Last group: firstDoc has +1 consultation → deterministically offered first.
  // After this, both doctors have +1, so equal scores; no subsequent tests depend on order.

  describe('WebSocket: Reject → Next Doctor', () => {
    let rejectMatchId: string;

    it('should initiate match, firstDoc offered', async () => {
      const searchingPromise = waitForEvent<any>(patientSocket, 'match:searching', 10_000);
      const offerPromise = waitForEvent<any>(firstDocSocket, 'match:request', 10_000);

      patientSocket.emit('match:request', { specialty: 'CARDIOLOGY' });

      const [searching, offer] = await Promise.all([searchingPromise, offerPromise]);

      rejectMatchId = searching.matchRequestId;
      expect(offer.doctorId).toBe(firstDocProfileId);
    });

    it('firstDoc rejects → receives rejected, secondDoc offered next', async () => {
      const rejectedPromise = waitForEvent<any>(firstDocSocket, 'match:rejected', 10_000);
      const nextOfferPromise = waitForEvent<any>(secondDocSocket, 'match:request', 10_000);

      firstDocSocket.emit('match:reject', { matchRequestId: rejectMatchId });

      const [rejected, nextOffer] = await Promise.all([rejectedPromise, nextOfferPromise]);

      expect(rejected.matchRequestId).toBe(rejectMatchId);
      expect(nextOffer.matchRequestId).toBe(rejectMatchId);
      expect(nextOffer.doctorId).toBe(secondDocProfileId);
    });

    it('secondDoc accepts → both receive match:accepted', async () => {
      const docAcceptedPromise = waitForEvent<any>(secondDocSocket, 'match:accepted', 10_000);
      const patAcceptedPromise = waitForEvent<any>(patientSocket, 'match:accepted', 10_000);

      secondDocSocket.emit('match:accept', { matchRequestId: rejectMatchId });

      const [docAccepted, patAccepted] = await Promise.all([
        docAcceptedPromise,
        patAcceptedPromise,
      ]);

      expect(docAccepted.matchRequestId).toBe(rejectMatchId);
      expect(docAccepted.consultationId).toBeDefined();
      expect(patAccepted.matchRequestId).toBe(rejectMatchId);
      expect(patAccepted.consultationId).toBe(docAccepted.consultationId);
      expect(patAccepted.doctor.userId).toBe(secondDocUserId);
    });
  });

});
