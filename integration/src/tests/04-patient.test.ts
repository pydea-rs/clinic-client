import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createPatientApi } from '../helpers/frontend-api.js';

/**
 * Phase 5 — Patient Profile integration tests.
 *
 * Register budget (5/60s): 2 (patient + doctor) = 2 used
 * Login budget: 0 used (register auto-creates session)
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Patient Profile', () => {
  const patientEmail = `patient-prof-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';
  const doctorEmail = `doctor-prof-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';

  let patientTc: TestClient;
  let patientApi: ReturnType<typeof createPatientApi>;

  let doctorTc: TestClient;

  beforeAll(async () => {
    // Register #1: patient
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'PatProf',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientApi = createPatientApi(patientTc.axios);

    // Register #2: doctor (for role-based rejection tests)
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'DocProf',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
  });

  // ─── Create Patient Profile ──────────────────────────────────────

  describe('Create Patient Profile', () => {
    it('should create a patient profile with medical details', async () => {
      const profile = await patientApi.createProfile({
        location: 'Tehran, Iran',
        bio: 'Test patient for integration tests',
        allergies: ['Penicillin', 'Pollen'],
        medications: ['Aspirin 100mg'],
        medicalHistory: ['Asthma diagnosed 2019'],
        surgeries: ['Appendectomy 2015'],
        familyHistory: ['Diabetes (father)'],
      });

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.location).toBe('Tehran, Iran');
      expect(profile.bio).toBe('Test patient for integration tests');
      expect(profile.allergies).toEqual(expect.arrayContaining(['Penicillin', 'Pollen']));
      expect(profile.medications).toEqual(['Aspirin 100mg']);
      expect(profile.medicalHistory).toEqual(['Asthma diagnosed 2019']);
      expect(profile.surgeries).toEqual(['Appendectomy 2015']);
      expect(profile.familyHistory).toEqual(['Diabetes (father)']);
    });
  });

  // ─── Update Patient Profile ──────────────────────────────────────

  describe('Update Patient Profile', () => {
    it('should update allergies and medications', async () => {
      const updated = await patientApi.updateProfile({
        allergies: ['Penicillin', 'Pollen', 'Dust mites'],
        medications: ['Aspirin 100mg', 'Cetirizine 10mg'],
      });

      expect(updated.allergies).toEqual(
        expect.arrayContaining(['Penicillin', 'Pollen', 'Dust mites']),
      );
      expect(updated.allergies).toHaveLength(3);
      expect(updated.medications).toEqual(
        expect.arrayContaining(['Aspirin 100mg', 'Cetirizine 10mg']),
      );
      expect(updated.medications).toHaveLength(2);
      // Other fields should remain unchanged
      expect(updated.location).toBe('Tehran, Iran');
      expect(updated.bio).toBe('Test patient for integration tests');
    });
  });

  // ─── Get Patient Profile ─────────────────────────────────────────

  describe('Get Patient Profile', () => {
    it('should retrieve the full patient profile', async () => {
      const profile = await patientApi.getProfile();

      expect(profile).toBeDefined();
      expect(profile.location).toBe('Tehran, Iran');
      expect(profile.bio).toBe('Test patient for integration tests');
      expect(profile.allergies).toEqual(
        expect.arrayContaining(['Penicillin', 'Pollen', 'Dust mites']),
      );
      expect(profile.medications).toEqual(
        expect.arrayContaining(['Aspirin 100mg', 'Cetirizine 10mg']),
      );
      expect(profile.medicalHistory).toEqual(['Asthma diagnosed 2019']);
      expect(profile.surgeries).toEqual(['Appendectomy 2015']);
      expect(profile.familyHistory).toEqual(['Diabetes (father)']);
    });
  });

  // ─── Unhappy Paths ───────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject doctor creating patient profile with 403', async () => {
      const response = await doctorTc.axios.post('/patient/profile', {
        location: 'Somewhere',
        allergies: ['None'],
      });

      expect(response.status).toBe(403);
    });

    it('should reject duplicate profile creation with 409', async () => {
      const response = await patientTc.axios.post('/patient/profile', {
        location: 'Duplicate attempt',
      });

      expect(response.status).toBe(409);
    });

    it('should reject unauthenticated access to patient profile with 401', async () => {
      const unauthTc = createTestClient();
      const response = await unauthTc.axios.get('/patient/profile');
      expect(response.status).toBe(401);
    });

    it('should reject patient profile with extra/unknown fields (400)', async () => {
      const response = await patientTc.axios.patch('/patient/profile', {
        allergies: ['None'],
        hackerField: 'malicious',
      });
      expect(response.status).toBe(400);
    });
  });
});
