import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createChatApi } from '@client/api/chat.api';
import { createConsultationApi } from '@client/api/consultation.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createNotificationApi } from '@client/api/notification.api';
import { createNurseApi } from '@client/api/nurse.api';
import { createPatientApi } from '@client/api/patient.api';
import type { NursePermission } from '@client/lib/types/api';
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
 * Register budget (5/60s): 3 (doctor + patient + extra-patient) = 3 used, plus 5 in
 * "Who may start a chat" (the shared test server doesn't throttle)
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

    it('should deliver a message sent over HTTP to the other participant\'s socket', async () => {
      const content = `Hello via HTTP ${Date.now()}`;
      // The doctor's socket may still get the echo of its own previous message.
      const doctorReceive = waitForEvent<any>(
        doctorSocket,
        'chat:message',
        10_000,
        (event) => event.message?.content === content,
      );

      const response = await patientTc.axios.post(`/chat/${chatId}/message`, { content });
      expect(response.status).toBe(201);

      const received = await doctorReceive;
      expect(received.message.content).toBe(content);
      expect(received.message.id).toBe(response.data.id);
      expect(received.message.senderId).toBe(patientUserId);
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
      expect(typeof edited.message.editedAt).toBe('string');
      expect(new Date(edited.message.editedAt).getTime()).not.toBeNaN();
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
      expect(typeof deleted.message.deletedAt).toBe('string');
      expect(new Date(deleted.message.deletedAt).getTime()).not.toBeNaN();
    });
  });

  // ─── Ownership: Edit/Delete Another User's Message ─────────────

  describe('WebSocket: Ownership Checks', () => {
    it('should reject editing another user\'s message', async () => {
      const sentPromise = waitForEvent<any>(patientSocket, 'chat:message', 10_000);
      patientSocket.emit('chat:message', { chatId, content: 'Patient owns this' });
      const sentEvent = await sentPromise;
      const messageId = sentEvent.message.id;

      const errorPromise = waitForEvent<any>(doctorSocket, 'chat:error', 10_000);
      doctorSocket.emit('chat:edit', {
        messageId: messageId.toString(),
        content: 'Doctor tries to edit',
      });

      const error = await errorPromise;
      expect(error.message).toContain('your own messages');
    });

    it('should reject deleting another user\'s message', async () => {
      const sentPromise = waitForEvent<any>(patientSocket, 'chat:message', 10_000);
      patientSocket.emit('chat:message', { chatId, content: 'Patient owns this too' });
      const sentEvent = await sentPromise;
      const messageId = sentEvent.message.id;

      const errorPromise = waitForEvent<any>(doctorSocket, 'chat:error', 10_000);
      doctorSocket.emit('chat:delete', { messageId: messageId.toString() });

      const error = await errorPromise;
      expect(error.message).toContain('your own messages');
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

  // ─── Who may start a chat (SPEC-01) ────────────────────────────

  describe('Who may start a chat', () => {
    const tag = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    type Member = { tc: TestClient; id: string };
    let adminApi: ReturnType<typeof createAdminApi>;
    let doctorA: Member & { profileId: number };
    let doctorB: Member & { profileId: number };
    let nurseOfA: Member;
    let nurseOfB: Member;
    let patientOfA: Member;

    async function register(role: 'PATIENT' | 'DOCTOR', prefix: string): Promise<Member> {
      const tc = createTestClient();
      await warmUp(tc);
      await tc.axios.post('/auth/register', {
        firstname: prefix,
        lastname: 'Rules',
        email: `${prefix}-${tag()}@test.local`,
        password: 'RulesPass456!',
        role,
      });
      return { tc, id: (await tc.axios.get('/user')).data?.id };
    }

    const createProfile = (doctor: Member) =>
      createDoctorApi(doctor.tc.axios).createProfile({
        startedAt: '2015-06-01T00:00:00.000Z',
        specialty: 'GENERAL',
        visitMethods: ['CHAT'],
        visitTypes: ['CONSULTATION'],
        bio: 'Chat rules doctor',
      });

    async function registerDoctor(prefix: string) {
      const doctor = await register('DOCTOR', prefix);
      const profile = await createProfile(doctor);
      await adminApi.verifications.verify(profile.id, true);
      return { ...doctor, profileId: profile.id as number };
    }

    // Accepting the doctor's invitation upgrades the user's role to NURSE.
    async function registerNurseOf(
      doctor: Member,
      prefix: string,
      permissions: NursePermission[] = ['VIEW_PATIENTS'],
    ) {
      const nurse = await register('PATIENT', prefix);
      const invitation = await createNurseApi(doctor.tc.axios).assign(nurse.id, permissions);
      await createNurseApi(nurse.tc.axios).acceptInvitation(invitation.id);
      return { ...nurse, assignmentId: invitation.id };
    }

    async function registerPatientOf(doctor: { profileId: number }, prefix: string) {
      const patient = await register('PATIENT', prefix);
      await createConsultationApi(patient.tc.axios).create({ doctorId: doctor.profileId });
      return patient;
    }

    const startChat = (from: Member, to: Member) =>
      from.tc.axios.post('/chat', { participantId: to.id });

    beforeAll(async () => {
      const adminTc = createTestClient();
      await warmUp(adminTc);
      await adminTc.axios.post('/auth/login', {
        email: superadminEmail,
        password: superadminPassword,
      });
      adminApi = createAdminApi(adminTc.axios);

      doctorA = await registerDoctor('RulesDocA');
      doctorB = await registerDoctor('RulesDocB');
      nurseOfA = await registerNurseOf(doctorA, 'RulesNurseA');
      nurseOfB = await registerNurseOf(doctorB, 'RulesNurseB');

      patientOfA = await register('PATIENT', 'RulesPat');
      await createConsultationApi(patientOfA.tc.axios).create({ doctorId: doctorA.profileId });
    });

    it('should let a doctor start a chat with their own patient', async () => {
      const response = await startChat(doctorA, patientOfA);

      expect(response.status).toBe(201);
      expect(response.data.participants.map((p: any) => p.id).sort()).toEqual(
        [doctorA.id, patientOfA.id].sort(),
      );
    });

    it('should reject a doctor starting a chat with an unrelated patient (403)', async () => {
      const response = await startChat(doctorA, { tc: patientTc, id: extraPatientUserId });

      expect(response.status).toBe(403);
    });

    it('should reject doctor↔doctor chats (403)', async () => {
      expect((await startChat(doctorA, doctorB)).status).toBe(403);
      expect((await startChat(doctorB, doctorA)).status).toBe(403);
    });

    it('should reject a nurse starting a chat with a doctor they are not assigned to (403)', async () => {
      expect((await startChat(nurseOfB, doctorA)).status).toBe(403);
    });

    it.each([
      ['an unverified profile', true],
      ['no profile', false],
    ])('should reject a doctor with %s starting a chat with a nurse (403)', async (_case, withProfile) => {
      const doctor = await register('DOCTOR', 'RulesDocUnverified');
      if (withProfile) await createProfile(doctor);

      const response = await startChat(doctor, nurseOfA);

      expect(response.status).toBe(403);
      expect(response.data.message).toBe('Only verified doctors can start chats with nurses');
    });

    it('should reject nurse↔nurse chats (403)', async () => {
      expect((await startChat(nurseOfA, nurseOfB)).status).toBe(403);
    });

    it('should let a nurse start a chat with their own doctor', async () => {
      const response = await startChat(nurseOfA, doctorA);

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
    });

    it('should let a doctor contact another doctor\'s nurse, who can then open the chat and reply', async () => {
      const started = await startChat(doctorA, nurseOfB);
      expect(started.status).toBe(201);

      const opened = await startChat(nurseOfB, doctorA);
      expect(opened.status).toBe(201);
      expect(opened.data.id).toBe(started.data.id);

      const content = `Interested, ${tag()}`;
      const reply = await nurseOfB.tc.axios.post(`/chat/${started.data.id}/message`, { content });
      expect(reply.status).toBe(201);

      const history = await createChatApi(doctorA.tc.axios).getMessages(started.data.id);
      expect(history.messages.map((m: any) => m.content)).toContain(content);
    });

    it('should deliver a new chat\'s first message to a participant who was already online', async () => {
      const nurseSocket = await createChatSocket(nurseOfA.tc.jar);
      const outsiderSocket = await createChatSocket(doctorA.tc.jar);
      await Promise.all([connectSocket(nurseSocket), connectSocket(outsiderSocket)]);
      const outsiderGot: unknown[] = [];
      outsiderSocket.on('chat:message', (event) => outsiderGot.push(event));

      try {
        const started = await startChat(doctorB, nurseOfA);
        expect(started.status).toBe(201);

        const content = `Are you available? ${tag()}`;
        const received = waitForEvent<any>(
          nurseSocket,
          'chat:message',
          10_000,
          (event) => event.message?.content === content,
        );
        const sent = await doctorB.tc.axios.post(`/chat/${started.data.id}/message`, { content });
        expect(sent.status).toBe(201);

        expect((await received).message.chatId).toBe(started.data.id);
        await new Promise((r) => setTimeout(r, 300));
        expect(outsiderGot).toEqual([]);
      } finally {
        await Promise.all([disconnectSocket(nurseSocket), disconnectSocket(outsiderSocket)]);
      }
    });

    it('should notify an offline participant of a message sent over HTTP', async () => {
      const chat = await startChat(nurseOfA, doctorA);
      const response = await nurseOfA.tc.axios.post(`/chat/${chat.data.id}/message`, {
        content: `Shift update ${tag()}`,
      });
      expect(response.status).toBe(201);

      // Sent fire-and-forget after the response; doctorA has no open socket.
      const notifications = createNotificationApi(doctorA.tc.axios);
      let match: any;
      for (let attempt = 0; attempt < 50 && !match; attempt++) {
        const { data } = await notifications.list({ take: 50 });
        match = data.find(
          (n: any) => n.type === 'NEW_CHAT_MESSAGE' && n.data?.chatId === chat.data.id,
        );
        if (!match) await new Promise((r) => setTimeout(r, 100));
      }

      expect(match).toBeDefined();
      expect(match.data.senderId).toBe(nurseOfA.id);
    });

    describe('patients and nurses', () => {
      let chattyNurseOfA: Member & { assignmentId: number };
      let patientOfB: Member;

      beforeAll(async () => {
        chattyNurseOfA = await registerNurseOf(doctorA, 'RulesChattyNurse', ['VIEW_PATIENTS', 'CHAT_WITH_PATIENTS']);
        patientOfB = await registerPatientOf(doctorB, 'RulesPatB');
      });

      it("should let a nurse with CHAT_WITH_PATIENTS start a chat with their doctor's patient", async () => {
        expect((await startChat(chattyNurseOfA, patientOfA)).status).toBe(201);
      });

      it("should let a patient start a chat with a nurse of their doctor", async () => {
        const patient = await registerPatientOf(doctorA, 'RulesPatA2');

        expect((await startChat(patient, chattyNurseOfA)).status).toBe(201);
      });

      it("should reject a nurse and another doctor's patient, either way (403)", async () => {
        expect((await startChat(chattyNurseOfA, patientOfB)).status).toBe(403);
        expect((await startChat(patientOfB, chattyNurseOfA)).status).toBe(403);
      });

      it('should let a nurse removed by the doctor reopen existing chats but not start new ones', async () => {
        const withDoctor = await startChat(chattyNurseOfA, doctorA);
        expect(withDoctor.status).toBe(201);
        const withPatient = await startChat(chattyNurseOfA, patientOfA);
        const newPatient = await registerPatientOf(doctorA, 'RulesPatA3');

        await createNurseApi(doctorA.tc.axios).remove(chattyNurseOfA.assignmentId);

        expect((await startChat(chattyNurseOfA, doctorA)).data.id).toBe(withDoctor.data.id);
        expect((await startChat(chattyNurseOfA, patientOfA)).data.id).toBe(withPatient.data.id);
        expect((await startChat(chattyNurseOfA, newPatient)).status).toBe(403);
      });

      it('should reject a nurse whose assignment was removed before any chat with the doctor (403)', async () => {
        const nurse = await registerNurseOf(doctorA, 'RulesRemovedNurse');
        await createNurseApi(doctorA.tc.axios).remove(nurse.assignmentId);

        const response = await startChat(nurse, doctorA);

        expect(response.status).toBe(403);
        expect(response.data.message).toBe('You can only start chats with doctors you are assigned to');
      });
    });

    it("should neither save nor broadcast an HTTP send to someone else's chat", async () => {
      const chat = await startChat(doctorA, patientOfA);
      const patientSocket = await createChatSocket(patientOfA.tc.jar);
      await connectSocket(patientSocket);
      const got: unknown[] = [];
      patientSocket.on('chat:message', (event) => got.push(event));

      try {
        const content = `Intruding ${tag()}`;
        const response = await doctorB.tc.axios.post(`/chat/${chat.data.id}/message`, { content });

        expect(response.status).toBe(403);
        await new Promise((r) => setTimeout(r, 300));
        expect(got).toEqual([]);
        const history = await createChatApi(doctorA.tc.axios).getMessages(chat.data.id);
        expect(history.messages.map((m: any) => m.content)).not.toContain(content);
      } finally {
        await disconnectSocket(patientSocket);
      }
    });
  });
});
