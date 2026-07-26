import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import {
  createSoapApi,
  createDoctorApi,
  createConsultationApi,
  createAdminApi,
  createAiAgentsApi,
} from '../helpers/frontend-api.js';
import { getPrisma, mockBotpress } from '../helpers/server.js';

/**
 * Phase 15 — SOAP Notes Tests.
 *
 * Tests SOAP note listing, detail retrieval, AI-flow creation,
 * and ownership enforcement.
 *
 * Register budget (5/60s): 3 (doctor + patient1 + patient2) = 3 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('SOAP Notes', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `soap-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patient1Email = `soap-pat1-${Date.now()}@test.local`;
  const patient1Password = 'PatPass456!';
  const patient2Email = `soap-pat2-${Date.now()}@test.local`;
  const patient2Password = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorProfileId: number;

  let patient1Tc: TestClient;
  let patient1UserId: string;
  let patient1SoapApi: ReturnType<typeof createSoapApi>;

  let patient2Tc: TestClient;

  let consultationId: string;
  let soapNoteId: string;

  beforeAll(async () => {
    // ── Register + verify doctor ──
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'SoapDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });

    const doctorApi = createDoctorApi(doctorTc.axios);
    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'SOAP test doctor',
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

    // ── Register patient1 ──
    patient1Tc = createTestClient();
    await warmUp(patient1Tc);
    await patient1Tc.axios.post('/auth/register', {
      firstname: 'SoapPat1',
      lastname: 'Test',
      email: patient1Email,
      password: patient1Password,
      role: 'PATIENT',
    });
    patient1UserId = (await patient1Tc.axios.get('/user')).data?.id;
    patient1SoapApi = createSoapApi(patient1Tc.axios);

    // ── Register patient2 ──
    patient2Tc = createTestClient();
    await warmUp(patient2Tc);
    await patient2Tc.axios.post('/auth/register', {
      firstname: 'SoapPat2',
      lastname: 'Test',
      email: patient2Email,
      password: patient2Password,
      role: 'PATIENT',
    });

    // ── Patient1 creates consultation → doctor decides ──
    const patientConsultation = createConsultationApi(patient1Tc.axios);
    const consultation = await patientConsultation.create({
      doctorId: doctorProfileId,
    });
    consultationId = consultation.id;

    const doctorConsultation = createConsultationApi(doctorTc.axios);
    await doctorConsultation.decide(consultation.id, {
      doctorDecision: 'ONLINE',
      visitMethod: 'CHAT',
    });

    // ── Create SOAP note via Prisma (simulates AI flow completion) ──
    const prisma = getPrisma();
    const convId = `soap-test-conv-${Date.now()}`;
    await prisma.aiConversation.create({
      data: { id: convId, userId: patient1UserId },
    });
    const soapNote = await prisma.patientSOAP.create({
      data: {
        userId: patient1UserId,
        conversationId: convId,
        rawNote:
          '***SOAP***\nSubjective: Persistent headache for 3 days\nObjective: BP 120/80, HR 72\nAssessment: Tension headache\nPlan: Rest and ibuprofen 400mg PRN\n***SOAP***',
        subjective: 'Patient reports persistent headache for 3 days.',
        objective: 'BP 120/80, HR 72, no neurological deficits.',
        assessment: 'Tension headache, likely stress-related.',
        plan: 'Rest, hydration, ibuprofen 400mg PRN. Follow up if worsening.',
      },
    });
    soapNoteId = soapNote.id;

    // Link SOAP to consultation
    await prisma.consultation.update({
      where: { id: consultationId },
      data: { soapId: soapNote.id },
    });
  });

  // ─── Happy Paths ──────────────────────────────────────────────────

  describe('Happy Paths', () => {
    it('should list patient own SOAPs', async () => {
      const result = await patient1SoapApi.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(typeof result.total).toBe('number');
      expect(typeof result.skip).toBe('number');
      expect(typeof result.take).toBe('number');

      const soap = result.data.find((s: any) => s.id === soapNoteId);
      expect(soap).toBeDefined();
      expect(soap.userId).toBe(patient1UserId);
    });

    it('should include SOAP data in consultation detail for doctor', async () => {
      const doctorConsultation = createConsultationApi(doctorTc.axios);
      const consultation = await doctorConsultation.getConsultationById(
        consultationId,
      );

      expect(consultation).toBeDefined();
      expect(consultation.soap).toBeDefined();
      expect(consultation.soap.id).toBe(soapNoteId);
      expect(consultation.soap.subjective).toContain('headache');
      expect(consultation.soap.assessment).toContain('Tension headache');
    });

    it('should get SOAP by ID with all fields', async () => {
      const soap = await patient1SoapApi.getById(soapNoteId);

      expect(soap).toBeDefined();
      expect(soap.id).toBe(soapNoteId);
      expect(soap.userId).toBe(patient1UserId);
      expect(soap.subjective).toContain('headache');
      expect(soap.objective).toContain('BP 120/80');
      expect(soap.assessment).toContain('Tension headache');
      expect(soap.plan).toContain('ibuprofen');
      expect(soap.rawNote).toContain('***SOAP***');
      expect(soap.createdAt).toBeDefined();
    });

    it('should create SOAP via AI message flow', async () => {
      const prisma = getPrisma();
      const aiConvId = `soap-ai-flow-${Date.now()}`;

      // Create an AiConversation record in DB
      await prisma.aiConversation.create({
        data: { id: aiConvId, userId: patient1UserId },
      });

      // Set mock to return a message with SOAP tags
      mockBotpress.nextPollMessages = [
        {
          id: `msg-soap-${Date.now()}`,
          userId: 'bot',
          payload: {
            type: 'text',
            text: [
              '***SOAP***',
              'Subjective: Patient complains of sore throat and mild fever for 2 days.',
              'Objective: Temperature 37.8°C, pharyngeal erythema, no exudate.',
              'Assessment: Acute viral pharyngitis.',
              'Plan: Symptomatic treatment, warm fluids, paracetamol 500mg. Return if worsening.',
              '***SOAP***',
            ].join('\n'),
          },
          createdAt: new Date().toISOString(),
        },
      ];

      // Poll messages — triggers SOAP detection and upsert
      const aiApi = createAiAgentsApi(patient1Tc.axios);
      const messages = await aiApi.getMessages(aiConvId);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(1);

      // Verify the SOAP was created
      const createdSoap = await prisma.patientSOAP.findUnique({
        where: { conversationId: aiConvId },
      });

      expect(createdSoap).not.toBeNull();
      expect(createdSoap!.userId).toBe(patient1UserId);
      expect(createdSoap!.subjective).toContain('sore throat');
      expect(createdSoap!.assessment).toContain('pharyngitis');
      expect(createdSoap!.plan).toContain('paracetamol');
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should return 403 when another patient accesses SOAP by ID', async () => {
      const response = await patient2Tc.axios.get(`/soap/${soapNoteId}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for nonexistent SOAP', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await patient1Tc.axios.get(`/soap/${fakeId}`);

      expect(response.status).toBe(404);
    });

    it('should return empty list for patient with no SOAP notes', async () => {
      const patient2SoapApi = createSoapApi(patient2Tc.axios);
      const result = await patient2SoapApi.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(0);
    });

    it('should return 401 for unauthenticated SOAP access', async () => {
      const unauthTc = createTestClient();
      const response = await unauthTc.axios.get('/soap');
      expect(response.status).toBe(401);
    });
  });
});
