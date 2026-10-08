import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createDoctorApi } from '@client/api/doctor.api';
import type { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { randomBytes, randomUUID } from 'crypto';

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

async function fetchFile(client: AxiosInstance, url: string) {
  return client.get(url, { responseType: 'arraybuffer' });
}

/**
 * Phase 16 — File Upload Tests.
 *
 * Tests avatar upload (PNG/JPEG/WebP; images only), doctor document upload (PDF),
 * avatar replacement (the replaced file is deleted), serving uploaded files (public avatars,
 * doctor documents only for the owning doctor and admins), and rejection
 * of oversized / invalid / spoofed / unauthenticated / empty uploads.
 *
 * Register budget (5/60s): 2 (doctor + patient) = 2 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const webpFile = () =>
  Buffer.concat([Buffer.from('RIFF'), randomBytes(4), Buffer.from('WEBP'), randomBytes(128)]);

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
  let adminTc: TestClient;

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

    adminTc = createTestClient();
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
      expect((await fetchFile(createTestClient().axios, url1)).status).toBe(404);
      expect((await fetchFile(createTestClient().axios, url2)).status).toBe(200);
    });

    it('should upload avatar as WebP', async () => {
      const webp = webpFile();
      const result = await uploadAvatar(patientTc.axios, webp, `${randomUUID()}.webp`, 'image/webp');

      expect(result.avatar).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.webp$/);
      const served = await fetchFile(createTestClient().axios, result.avatar);
      expect(served.headers['content-type']).toBe('image/webp');
      expect(Buffer.from(served.data).equals(webp)).toBe(true);
    });

    it('should delete the uploaded avatar when the profile replaces it with an external URL', async () => {
      const { avatar: uploaded } = await uploadAvatar(
        patientTc.axios,
        Buffer.concat([PNG_MAGIC, randomBytes(64)]),
        'mine.png',
        'image/png',
      );
      const external = `https://cdn.example.com/${randomUUID()}.png`;

      const response = await patientTc.axios.patch('/user/profile', { avatar: external });

      expect(response.status).toBe(200);
      expect((await patientTc.axios.get('/user')).data.avatar).toBe(external);
      expect((await fetchFile(createTestClient().axios, uploaded)).status).toBe(404);
    });
  });

  // ─── Serving Uploaded Files ───────────────────────────────────────

  describe('Serving Uploaded Files', () => {
    it('should serve an uploaded avatar to anyone, byte for byte', async () => {
      const pngBuffer = Buffer.concat([PNG_MAGIC, randomBytes(512)]);
      const { avatar } = await uploadAvatar(patientTc.axios, pngBuffer, 'served.png', 'image/png');

      const response = await fetchFile(createTestClient().axios, avatar);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(Buffer.from(response.data).equals(pngBuffer)).toBe(true);
    });

    it('should store and serve the avatar by its real type, not the uploaded file name', async () => {
      const pngBuffer = Buffer.concat([PNG_MAGIC, randomBytes(64)]);
      const { avatar } = await uploadAvatar(patientTc.axios, pngBuffer, 'avatar.html', 'image/png');

      expect(avatar).toMatch(/\.png$/);
      const response = await fetchFile(patientTc.axios, avatar);
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should serve a doctor document to its doctor and to an admin', async () => {
      const pdfBuffer = Buffer.concat([PDF_MAGIC, randomBytes(256)]);
      const { fileUrl } = await uploadDocument(doctorTc.axios, pdfBuffer, 'id.pdf', 'application/pdf', 'ID_CARD');

      for (const client of [doctorTc, adminTc]) {
        const response = await fetchFile(client.axios, fileUrl);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(Buffer.from(response.data).equals(pdfBuffer)).toBe(true);
      }
    });

    it('should not serve a doctor document to other users or anonymously', async () => {
      const pdfBuffer = Buffer.concat([PDF_MAGIC, randomBytes(256)]);
      const { fileUrl } = await uploadDocument(doctorTc.axios, pdfBuffer, 'license.pdf', 'application/pdf', 'LICENSE');

      expect((await fetchFile(patientTc.axios, fileUrl)).status).toBe(403);
      expect((await fetchFile(createTestClient().axios, fileUrl)).status).toBe(401);
    });

    it('should return 404 for an avatar that was never uploaded', async () => {
      const response = await fetchFile(patientTc.axios, `/uploads/avatars/${randomUUID()}.png`);

      expect(response.status).toBe(404);
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

      expect([400, 413]).toContain(response.status);
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

    it('should reject a PDF avatar and keep the current avatar', async () => {
      const current = Buffer.concat([PNG_MAGIC, randomBytes(64)]);
      const { avatar } = await uploadAvatar(patientTc.axios, current, 'current.png', 'image/png');

      const form = new FormData();
      form.append('file', Buffer.concat([PDF_MAGIC, randomBytes(128)]), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });
      const response = await patientTc.axios.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });

      expect(response.status).toBe(400);
      expect(response.data.message).toBe(
        "Invalid file type 'application/pdf'. Allowed types: image/jpeg, image/png, image/webp.",
      );
      expect((await patientTc.axios.get('/user')).data.avatar).toBe(avatar);
      const served = await fetchFile(createTestClient().axios, avatar);
      expect(served.status).toBe(200);
      expect(Buffer.from(served.data).equals(current)).toBe(true);
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
