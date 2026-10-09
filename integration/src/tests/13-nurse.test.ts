import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createChatApi } from '@client/api/chat.api';
import { createConsultationApi } from '@client/api/consultation.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createNurseApi } from '@client/api/nurse.api';
import { createNotificationApi } from '@client/api/notification.api';
import { createSoapApi } from '@client/api/soap.api';
import { getPrisma } from '../helpers/server.js';

/**
 * Phase 14 — Nurse Module Tests.
 *
 * Tests the nurse invitation flow (invite → accept/decline, cancel, re-invite),
 * dashboard, permission updates, and permission enforcement for delegated
 * access (chat, SOAP, consultations).
 *
 * Register budget (5/60s): 5 (doctor + nurseUser + patient + decliner + second doctor) = 5 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

// Notifications are sent after the response, so they may arrive a moment later.
async function expectNotification(tc: TestClient, expected: Record<string, unknown>): Promise<void> {
  await vi.waitFor(
    async () => {
      const { data } = await createNotificationApi(tc.axios).list();
      expect(data).toContainEqual(expect.objectContaining(expected));
    },
    { timeout: 5_000, interval: 100 },
  );
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

  let adminApi: ReturnType<typeof createAdminApi>;
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
    adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(profile.id, true);

    // ── Register nurse user (starts as PATIENT, becomes a NURSE on accepting) ──
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
    it('should invite a patient as a nurse without changing anything for them yet', async () => {
      const result = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'CHAT_WITH_PATIENTS',
        'VIEW_CONSULTATION_NOTES',
      ]);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.isActive).toBe(false);
      expect(result.permissions).toEqual(
        expect.arrayContaining(['VIEW_PATIENTS', 'VIEW_SOAPS', 'CHAT_WITH_PATIENTS', 'VIEW_CONSULTATION_NOTES']),
      );
      expect(result.nurse.id).toBe(nurseUserId);
      assignmentId = result.id;

      expect((await nurseTc.axios.get('/user')).data.role).toBe('PATIENT');
      expect((await nurseTc.axios.get('/nurse/dashboard')).status).toBe(403);

      const invitations = await nurseNurseApi.getInvitations();
      expect(invitations.map((i) => i.id)).toEqual([assignmentId]);
      expect(invitations[0].doctor?.user?.id).toBe(doctorUserId);

      await expectNotification(nurseTc, { type: 'NURSE_INVITATION', data: { assignmentId } });
    });

    it("should show the pending invitation in the doctor's list", async () => {
      const found = (await doctorNurseApi.getAssignments()).find((a) => a.id === assignmentId);

      expect(found).toMatchObject({ status: 'PENDING', isActive: false });
    });

    it('should accept the invitation: the patient becomes a NURSE without re-login', async () => {
      const result = await nurseNurseApi.acceptInvitation(assignmentId);

      expect(result).toMatchObject({ id: assignmentId, status: 'ACCEPTED', isActive: true });
      expect(result.respondedAt).toBeTruthy();
      expect((await nurseTc.axios.get('/user')).data.role).toBe('NURSE');
      expect(await nurseNurseApi.getInvitations()).toEqual([]);

      await expectNotification(doctorTc, {
        type: 'NURSE_INVITATION_ANSWERED',
        data: { assignmentId, accepted: true },
      });
    });

    it('should refuse to accept the same invitation twice (409)', async () => {
      const response = await nurseTc.axios.post(`/nurse/invitations/${assignmentId}/accept`);

      expect(response.status).toBe(409);
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

    it('should re-invite a removed nurse, who must accept again', async () => {
      const result = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);

      expect(result.id).toBe(assignmentId); // same record reused
      expect(result).toMatchObject({ status: 'PENDING', isActive: false });
      expect((await nurseNurseApi.getDashboard()).assignments).toEqual([]);

      const accepted = await nurseNurseApi.acceptInvitation(assignmentId);
      expect(accepted).toMatchObject({ status: 'ACCEPTED', isActive: true });
      expect(accepted.permissions).toEqual(
        expect.arrayContaining(['VIEW_SOAPS', 'CHAT_WITH_PATIENTS']),
      );
    });
  });

  // ─── Invitations ──────────────────────────────────────────────────

  describe('Invitations', () => {
    let declinerTc: TestClient;
    let declinerId: string;
    let invitationId: number;

    beforeAll(async () => {
      declinerTc = createTestClient();
      await warmUp(declinerTc);
      await declinerTc.axios.post('/auth/register', {
        firstname: 'Decliner',
        lastname: 'Test',
        email: `nurse-decl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        password: patientPassword,
        role: 'PATIENT',
      });
      declinerId = (await declinerTc.axios.get('/user')).data?.id;
    });

    it('should let the invitee decline: nothing changes and the doctor is told', async () => {
      invitationId = (await doctorNurseApi.assign(declinerId, ['VIEW_PATIENTS'])).id;

      const declined = await createNurseApi(declinerTc.axios).declineInvitation(invitationId);

      expect(declined).toMatchObject({ id: invitationId, status: 'DECLINED', isActive: false });
      expect((await declinerTc.axios.get('/user')).data.role).toBe('PATIENT');
      expect((await doctorNurseApi.getAssignments()).map((a) => a.id)).not.toContain(invitationId);
      await expectNotification(doctorTc, {
        type: 'NURSE_INVITATION_ANSWERED',
        data: { assignmentId: invitationId, accepted: false },
      });
    });

    it('should not let anyone else answer an invitation (404)', async () => {
      const reinvited = await doctorNurseApi.assign(declinerId, ['VIEW_PATIENTS']);
      expect(reinvited).toMatchObject({ id: invitationId, status: 'PENDING' });

      for (const action of ['accept', 'decline']) {
        const response = await patientTc.axios.post(`/nurse/invitations/${invitationId}/${action}`);
        expect(response.status).toBe(404);
      }
    });

    it('should refuse a second invitation while one is pending (409)', async () => {
      const response = await doctorTc.axios.post('/nurse/assign', { nurseId: declinerId });

      expect(response.status).toBe(409);
    });

    it('should let the doctor cancel a pending invitation, which then cannot be accepted', async () => {
      await doctorNurseApi.remove(invitationId);

      expect(await createNurseApi(declinerTc.axios).getInvitations()).toEqual([]);
      const response = await declinerTc.axios.post(`/nurse/invitations/${invitationId}/accept`);
      expect(response.status).toBe(404);
      expect((await declinerTc.axios.get('/user')).data.role).toBe('PATIENT');
    });

    it('should not let a doctor use the invitee routes (403)', async () => {
      expect((await doctorTc.axios.get('/nurse/invitations')).status).toBe(403);
    });

    it('should require a verified doctor; a pending invitation grants an existing nurse nothing', async () => {
      const secondTc = createTestClient();
      await warmUp(secondTc);
      await secondTc.axios.post('/auth/register', {
        firstname: 'SecondDoc',
        lastname: 'Test',
        email: `nurse-doc2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        password: doctorPassword,
        role: 'DOCTOR',
      });
      const secondDoctorId = (await secondTc.axios.get('/user')).data?.id;
      const profile = await createDoctorApi(secondTc.axios).createProfile({
        startedAt: '2018-01-01T00:00:00.000Z',
        specialty: 'GENERAL',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
        bio: 'Second nurse test doctor',
      });

      const unverified = await secondTc.axios.post('/nurse/assign', { nurseId: nurseUserId });
      expect(unverified.status).toBe(403);
      expect(unverified.data.message).toBe('Only verified doctors can invite nurses.');

      await adminApi.verifications.verify(profile.id, true);
      const invitation = await createNurseApi(secondTc.axios).assign(nurseUserId, ['VIEW_PATIENTS']);
      const doctorsBefore = (await nurseNurseApi.getDashboard()).stats.assignedDoctors;

      expect((await nurseTc.axios.post('/chat', { participantId: secondDoctorId })).status).toBe(403);
      expect((await nurseNurseApi.getAssignments()).map((a) => a.id)).not.toContain(invitation.id);

      await nurseNurseApi.acceptInvitation(invitation.id);

      expect((await nurseNurseApi.getDashboard()).stats.assignedDoctors).toBe(doctorsBefore + 1);
      expect((await nurseTc.axios.post('/chat', { participantId: secondDoctorId })).status).toBe(201);
      expect((await nurseTc.axios.get('/user')).data.role).toBe('NURSE');
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

      // Re-invite and accept for subsequent tests
      const reinvited = await doctorNurseApi.assign(nurseUserId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);
      assignmentId = (await nurseNurseApi.acceptInvitation(reinvited.id)).id;
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

    it("should allow nurse with VIEW_SOAPS to get the doctor's linked SOAP by ID", async () => {
      const soap = await createSoapApi(nurseTc.axios).getById(soapNoteId);

      expect(soap.id).toBe(soapNoteId);
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

    it('should revoke every permission with an empty list but keep the assignment', async () => {
      const result = await doctorNurseApi.updatePermissions(assignmentId, []);

      expect(result.permissions).toEqual([]);
      expect(result.isActive).toBe(true);

      const consultations = await nurseTc.axios.get('/consultation');
      expect(consultations.status).toBe(200);
      expect((consultations.data?.contents || consultations.data).data).toEqual([]);
      expect((await nurseTc.axios.get(`/soap/${soapNoteId}`)).status).toBe(403);
      expect((await nurseTc.axios.post('/chat', { participantId: patientUserId })).status).toBe(403);
      expect((await nurseNurseApi.getAssignment(assignmentId)).isActive).toBe(true);

      // Restore permissions for any future tests
      await doctorNurseApi.updatePermissions(assignmentId, [
        'VIEW_PATIENTS',
        'VIEW_SOAPS',
        'VIEW_CONSULTATION_NOTES',
        'CHAT_WITH_PATIENTS',
      ]);
      // The same chat is allowed once CHAT_WITH_PATIENTS is back, so the 403 came from the empty list.
      expect((await nurseTc.axios.post('/chat', { participantId: patientUserId })).status).toBe(201);
    });

    it('should return 400 for an unknown permission', async () => {
      const response = await doctorTc.axios.patch(
        `/nurse/assignment/${assignmentId}/permissions`,
        { permissions: ['VIEW_EVERYTHING'] },
      );

      expect(response.status).toBe(400);
      expect((await nurseNurseApi.getAssignment(assignmentId)).permissions).toContain('VIEW_SOAPS');
    });
  });
});
