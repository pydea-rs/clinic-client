import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createDoctorApi } from '@client/api/doctor.api';
import type { AxiosInstance } from 'axios';
import FormData from 'form-data';

async function uploadAvatar(client: AxiosInstance, buffer: Buffer, filename: string, mimetype: string) {
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimetype });
  const response = await client.post('/user/avatar', form, { headers: form.getHeaders() });
  return response.data;
}

async function uploadDocument(client: AxiosInstance, buffer: Buffer, filename: string, mimetype: string, docType: string) {
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimetype });
  form.append('type', docType);
  const response = await client.post('/doctor/documents', form, { headers: form.getHeaders() });
  return response.data;
}

/**
 * Phase 16 — File Upload Tests.
 *
 * Tests avatar upload (PNG/JPEG), doctor document upload (PDF),
 * avatar replacement, and rejection of oversized / invalid / spoofed /
 * unauthenticated / empty uploads.
 *
 * Register budget (5/60s): 2 (doctor + patient) = 2 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

function makeFile(magic: Buffer, totalSize: number): Buffer {
  const buf = Buffer.alloc(totalSize);
  magic.copy(buf);
  return buf;
}

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('File Upload', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `upload-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `upload-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let patientTc: TestClient;
  let doctorApi: ReturnType<typeof createDoctorApi>;

  beforeAll(async () => {
    // ── Register + verify doctor ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'UploadDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorApi = createDoctorApi(doctorTc.axios);

    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'Upload test doctor',
    });

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
      firstname: 'UploadPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    // patientUserApi not needed — upload tests use raw axios helpers
  });

  // ─── Happy Paths ──────────────────────────────────────────────────

  describe('Happy Paths', () => {
    it('should upload avatar as PNG', async () => {
      const pngBuffer = makeFile(PNG_MAGIC, 1024);
      const result = await uploadAvatar(patientTc.axios, pngBuffer, 'avatar.png', 'image/png');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.avatar).toBeDefined();
      expect(result.avatar).toContain('/uploads/avatars/');
      expect(result.avatar).toContain('.png');
    });

    it('should upload avatar as JPEG', async () => {
      const jpegBuffer = makeFile(JPEG_MAGIC, 1024);
      const result = await uploadAvatar(patientTc.axios, jpegBuffer, 'photo.jpg', 'image/jpeg');

      expect(result).toBeDefined();
      expect(result.avatar).toBeDefined();
      expect(result.avatar).toContain('/uploads/avatars/');
      expect(result.avatar).toContain('.jpg');
    });

    it('should upload doctor document as PDF', async () => {
      const pdfBuffer = makeFile(PDF_MAGIC, 2048);
      const result = await uploadDocument(doctorTc.axios, pdfBuffer, 'license.pdf', 'application/pdf', 'LICENSE');

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.fileUrl).toContain('/uploads/doctor-documents/');
      expect(result.fileName).toBe('license.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.type).toBe('LICENSE');
    });

    it('should return a valid avatar URL path on upload', async () => {
      const pngBuffer = makeFile(PNG_MAGIC, 1024);
      const result = await uploadAvatar(patientTc.axios, pngBuffer, 'check-url.png', 'image/png');
      expect(result.avatar).toBeDefined();
      expect(typeof result.avatar).toBe('string');
      expect(result.avatar).toContain('/uploads/avatars/');

      const user = await patientTc.axios.get('/user');
      expect(user.data.avatar).toBe(result.avatar);
    });

    it('should replace previous avatar on re-upload', async () => {
      const png1 = makeFile(PNG_MAGIC, 512);
      const result1 = await uploadAvatar(patientTc.axios, png1, 'first.png', 'image/png');
      const url1 = result1.avatar;

      const png2 = makeFile(PNG_MAGIC, 768);
      const result2 = await uploadAvatar(patientTc.axios, png2, 'second.png', 'image/png');
      const url2 = result2.avatar;

      expect(url2).not.toBe(url1);
      expect(url2).toContain('/uploads/avatars/');

      const user = await patientTc.axios.get('/user');
      expect(user.data.avatar).toBe(url2);
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject oversized file (400 or 413)', async () => {
      const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);
      JPEG_MAGIC.copy(bigBuffer);

      const form = new FormData();
      form.append('file', bigBuffer, {
        filename: 'big.jpg',
        contentType: 'image/jpeg',
      });
      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject disallowed MIME type', async () => {
      const textBuffer = Buffer.from('just some plain text content');

      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'readme.txt',
        contentType: 'text/plain',
      });
      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
    });

    it('should reject file with spoofed extension (magic byte mismatch)', async () => {
      const textBuffer = Buffer.from('This is not a real PNG file at all');

      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'fake.png',
        contentType: 'image/png',
      });
      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
    });

    it('should reject upload without authentication', async () => {
      const pngBuffer = makeFile(PNG_MAGIC, 512);
      const unauthTc = createTestClient();
      await warmUp(unauthTc); // acquire CSRF token so the auth guard is what rejects

      const form = new FormData();
      form.append('file', pngBuffer, {
        filename: 'test.png',
        contentType: 'image/png',
      });
      const response = await unauthTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with no file attached', async () => {
      const form = new FormData();
      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
    });
  });
});
