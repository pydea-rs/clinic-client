import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAiAgentsApi } from '../helpers/frontend-api.js';
import { createSSEClient } from '../helpers/sse-client.js';
import { mockBotpress, mockOpenAi, getPrisma } from '../helpers/server.js';

/**
 * Phase 12 — AI Agent Tests (Mocked Botpress/OpenAI).
 *
 * Botpress and OpenAI services are replaced with mocks that return
 * controlled responses. Tests verify endpoint routing, auth guards,
 * validation, SSE setup, SOAP detection via poll, and mock integration.
 *
 * Register budget (5/60s): 1 (patient) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('AI Agents', () => {
  const patientEmail = `ai-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let patientTc: TestClient;
  let patientUserId: string;
  let aiAgents: ReturnType<typeof createAiAgentsApi>;

  let startConvId: string;
  let newConvId: string;
  let dbConvId: string;

  beforeAll(async () => {
    patientTc = createTestClient();
    await warmUp(patientTc);
    const regRes = await patientTc.axios.post('/auth/register', {
      firstname: 'AiPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientUserId =
      regRes.data?.id || (await patientTc.axios.get('/user')).data?.id;
    aiAgents = createAiAgentsApi(patientTc.axios);

    // Insert a conversation into DB for endpoints that verify ownership
    dbConvId = `test-ai-conv-${Date.now()}`;
    const prisma = getPrisma();
    await prisma.aiConversation.create({
      data: { id: dbConvId, userId: patientUserId },
    });
  });

  // ─── Botpress: Start Conversations ────────────────────────────────

  describe('Botpress: Start Conversations', () => {
    it('should start a guest conversation', async () => {
      const guestTc = createTestClient();
      await warmUp(guestTc);
      const guestAi = createAiAgentsApi(guestTc.axios);
      const result = await guestAi.startConversation();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.guest).toBe(true);
    });

    it('should start an authenticated conversation', async () => {
      const result = await aiAgents.startConversation();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(patientUserId);
      expect(result.agentType).toBe('BOTPRESS');
      startConvId = result.id;
    });

    it('should start a new conversation with different ID', async () => {
      const result = await aiAgents.startNewConversation();

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.id).not.toBe(startConvId);
      newConvId = result.id;
    });

    it('should resume a conversation by ID', async () => {
      const result = await aiAgents.resumeConversation(startConvId);

      expect(result).toBeDefined();
      expect(result.id).toBe(startConvId);
    });
  });

  // ─── Botpress: Messaging ──────────────────────────────────────────

  describe('Botpress: Messaging', () => {
    it('should send a message (auto-create conversation)', async () => {
      const response = await patientTc.axios.post('/ai-agents/message', {
        text: 'Hello AI, I feel unwell',
      });

      expect(response.status).toBe(204);
    });

    it('should send a message to explicit conversation', async () => {
      const response = await patientTc.axios.post('/ai-agents/message', {
        conversationId: dbConvId,
        text: 'Follow-up message with explicit ID',
      });

      expect(response.status).toBe(204);
    });

    it('should poll messages and receive bot response', async () => {
      const messages = await aiAgents.getMessages(dbConvId);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0].userId).toBe('bot');
      expect(messages[0].payload).toBeDefined();
      expect(messages[0].payload.text).toBeDefined();
    });

    it('should get conversation history', async () => {
      const history = await aiAgents.getHistory(dbConvId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].role).toBe('bot');
      expect(history[0].text).toBeDefined();
    });
  });

  // ─── Botpress: Conversation Management ────────────────────────────

  describe('Botpress: Conversation Management', () => {
    it('should list conversations', async () => {
      const result = await aiAgents.listConversations();

      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.skip).toBe('number');
      expect(typeof result.take).toBe('number');
    });

    it('should rename a conversation', async () => {
      const result = await aiAgents.renameConversation(
        dbConvId,
        'Headache consultation',
      );

      expect(result).toBeDefined();
      expect(result.topic).toBe('Headache consultation');
      expect(result.id).toBe(dbConvId);
    });
  });

  // ─── Botpress: SSE Stream ─────────────────────────────────────────

  describe('Botpress: SSE Stream', () => {
    it('should receive connected event via SSE', async () => {
      const sseClient = await createSSEClient(
        `/ai-agents/stream/${dbConvId}`,
        patientTc.jar,
      );

      try {
        await sseClient.connect();
        const connectedData = await sseClient.waitForEvent('connected', 5_000);
        const parsed = JSON.parse(connectedData);

        expect(parsed.conversationId).toBe(dbConvId);
        expect(parsed.timestamp).toBeDefined();
      } finally {
        sseClient.close();
      }
    });
  });

  // ─── Botpress: SOAP Detection ─────────────────────────────────────

  describe('Botpress: SOAP Detection', () => {
    it('should detect and create SOAP note from poll response', async () => {
      const soapConvId = `test-soap-conv-${Date.now()}`;
      const prisma = getPrisma();
      await prisma.aiConversation.create({
        data: { id: soapConvId, userId: patientUserId },
      });

      const soapText = [
        '***SOAP***',
        '**Subjective**: Patient reports persistent headache for 3 days, worse in mornings.',
        '**Objective**: BP 120/80, HR 72, Temp 37.0C. No focal deficits.',
        '**Assessment**: Tension headache, likely stress-related.',
        '**Plan**: Rest, ibuprofen 400mg PRN, follow-up in 1 week if persists.',
        '***SOAP***',
      ].join('\n');

      mockBotpress.nextPollMessages = [
        {
          id: `msg-soap-${Date.now()}`,
          userId: 'bot',
          payload: { type: 'text', text: soapText },
          createdAt: new Date().toISOString(),
        },
      ];

      // Poll triggers SOAP detection synchronously in the controller
      await aiAgents.getMessages(soapConvId);

      const soap = await prisma.patientSOAP.findUnique({
        where: { conversationId: soapConvId },
      });

      expect(soap).toBeDefined();
      expect(soap.subjective).toContain('headache');
      expect(soap.objective).toContain('BP 120/80');
      expect(soap.assessment).toContain('Tension headache');
      expect(soap.plan).toContain('ibuprofen');
    });
  });

  // ─── OpenAI Agent ─────────────────────────────────────────────────

  describe('OpenAI Agent', () => {
    it('should create a new OpenAI chat', async () => {
      const callsBefore = mockOpenAi.calls.length;

      const result = await aiAgents.openaiChat('I have a persistent headache');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      const newCalls = mockOpenAi.calls.slice(callsBefore);
      expect(newCalls.some((c: any) => c.method === 'openNewChat')).toBe(true);
    });

    it('should handle independent chat sessions', async () => {
      const callsBefore = mockOpenAi.calls.filter(
        (c: any) => c.method === 'openNewChat',
      ).length;

      await aiAgents.openaiChat('First: headache symptoms');
      await aiAgents.openaiChat('Second: stomach pain');

      const openaiCalls = mockOpenAi.calls.filter(
        (c: any) => c.method === 'openNewChat',
      );
      expect(openaiCalls.length).toBe(callsBefore + 2);

      const lastTwo = openaiCalls.slice(-2);
      expect(lastTwo[0].args[0]).toBe(lastTwo[1].args[0]); // same userId
      expect(lastTwo[0].args[1]).toBe('First: headache symptoms');
      expect(lastTwo[1].args[1]).toBe('Second: stomach pain');
    });
  });

  // ─── Unhappy Paths ────────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject sending to nonexistent conversation (403)', async () => {
      const response = await patientTc.axios.post('/ai-agents/message', {
        conversationId: 'nonexistent-conv-xyz',
        text: 'Should fail',
      });

      expect(response.status).toBe(403);
    });

    it('should reject polling nonexistent conversation (403)', async () => {
      const response = await patientTc.axios.get(
        '/ai-agents/messages/nonexistent-conv-xyz',
      );

      expect(response.status).toBe(403);
    });

    it('should require auth for protected endpoints (401)', async () => {
      const unauthTc = createTestClient();
      await warmUp(unauthTc);
      const response = await unauthTc.axios.get('/ai-agents/conversations');

      expect(response.status).toBe(401);
    });

    it('should reject empty message text (400)', async () => {
      const response = await patientTc.axios.post('/ai-agents/message', {
        text: '',
      });

      expect(response.status).toBe(400);
    });
  });
});
