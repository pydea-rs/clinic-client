import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createConsultationApi } from '@client/api/consultation.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createPatientApi } from '@client/api/patient.api';
import { createPaymentApi } from '@client/api/payment.api';

/**
 * Phase 8 — Payment integration tests.
 *
 * Payment is a stub (no real provider), but flow + access control matter.
 *
 * Register budget (5/60s): 2 (doctor + patient) = 2 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Payment', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `pay-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `pay-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorConsultation: ReturnType<typeof createConsultationApi>;
  let doctorProfileId: number;

  let patientTc: TestClient;
  let patientPayment: ReturnType<typeof createPaymentApi>;
  let patientConsultation: ReturnType<typeof createConsultationApi>;

  let consultationId: string;
  let consultationId2: string;
  let paymentId: number;

  beforeAll(async () => {
    // Register #1: doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'PayDoc',
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
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'GP',
    });
    doctorProfileId = profile.id;

    // Verify doctor
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    await createAdminApi(adminTc.axios).verifications.verify(doctorProfileId, true);

    // Register #2: patient
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'PayPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    await createPatientApi(patientTc.axios).createProfile({ allergies: ['None'] });
    patientPayment = createPaymentApi(patientTc.axios);
    patientConsultation = createConsultationApi(patientTc.axios);

    // Create consultation #1 and advance to PENDING_PAYMENT
    const c1 = await patientConsultation.create({ doctorId: doctorProfileId });
    consultationId = c1.id;
    await doctorConsultation.decide(consultationId, {
      doctorDecision: 'ONLINE',
      visitMethod: 'CHAT',
    });
    await patientConsultation.advancePayment(consultationId);

    // Create consultation #2 and advance to PENDING_PAYMENT (for duplicate test)
    const c2 = await patientConsultation.create({ doctorId: doctorProfileId });
    consultationId2 = c2.id;
    await doctorConsultation.decide(consultationId2, {
      doctorDecision: 'ONLINE',
      visitMethod: 'CHAT',
    });
    await patientConsultation.advancePayment(consultationId2);
  });

  // ─── Happy Paths ─────────────────────────────────────────────────

  describe('Create Payment', () => {
    it('should create a payment linked to a consultation', async () => {
      const payment = await patientPayment.create({
        consultationId,
        amount: 50,
        method: 'credit_card',
      });

      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.status).toBe('PENDING');
      expect(Number(payment.amount)).toBe(50);
      expect(payment.currency).toBe('USD');
      paymentId = payment.id;
    });
  });

  describe('List Payments', () => {
    it('should list patient payments', async () => {
      const result = await patientPayment.list();

      expect(result).toBeDefined();
      const payments = result.data || result;
      expect(Array.isArray(payments)).toBe(true);
      expect(payments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Get Payment', () => {
    it('should get payment by ID', async () => {
      const payment = await patientPayment.getById(paymentId);

      expect(payment).toBeDefined();
      expect(payment.id).toBe(paymentId);
      expect(payment.status).toBe('PENDING');
      expect(Number(payment.amount)).toBe(50);
    });
  });

  describe('Confirm Payment', () => {
    it('should confirm a payment → COMPLETED', async () => {
      const confirmed = await patientPayment.confirm(paymentId);

      expect(confirmed.status).toBe('COMPLETED');
      expect(typeof confirmed.paidAt).toBe('string');
      expect(new Date(confirmed.paidAt!).toISOString()).toBe(confirmed.paidAt);
    });

    it('should also update linked consultation to PAYMENT_CONFIRMED', async () => {
      const consultation = await patientConsultation.getConsultationById(consultationId);
      expect(consultation.status).toBe('PAYMENT_CONFIRMED');
    });
  });

  describe('Filter Payments', () => {
    it('should filter payments by COMPLETED status', async () => {
      const result = await patientPayment.list({ status: 'COMPLETED' });

      const payments = result.data || result;
      expect(Array.isArray(payments)).toBe(true);
      for (const p of payments) {
        expect(p.status).toBe('COMPLETED');
      }
    });
  });

  // ─── Unhappy Paths ───────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject duplicate payment for same consultation with 409', async () => {
      const response = await patientTc.axios.post('/payment', {
        consultationId,
        amount: 50,
      });
      expect(response.status).toBe(409);
    });

    it('should reject confirming already-confirmed payment', async () => {
      const response = await patientTc.axios.post(`/payment/${paymentId}/confirm`);
      expect(response.status).toBe(409);
    });

    it('should reject access to other user payment with 403', async () => {
      const response = await doctorTc.axios.get(`/payment/${paymentId}`);
      expect(response.status).toBe(403);
    });

    it('should reject creating payment with invalid consultation UUID with 404', async () => {
      const response = await patientTc.axios.post('/payment', {
        consultationId: '00000000-0000-0000-0000-000000000000',
        amount: 50,
      });
      expect(response.status).toBe(404);
    });

    it('should reject zero amount payment with 400', async () => {
      const response = await patientTc.axios.post('/payment', {
        consultationId: consultationId2,
        amount: 0,
      });
      expect(response.status).toBe(400);
    });

    it('should reject negative amount payment with 400', async () => {
      const response = await patientTc.axios.post('/payment', {
        consultationId: consultationId2,
        amount: -50,
      });
      expect(response.status).toBe(400);
    });

    it('should reject doctor creating payment with 403', async () => {
      const response = await doctorTc.axios.post('/payment', {
        consultationId: consultationId2,
        amount: 50,
      });
      expect(response.status).toBe(403);
    });
  });
});
