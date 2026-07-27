import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createChatApi } from '@client/api/chat.api';
import { createConsultationApi } from '@client/api/consultation.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createNurseApi } from '@client/api/nurse.api';
import { createSoapApi } from '@client/api/soap.api';
import { getPrisma } from '../helpers/server.js';

/**
 * Phase 14 — Nurse Module Tests.
 *
 * Tests nurse assignment CRUD, dashboard, permission updates,
 * reactivation, and permission enforcement for delegated access
 * (chat, SOAP, consultations).
 *
 * Register budget (5/60s): 3 (doctor + nurseUser + patient) = 3 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Nurse Module', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `nurse-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const nurseEmail = `nurse-usr-${Date.now()}@test.local`;
  const nursePassword = 'NursePass456!';
  const patientEmail = `nurse-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorUserId: string;
  let doctorProfileId: number;
  let doctorNurseApi: ReturnType<typeof createNurseApi>;

  let nurseTc: TestClient;
  let nurseUserId: string;
  let nurseNurseApi: ReturnType<typeof createNurseApi>;

  let patientTc: TestClient;
  let patientUserId: string;

  let assignmentId: number;
  let consultationId: string;
  let soapNoteId: string;

  beforeAll(async () => {
    // ── Register + verify doctor ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'NurseDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorUserId = (await doctorTc.axios.get('/user')).data?.id;
    doctorNurseApi = createNurseApi(doctorTc.axios);

    const doctorApi = createDoctorApi(doctorTc.axios);
    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'Nurse test doctor',
    });
    doctorProfileId = profile.id;

    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(profile.id, true);

    // ── Register nurse user (starts as PATIENT, gets upgraded on assign) ──
    nurseTc = createTestClient();
    await warmUp(nurseTc);
    await nurseTc.axios.post('/auth/register', {
      firstname: 'NurseUsr',
      lastname: 'Test',
      email: nurseEmail,
      password: nursePassword,
      role: 'PATIENT',
    });
    nurseUserId = (await nurseTc.axios.get('/user')).data?.id;
    nurseNurseApi = createNurseApi(nurseTc.axios);

    // ── Register patient ──
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'NursePat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientUserId = (await patientTc.axios.get('/user')).data?.id;

    // ── Patient creates consultation with doctor ──
    const patientConsultation = createConsultationApi(patientTc.axios);
    const consultation = await patientConsultation.create({
      doctorId: doctorProfileId,
    });
    consultationId = consultation.id;

    // ── Doctor decides on consultation ──
    const doctorConsultation = createConsultationApi(doctorTc.axios);
    await doctorConsultation.decide(consultation.id, {
      doctorDecision: 'ONLINE',
      visitMethod: 'CHAT',
    });

    // ── Create a SOAP note linked to this consultation (for permission tests) ──
    const prisma = getPrisma();
    const convId = `nurse-test-soap-conv-${Date.now()}`;
    await prisma.aiConversation.create({
      data: { id: convId, userId: patientUserId },
    });
    const soapNote = await prisma.patientSOAP.create({
      data: {
        userId: patientUserId,
        conversationId: convId,
        rawNote: '***SOAP***\nSubjective: Headache\nObjective: BP 120/80\nAssessment: Tension\nPlan: Rest\n***SOAP***',
        subjective: 'Patient reports persistent headache for 3 days.',
        objective: 'BP 120/80, HR 72.',
        assessment: 'Tension headache.',
        plan: 'Rest and ibuprofen 400mg PRN.',
      },
    });
    soapNoteId = soapNote.id;

    await prisma.consultation.update({
      where: { id: consultationId },
      data: { soapId: soapNote.id },
    });
  });

  // ─── Happy Paths ──────────────────────────────────────────────────

  describe('Happy Paths', () => {
    it('should assign nurse with specific permissions', async () => {
      const result = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'CHAT_WITH_PATIENTS',
        'VIEW_CONSULTATION_NOTES',
      ]);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.isActive).toBe(true);
      expect(result.permissions).toContain('VIEW_PATIENTS');
      expect(result.permissions).toContain('VIEW_SOAPS');
      expect(result.permissions).toContain('CHAT_WITH_PATIENTS');
      expect(result.nurse).toBeDefined();
      expect(result.nurse.id).toBe(nurseUserId);
      assignmentId = result.id;

      // Re-login nurse so the session reflects the upgraded NURSE role
      await nurseTc.axios.post('/auth/login', {
        email: nurseEmail,
        password: nursePassword,
      });
      const userResp = await nurseTc.axios.get('/user');
      expect(userResp.data.role).toBe('NURSE');
    });

    it('should list assignments from doctor view', async () => {
      const assignments = await doctorNurseApi.getAssignments();

      expect(Array.isArray(assignments)).toBe(true);
      expect(assignments.length).toBeGreaterThanOrEqual(1);

      const found = assignments.find((a: any) => a.id === assignmentId);
      expect(found).toBeDefined();
      expect(found.nurse.id).toBe(nurseUserId);
      expect(found.isActive).toBe(true);
    });

    it('should list assignments from nurse view', async () => {
      const assignments = await nurseNurseApi.getAssignments();

      expect(Array.isArray(assignments)).toBe(true);
      expect(assignments.length).toBeGreaterThanOrEqual(1);

      const found = assignments.find((a: any) => a.id === assignmentId);
      expect(found).toBeDefined();
      expect(found.doctor).toBeDefined();
    });

    it('should update nurse permissions', async () => {
      const result = await doctorNurseApi.updatePermissions(assignmentId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
      ]);

      expect(result).toBeDefined();
      expect(result.permissions).toContain('VIEW_PATIENTS');
      expect(result.permissions).toContain('VIEW_SOAPS');
      expect(result.permissions).not.toContain('CHAT_WITH_PATIENTS');
    });

    it('should return nurse dashboard data', async () => {
      const dashboard = await nurseNurseApi.getDashboard();

      expect(dashboard).toBeDefined();
      expect(Array.isArray(dashboard.assignments)).toBe(true);
      expect(dashboard.assignments.length).toBeGreaterThanOrEqual(1);
      expect(dashboard.stats).toBeDefined();
      expect(typeof dashboard.stats.assignedDoctors).toBe('number');
      expect(typeof dashboard.stats.upcomingAppointments).toBe('number');
      expect(typeof dashboard.stats.activeConsultations).toBe('number');
      expect(dashboard.stats.assignedDoctors).toBeGreaterThanOrEqual(1);
    });

    it('should get a specific assignment by ID', async () => {
      const assignment = await nurseNurseApi.getAssignment(assignmentId);

      expect(assignment).toBeDefined();
      expect(assignment.id).toBe(assignmentId);
      expect(assignment.isActive).toBe(true);
      expect(assignment.nurse).toBeDefined();
      expect(assignment.doctor).toBeDefined();
    });

    it('should remove (deactivate) an assignment', async () => {
      const result = await doctorNurseApi.remove(assignmentId);

      expect(result).toBeDefined();
      expect(result.isActive).toBe(false);
    });

    it('should reassign the same nurse (reactivation)', async () => {
      const result = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);

      expect(result).toBeDefined();
      expect(result.id).toBe(assignmentId); // same record reactivated
      expect(result.isActive).toBe(true);
      expect(result.permissions).toContain('VIEW_SOAPS');
      expect(result.permissions).toContain('CHAT_WITH_PATIENTS');
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should return 403 when patient tries to assign nurse', async () => {
      const response = await patientTc.axios.post('/nurse/assign', {
        nurseId: nurseUserId,
        permissions: ['VIEW_PATIENTS'],
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 when assigning nonexistent user as nurse', async () => {
      const response = await doctorTc.axios.post('/nurse/assign', {
        nurseId: '00000000-0000-0000-0000-000000000000',
        permissions: ['VIEW_PATIENTS'],
      });

      expect(response.status).toBe(404);
    });

    it('should return 400 for updating permissions on inactive assignment', async () => {
      // Deactivate the assignment
      await doctorNurseApi.remove(assignmentId);

      const response = await doctorTc.axios.patch(
        `/nurse/assignment/${assignmentId}/permissions`,
        { permissions: ['VIEW_PATIENTS'] },
      );

      expect(response.status).toBe(400);

      // Reactivate for subsequent tests
      const reassigned = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);
      assignmentId = reassigned.id;
    });

    it('should return 403 when nurse tries to modify own permissions', async () => {
      const response = await nurseTc.axios.patch(
        `/nurse/assignment/${assignmentId}/permissions`,
        { permissions: ['VIEW_PATIENTS', 'MANAGE_SCHEDULE'] },
      );

      expect(response.status).toBe(403);
    });
  });

  // ─── Permission Enforcement ───────────────────────────────────────

  describe('Permission Enforcement', () => {
    it('should allow nurse with VIEW_CONSULTATION_NOTES to list consultations', async () => {
      const response = await nurseTc.axios.get('/consultation');

      expect(response.status).toBe(200);
      const result = response.data?.contents || response.data;
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 when nurse without CHAT_WITH_PATIENTS creates chat', async () => {
      // Remove CHAT_WITH_PATIENTS permission
      await doctorNurseApi.updatePermissions(assignmentId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
      ]);

      const response = await nurseTc.axios.post('/chat', {
        participantId: patientUserId,
      });

      expect(response.status).toBe(403);
    });

    it('should allow nurse with VIEW_SOAPS to list SOAP notes', async () => {
      const nurseSoapApi = createSoapApi(nurseTc.axios);
      const result = await nurseSoapApi.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(1);

      const soap = result.data.find((s: any) => s.id === soapNoteId);
      expect(soap).toBeDefined();
      expect(soap.subjective).toContain('headache');
    });

    it('should return 403 when nurse without VIEW_SOAPS accesses SOAP by ID', async () => {
      // Remove VIEW_SOAPS permission
      await doctorNurseApi.updatePermissions(assignmentId, [
        'VIEW_PATIENTS',
        'VIEW_CONSULTATION_NOTES',
      ]);

      const response = await nurseTc.axios.get(`/soap/${soapNoteId}`);

      expect(response.status).toBe(403);

      // Restore permissions for any future tests
      await doctorNurseApi.updatePermissions(assignmentId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);
    });
  });
});
