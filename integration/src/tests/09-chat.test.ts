import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import {
  createAdminApi,
  createChatApi,
  createDoctorApi,
  createPatientApi,
} from '../helpers/frontend-api.js';
import {
  createChatSocket,
  connectSocket,
  waitForEvent,
  disconnectSocket,
} from '../helpers/ws-client.js';
import { Socket } from 'socket.io-client';

/**
 * Phase 10 — Chat integration tests (HTTP + WebSocket).
 *
 * Tests both REST endpoints and Socket.IO /chat namespace real-time events.
 *
 * Register budget (5/60s): 3 (doctor + patient + extra-patient) = 3 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

describe('Chat', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `chat-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `chat-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';
  const extraPatientEmail = `chat-pat2-${Date.now()}@test.local`;
  const extraPatientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorUserId: string;
  let doctorChat: ReturnType<typeof createChatApi>;

  let patientTc: TestClient;
  let patientUserId: string;
  let patientChat: ReturnType<typeof createChatApi>;

  let extraPatientTc: TestClient;
  let extraPatientUserId: string;

  let chatId: string;
  let firstMessageId: string;

  // WebSocket clients
  let patientSocket: Socket;
  let doctorSocket: Socket;

  beforeAll(async () => {
    // Register #1: doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    const docRegRes = await doctorTc.axios.post('/auth/register', {
      firstname: 'ChatDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    doctorUserId = docRegRes.data?.id || (await doctorTc.axios.get('/user')).data?.id;
    const doctorApi = createDoctorApi(doctorTc.axios);
    doctorChat = createChatApi(doctorTc.axios);

    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT'],
      visitTypes: ['CONSULTATION'],
      bio: 'GP',
    });

    // Login #1: superadmin to verify doctor
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    await createAdminApi(adminTc.axios).verifications.verify(profile.id, true);

    // Register #2: patient
    patientTc = createTestClient();
    await warmUp(patientTc);
    const patRegRes = await patientTc.axios.post('/auth/register', {
      firstname: 'ChatPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientUserId = patRegRes.data?.id || (await patientTc.axios.get('/user')).data?.id;
    await createPatientApi(patientTc.axios).createProfile({ allergies: ['None'] });
    patientChat = createChatApi(patientTc.axios);

    // Register #3: extra patient (for patient↔patient rejection test)
    extraPatientTc = createTestClient();
    await warmUp(extraPatientTc);
    const epRegRes = await extraPatientTc.axios.post('/auth/register', {
      firstname: 'ExtraPat',
      lastname: 'Test',
      email: extraPatientEmail,
      password: extraPatientPassword,
      role: 'PATIENT',
    });
    extraPatientUserId = epRegRes.data?.id || (await extraPatientTc.axios.get('/user')).data?.id;
  });

  afterAll(async () => {
    if (patientSocket?.connected) await disconnectSocket(patientSocket);
    if (doctorSocket?.connected) await disconnectSocket(doctorSocket);
  });

  // ─── HTTP Happy Paths ──────────────────────────────────────────

  describe('HTTP: Create Chat', () => {
    it('should create a chat between patient and doctor', async () => {
      const chat = await patientChat.create({ participantId: doctorUserId });

      expect(chat).toBeDefined();
      expect(chat.id).toBeDefined();
      chatId = chat.id;
      expect(chat.participants).toBeDefined();
    });

    it('should return existing chat on duplicate create', async () => {
      const chat2 = await patientChat.create({ participantId: doctorUserId });

      expect(chat2.id).toBe(chatId);
    });
  });

  describe('HTTP: List Chats', () => {
    it('should list chats for patient', async () => {
      const { chats } = await patientChat.list();

      expect(chats.length).toBeGreaterThanOrEqual(1);
      const found = chats.find((c: any) => c.id === chatId);
      expect(found).toBeDefined();
    });

    it('should list chats for doctor', async () => {
      const { chats } = await doctorChat.list();

      expect(chats.length).toBeGreaterThanOrEqual(1);
      const found = chats.find((c: any) => c.id === chatId);
      expect(found).toBeDefined();
    });
  });

  describe('HTTP: Get Chat', () => {
    it('should get chat by ID with participants', async () => {
      const chat = await patientChat.getById(chatId);

      expect(chat).toBeDefined();
      expect(chat.id).toBe(chatId);
      const participants = chat.participants ?? [];
      expect(participants.length).toBe(2);
    });
  });

  describe('HTTP: Send Message', () => {
    it('should send a text message via HTTP', async () => {
      const message = await patientChat.sendMessage(chatId, {
        content: 'Hello doctor, I have a question.',
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello doctor, I have a question.');
      firstMessageId = message.id;
    });

    it('should send a reply from doctor', async () => {
      const message = await doctorChat.sendMessage(chatId, {
        content: 'Sure, how can I help?',
      });

      expect(message).toBeDefined();
      expect(message.content).toBe('Sure, how can I help?');
    });
  });

  describe('HTTP: Get Messages', () => {
    it('should return messages with correct content', async () => {
      const { messages } = await patientChat.getMessages(chatId);

      expect(messages.length).toBeGreaterThanOrEqual(2);
      const contents = messages.map((m: any) => m.content);
      expect(contents).toContain('Hello doctor, I have a question.');
      expect(contents).toContain('Sure, how can I help?');
    });

    it('should paginate messages', async () => {
      // Send a few more messages to have enough for pagination
      await patientChat.sendMessage(chatId, { content: 'Message 3' });
      await patientChat.sendMessage(chatId, { content: 'Message 4' });

      const { messages } = await patientChat.getMessages(chatId, { page: 1, limit: 2 });
      expect(messages.length).toBe(2);
    });
  });

  // ─── WebSocket Happy Paths ─────────────────────────────────────

  describe('WebSocket: Connect', () => {
    it('should connect patient to /chat namespace', async () => {
      patientSocket = await createChatSocket(patientTc.jar);
      await connectSocket(patientSocket);

      expect(patientSocket.connected).toBe(true);
    });

    it('should connect doctor to /chat namespace', async () => {
      doctorSocket = await createChatSocket(doctorTc.jar);
      await connectSocket(doctorSocket);

      expect(doctorSocket.connected).toBe(true);
    });
  });

  describe('WebSocket: Join & Message', () => {
    it('should join chat room', async () => {
      patientSocket.emit('chat:join', { chatId });
      doctorSocket.emit('chat:join', { chatId });
      await new Promise((r) => setTimeout(r, 300));

      expect(patientSocket.connected).toBe(true);
      expect(doctorSocket.connected).toBe(true);
    });

    it('should receive message via WebSocket when sent', async () => {
      const doctorReceive = waitForEvent<any>(doctorSocket, 'chat:message', 10_000);

      patientSocket.emit('chat:message', {
        chatId,
        content: 'Hello via WebSocket!',
      });

      const received = await doctorReceive;
      expect(received).toBeDefined();
      expect(received.message).toBeDefined();
      expect(received.message.content).toBe('Hello via WebSocket!');
    });

    it('should receive bidirectional messages', async () => {
      const patientReceive = waitForEvent<any>(patientSocket, 'chat:message', 10_000);

      doctorSocket.emit('chat:message', {
        chatId,
        content: 'Doctor reply via WS',
      });

      const received = await patientReceive;
      expect(received.message.content).toBe('Doctor reply via WS');
    });
  });

  describe('WebSocket: Typing Indicator', () => {
    it('should receive typing indicator', async () => {
      const doctorReceive = waitForEvent<any>(doctorSocket, 'chat:typing', 10_000);

      patientSocket.emit('chat:typing', {
        chatId,
        isTyping: true,
      });

      const received = await doctorReceive;
      expect(received).toBeDefined();
      expect(received.userId).toBe(patientUserId);
      expect(received.isTyping).toBe(true);
    });
  });

  describe('WebSocket: Read Receipt', () => {
    it('should receive read receipt', async () => {
      // First, get the latest messages so we have a valid message ID
      const { messages } = await patientChat.getMessages(chatId);
      const lastMessage = messages[0]; // most recent

      const patientReceive = waitForEvent<any>(patientSocket, 'chat:read', 10_000);

      doctorSocket.emit('chat:read', {
        chatId,
        messageId: lastMessage.id.toString(),
      });

      const received = await patientReceive;
      expect(received).toBeDefined();
      expect(received.userId).toBe(doctorUserId);
      expect(received.chatId).toBe(chatId);
    });
  });

  describe('WebSocket: Edit Message', () => {
    it('should edit a message and broadcast', async () => {
      // Send a message we'll edit
      const sentPromise = waitForEvent<any>(patientSocket, 'chat:message', 10_000);
      patientSocket.emit('chat:message', {
        chatId,
        content: 'Message to edit',
      });
      const sentEvent = await sentPromise;
      const messageId = sentEvent.message.id;

      const editedPromise = waitForEvent<any>(doctorSocket, 'chat:edited', 10_000);

      patientSocket.emit('chat:edit', {
        messageId: messageId.toString(),
        content: 'Edited message content',
      });

      const edited = await editedPromise;
      expect(edited.message).toBeDefined();
      expect(edited.message.content).toBe('Edited message content');
      expect(edited.message.editedAt).toBeTruthy();
    });
  });

  describe('WebSocket: Delete Message', () => {
    it('should delete a message and broadcast', async () => {
      // Send a message we'll delete
      const sentPromise = waitForEvent<any>(patientSocket, 'chat:message', 10_000);
      patientSocket.emit('chat:message', {
        chatId,
        content: 'Message to delete',
      });
      const sentEvent = await sentPromise;
      const messageId = sentEvent.message.id;

      const deletedPromise = waitForEvent<any>(doctorSocket, 'chat:deleted', 10_000);

      patientSocket.emit('chat:delete', {
        messageId: messageId.toString(),
      });

      const deleted = await deletedPromise;
      expect(deleted.message).toBeDefined();
      expect(deleted.message.deletedAt).toBeTruthy();
    });
  });

  // ─── Unhappy Paths ─────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject creating chat with nonexistent user (404)', async () => {
      const response = await patientTc.axios.post('/chat', {
        participantId: '00000000-0000-0000-0000-000000000000',
      });
      expect(response.status).toBe(404);
    });

    it('should reject creating chat with self (400)', async () => {
      const response = await patientTc.axios.post('/chat', {
        participantId: patientUserId,
      });
      expect(response.status).toBe(400);
    });

    it('should reject patient↔patient chat (400)', async () => {
      const response = await patientTc.axios.post('/chat', {
        participantId: extraPatientUserId,
      });
      expect(response.status).toBe(400);
    });

    it('should reject sending message to chat user is not part of (403)', async () => {
      const response = await extraPatientTc.axios.post(`/chat/${chatId}/message`, {
        content: 'I should not be able to send this',
      });
      expect(response.status).toBe(403);
    });

    it('should reject getting chat details for non-member', async () => {
      const response = await extraPatientTc.axios.get(`/chat/${chatId}`);
      expect([400, 403]).toContain(response.status);
    });

    it('should reject getting messages for chat non-member', async () => {
      const response = await extraPatientTc.axios.get(`/chat/${chatId}/messages`);
      expect([400, 403]).toContain(response.status);
    });

    it('should reject WebSocket connection without auth', async () => {
      const { io } = await import('socket.io-client');
      const { getServerUrl } = await import('../helpers/server.js');
      const unauthSocket = io(`${getServerUrl()}/chat`, {
        transports: ['websocket'],
        autoConnect: false,
      });

      await expect(
        new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5_000);
          unauthSocket.on('connect', () => {
            clearTimeout(timeout);
            unauthSocket.disconnect();
            reject(new Error('Should not have connected'));
          });
          unauthSocket.on('connect_error', (err: Error) => {
            clearTimeout(timeout);
            resolve();
          });
          unauthSocket.connect();
        }),
      ).resolves.toBeUndefined();
    });

    it('should emit error for message content too long via WebSocket', async () => {
      // WsException is caught by NestJS and emitted as 'exception' event
      const errorPromise = waitForEvent<any>(patientSocket, 'exception', 10_000);

      patientSocket.emit('chat:message', {
        chatId,
        content: 'x'.repeat(5001),
      });

      const error = await errorPromise;
      expect(error).toBeDefined();
      expect(error.message).toContain('5000');
    });
  });
});
