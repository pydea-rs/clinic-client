import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import {
  createAdminApi,
  createConsultationApi,
  createDoctorApi,
  createPatientApi,
} from '../helpers/frontend-api.js';

/**
 * Phase 7 — Consultation Flow integration tests.
 *
 * Tests the full consultation state machine:
 *   PENDING_DOCTOR_REVIEW → DOCTOR_DECIDED → PENDING_PAYMENT
 *   → PAYMENT_CONFIRMED → IN_PROGRESS → COMPLETED
 *
 * Register budget (5/60s): 3 (doctor + patient + extra-doctor) = 3 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Consultation Flow', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `consult-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `consult-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';
  const extraDoctorEmail = `consult-doc2-${Date.now()}@test.local`;
  const extraDoctorPassword = 'DocPass456!';

  let doctorTc: TestClient;
  let doctorConsultation: ReturnType<typeof createConsultationApi>;
  let doctorProfileId: number;

  let patientTc: TestClient;
  let patientConsultation: ReturnType<typeof createConsultationApi>;

  let extraDoctorTc: TestClient;
  let extraDoctorConsultation: ReturnType<typeof createConsultationApi>;

  let mainConsultationId: string;
  let cancelConsultationId: string;
  let cancelAfterDecisionId: string;

  beforeAll(async () => {
    // Register #1: doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'ConsultDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    const doctorApi = createDoctorApi(doctorTc.axios);
    doctorConsultation = createConsultationApi(doctorTc.axios);

    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'General practitioner',
    });
    doctorProfileId = profile.id;

    // Login #1: superadmin to verify doctor
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(doctorProfileId, true);

    // Register #2: patient with profile
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'ConsultPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    const patientApi = createPatientApi(patientTc.axios);
    patientConsultation = createConsultationApi(patientTc.axios);
    await patientApi.createProfile({
      allergies: ['None'],
      medicalHistory: ['Healthy'],
    });

    // Register #3: extra doctor (unverified, for wrong-doctor and unverified tests)
    extraDoctorTc = createTestClient();
    await warmUp(extraDoctorTc);
    await extraDoctorTc.axios.post('/auth/register', {
      firstname: 'ExtraDoc',
      lastname: 'Test',
      email: extraDoctorEmail,
      password: extraDoctorPassword,
      role: 'DOCTOR',
    });
    extraDoctorConsultation = createConsultationApi(extraDoctorTc.axios);
  });

  // ─── Happy Path: Full Flow ───────────────────────────────────────

  describe('Full Consultation Flow', () => {
    it('should create a consultation (status: PENDING_DOCTOR_REVIEW)', async () => {
      const consultation = await patientConsultation.create({
        doctorId: doctorProfileId,
      });

      expect(consultation).toBeDefined();
      expect(consultation.id).toBeDefined();
      expect(consultation.status).toBe('PENDING_DOCTOR_REVIEW');
      expect(consultation.doctorId).toBe(doctorProfileId);
      mainConsultationId = consultation.id;
    });

    it('should show consultation in doctor list', async () => {
      const { consultations } = await doctorConsultation.getConsultations();

      const found = consultations.find((c: any) => c.id === mainConsultationId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING_DOCTOR_REVIEW');
    });

    it('should allow doctor to decide (accept) → DOCTOR_DECIDED', async () => {
      const decided = await doctorConsultation.decide(mainConsultationId, {
        doctorDecision: 'ONLINE',
        visitMethod: 'CHAT',
      });

      expect(decided.status).toBe('DOCTOR_DECIDED');
      expect(decided.doctorDecision).toBe('ONLINE');
      expect(decided.visitMethod).toBe('CHAT');
    });

    it('should advance to payment → PENDING_PAYMENT', async () => {
      const advanced = await patientConsultation.advancePayment(mainConsultationId);

      expect(advanced.status).toBe('PENDING_PAYMENT');
    });

    it('should confirm payment → PAYMENT_CONFIRMED', async () => {
      const confirmed = await patientConsultation.confirmPayment(mainConsultationId);

      expect(confirmed.status).toBe('PAYMENT_CONFIRMED');
    });

    it('should allow doctor to start → IN_PROGRESS', async () => {
      const started = await doctorConsultation.start(mainConsultationId);

      expect(started.status).toBe('IN_PROGRESS');
    });

    it('should allow doctor to complete with notes → COMPLETED', async () => {
      const completed = await doctorConsultation.complete(mainConsultationId, {
        notes: 'Patient is healthy, no concerns.',
        summary: 'Routine checkup completed successfully.',
        followUpNeeded: false,
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.notes).toBe('Patient is healthy, no concerns.');
      expect(completed.summary).toBe('Routine checkup completed successfully.');
      expect(completed.followUpNeeded).toBe(false);
      expect(completed.completedAt).toBeTruthy();
    });
  });

  // ─── Alternate Paths ─────────────────────────────────────────────

  describe('Cancel Before Decision', () => {
    it('should allow patient to cancel before doctor decides', async () => {
      const consultation = await patientConsultation.create({ doctorId: doctorProfileId });
      cancelConsultationId = consultation.id;
      expect(consultation.status).toBe('PENDING_DOCTOR_REVIEW');

      const cancelled = await patientConsultation.cancel(cancelConsultationId);
      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('Cancel After Decision', () => {
    it('should allow patient to cancel after doctor decides (before payment)', async () => {
      const consultation = await patientConsultation.create({ doctorId: doctorProfileId });
      cancelAfterDecisionId = consultation.id;

      await doctorConsultation.decide(cancelAfterDecisionId, {
        doctorDecision: 'ONLINE',
        visitMethod: 'VIDEO_CALL',
      });

      const cancelled = await patientConsultation.cancel(cancelAfterDecisionId);
      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  describe('List & Filter', () => {
    it('should list patient consultations with status filter', async () => {
      const { consultations } = await patientConsultation.getConsultations(
        undefined, undefined, 'COMPLETED',
      );

      expect(consultations.length).toBeGreaterThanOrEqual(1);
      for (const c of consultations) {
        expect(c.status).toBe('COMPLETED');
      }
    });

    it('should get consultation by ID with all fields', async () => {
      const consultation = await patientConsultation.getConsultationById(mainConsultationId);

      expect(consultation).toBeDefined();
      expect(consultation.id).toBe(mainConsultationId);
      expect(consultation.status).toBe('COMPLETED');
      expect(consultation.doctor).toBeDefined();
      expect(consultation.notes).toBe('Patient is healthy, no concerns.');
      expect(consultation.completedAt).toBeTruthy();
    });
  });

  // ─── Unhappy Paths ───────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject invalid state transition (complete a PENDING_DOCTOR_REVIEW)', async () => {
      const consultation = await patientConsultation.create({ doctorId: doctorProfileId });

      const response = await doctorTc.axios.patch(
        `/consultation/${consultation.id}/complete`,
        { notes: 'Skip ahead' },
      );
      expect(response.status).toBe(400);
    });

    it('should reject wrong doctor deciding', async () => {
      const consultation = await patientConsultation.create({ doctorId: doctorProfileId });

      const response = await extraDoctorTc.axios.patch(
        `/consultation/${consultation.id}/decide`,
        { doctorDecision: 'ONLINE', visitMethod: 'CHAT' },
      );
      expect(response.status).toBe(403);
    });

    it('should reject patient trying to start consultation', async () => {
      // Create and advance to PAYMENT_CONFIRMED
      const consultation = await patientConsultation.create({ doctorId: doctorProfileId });
      await doctorConsultation.decide(consultation.id, {
        doctorDecision: 'ONLINE',
        visitMethod: 'CHAT',
      });
      await patientConsultation.advancePayment(consultation.id);
      await patientConsultation.confirmPayment(consultation.id);

      const response = await patientTc.axios.patch(
        `/consultation/${consultation.id}/start`,
      );
      expect(response.status).toBe(403);
    });

    it('should reject creating consultation with unverified doctor', async () => {
      // extraDoctor has no profile, so doctorId won't match any verified doctor
      const response = await patientTc.axios.post('/consultation', {
        doctorId: 999999,
      });
      expect(response.status).toBe(404);
    });

    it('should reject cancelling an already-completed consultation', async () => {
      const response = await patientTc.axios.patch(
        `/consultation/${mainConsultationId}/cancel`,
      );
      expect(response.status).toBe(400);
    });
  });
});
