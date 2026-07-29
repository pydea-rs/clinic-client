import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAuthApi } from '@client/api/auth.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createTestPdf, createTestPng, createTestTxt } from '../helpers/test-files.js';

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Doctor Module', () => {
  const doctorEmail = `doctor-mod-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `patient-mod-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorApi: ReturnType<typeof createDoctorApi>;
  let doctorProfileId: number;

  let patientTc: TestClient;

  beforeAll(async () => {
    // Register + auto-login doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'DocMod',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorApi = createDoctorApi(doctorTc.axios);

    // Register + auto-login patient
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'PatMod',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
  });

  // ─── Create Doctor Profile ────────────────────────────────────────

  describe('Create Doctor Profile', () => {
    it('should create a doctor profile with specialty and visit methods', async () => {
      const profile = await doctorApi.createProfile({
        startedAt: '2015-06-01T00:00:00.000Z',
        specialty: 'CARDIOLOGY',
        visitMethods: ['CHAT', 'VIDEO_CALL'],
        visitTypes: ['CONSULTATION', 'EXAMINATION'],
        bio: 'Experienced cardiologist',
        clinicLocation: 'Tehran, Iran',
        university: 'Tehran University of Medical Sciences',
        phoneNumber: '+989121234567',
        languages: ['English', 'Persian'],
        licenseNumber: 'MED-12345',
      });

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.specialty).toBe('CARDIOLOGY');
      expect(profile.visitMethods).toEqual(expect.arrayContaining(['CHAT', 'VIDEO_CALL']));
      expect(profile.bio).toBe('Experienced cardiologist');
      expect(profile.clinicLocation).toBe('Tehran, Iran');
      doctorProfileId = profile.id;
    });

    it('should reject duplicate profile creation with 409', async () => {
      const response = await doctorTc.axios.post('/doctor', {
        startedAt: '2018-01-01T00:00:00.000Z',
        specialty: 'DERMATOLOGY',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
      });

      expect(response.status).toBe(409);
    });

    it('should reject patient creating doctor profile with 403', async () => {
      const response = await patientTc.axios.post('/doctor', {
        startedAt: '2020-01-01T00:00:00.000Z',
        specialty: 'NEUROLOGY',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
      });

      expect(response.status).toBe(403);
    });
  });

  // ─── Update Doctor Profile ────────────────────────────────────────

  describe('Update Doctor Profile', () => {
    it('should update bio and visit methods', async () => {
      const updated = await doctorApi.updateProfile({
        bio: 'Senior cardiologist with 10+ years experience',
        visitMethods: ['CHAT', 'VIDEO_CALL', 'ON_SITE'],
      });

      expect(updated.bio).toBe('Senior cardiologist with 10+ years experience');
      expect(updated.visitMethods).toEqual(
        expect.arrayContaining(['CHAT', 'VIDEO_CALL', 'ON_SITE']),
      );
    });

    it('should update secondary specialties', async () => {
      const updated = await doctorApi.updateProfile({
        secondarySpecialties: ['GENERAL', 'NEUROLOGY'],
      });

      expect(updated.secondarySpecialties).toEqual(
        expect.arrayContaining(['GENERAL', 'NEUROLOGY']),
      );
    });
  });

  // ─── Document Upload ──────────────────────────────────────────────

  describe('Document Upload', () => {
    it('should upload a PDF document as LICENSE', async () => {
      const pdf = createTestPdf();
      const doc = await doctorApi.uploadDocument(pdf, 'license.pdf', 'application/pdf', 'LICENSE');

      expect(doc).toBeDefined();
      expect(doc.type).toBe('LICENSE');
      expect(typeof doc.fileUrl).toBe('string');
      expect(doc.fileUrl).toContain('/uploads/doctor-documents/');
      expect(doc.fileName).toBe('license.pdf');
      expect(doc.mimeType).toBe('application/pdf');
    });

    it('should upload a PNG document as ID_CARD', async () => {
      const png = createTestPng();
      const doc = await doctorApi.uploadDocument(png, 'id-card.png', 'image/png', 'ID_CARD');

      expect(doc).toBeDefined();
      expect(doc.type).toBe('ID_CARD');
      expect(doc.mimeType).toBe('image/png');
    });

    it('should reject invalid file type (txt) with 400', async () => {
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      const txt = createTestTxt();
      form.append('file', txt, { filename: 'notes.txt', contentType: 'text/plain' });
      form.append('type', 'OTHER');

      const response = await doctorTc.axios.post('/doctor/documents', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toContain('Invalid file type');
    });
  });

  // ─── Get My Documents ─────────────────────────────────────────────

  describe('Get My Documents', () => {
    it('should return uploaded documents', async () => {
      const docs = await doctorApi.getDocuments();

      expect(Array.isArray(docs)).toBe(true);
      expect(docs.length).toBeGreaterThanOrEqual(2);

      const licenseDoc = docs.find((d: any) => d.type === 'LICENSE');
      expect(licenseDoc).toBeDefined();
      expect(licenseDoc.mimeType).toBe('application/pdf');

      const idDoc = docs.find((d: any) => d.type === 'ID_CARD');
      expect(idDoc).toBeDefined();
    });
  });

  // ─── Get My Profile ───────────────────────────────────────────────

  describe('Get My Profile', () => {
    it('should return complete doctor profile with user info', async () => {
      const profile = await doctorApi.getMyProfile();

      expect(profile).toBeDefined();
      expect(profile.id).toBe(doctorProfileId);
      expect(profile.specialty).toBe('CARDIOLOGY');
      expect(profile.bio).toBe('Senior cardiologist with 10+ years experience');
      expect(profile.user).toBeDefined();
      expect(profile.user.firstname).toBe('DocMod');
      expect(profile.user.lastname).toBe('Test');
      expect(profile.user.email).toBe(doctorEmail);
    });
  });

  // ─── Get Doctor Stats ─────────────────────────────────────────────

  describe('Get Doctor Stats', () => {
    it('should return initial stats (all zeros for a new doctor)', async () => {
      const stats = await doctorApi.getStats();

      expect(stats).toBeDefined();
      expect(stats.upcomingAppointments).toBe(0);
      expect(stats.activeConsultations).toBe(0);
      expect(stats.pendingMatchRequests).toBe(0);
      expect(stats.totalPatientsSeen).toBe(0);
      expect(stats.completedConsultations).toBe(0);
      expect(stats.totalAppointments).toBe(0);
    });
  });

  // ─── Public Doctor Listing ────────────────────────────────────────

  describe('Public Doctor Listing', () => {
    it('should NOT show unverified doctor in public listing', async () => {
      const unauthTc = createTestClient();
      const unauthDoctorApi = createDoctorApi(unauthTc.axios);

      const { doctors } = await unauthDoctorApi.getDoctors();

      const found = doctors.find((d: any) => d.id === doctorProfileId);
      expect(found).toBeUndefined();
    });

    it('should return empty result for filter matching no doctors', async () => {
      const unauthTc = createTestClient();
      const unauthDoctorApi = createDoctorApi(unauthTc.axios);

      const { doctors, total } = await unauthDoctorApi.getDoctors({
        specialty: 'ONCOLOGY',
      });

      // May be empty or contain other verified doctors, but our unverified one shouldn't be there
      const found = doctors.find((d: any) => d.id === doctorProfileId);
      expect(found).toBeUndefined();
    });
  });

  // ─── Get Doctor by ID (public) ────────────────────────────────────

  describe('Get Doctor by ID (public)', () => {
    it('should return 404 for unverified doctor', async () => {
      const unauthTc = createTestClient();
      const response = await unauthTc.axios.get(`/doctor/${doctorProfileId}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for nonexistent doctor ID', async () => {
      const unauthTc = createTestClient();
      const response = await unauthTc.axios.get('/doctor/999999');

      expect(response.status).toBe(404);
    });
  });

  // ─── Error Cases ──────────────────────────────────────────────────

  describe('Validation', () => {
    it('should reject creating profile with invalid specialty enum (400)', async () => {
      const tc = createTestClient();
      await warmUp(tc);
      await tc.axios.post('/auth/register', {
        firstname: 'BadSpec',
        lastname: 'Test',
        email: `badspec-${Date.now()}@test.local`,
        password: 'DocPass456!',
        role: 'DOCTOR',
      });

      const response = await tc.axios.post('/doctor', {
        startedAt: '2020-01-01T00:00:00.000Z',
        specialty: 'RADIOLOGY',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
        bio: 'Invalid specialty',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Error Cases', () => {
    it('should return 401 when accessing doctor endpoints without auth', async () => {
      const unauthTc = createTestClient();
      await warmUp(unauthTc);

      const meResponse = await unauthTc.axios.get('/doctor/me');
      expect(meResponse.status).toBe(401);

      const statsResponse = await unauthTc.axios.get('/doctor/stats');
      expect(statsResponse.status).toBe(401);

      const docsResponse = await unauthTc.axios.get('/doctor/documents');
      expect(docsResponse.status).toBe(401);
    });

    it('should return 403 when patient accesses doctor-only endpoints', async () => {
      const meResponse = await patientTc.axios.get('/doctor/me');
      expect(meResponse.status).toBe(403);

      const statsResponse = await patientTc.axios.get('/doctor/stats');
      expect(statsResponse.status).toBe(403);
    });
  });
});
