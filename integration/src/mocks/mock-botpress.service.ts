interface CallRecord {
  method: string;
  args: any[];
  timestamp: number;
}

export class MockBotpressService {
  readonly deliveryMode: 'sse' | 'poll' = 'sse';
  readonly calls: CallRecord[] = [];
  private conversationCounter = 0;
  nextPollMessages: any[] | null = null;

  private record(method: string, ...args: any[]) {
    this.calls.push({ method, args, timestamp: Date.now() });
  }

  clear() {
    this.calls.length = 0;
    this.conversationCounter = 0;
    this.nextPollMessages = null;
  }

  async start(user: any) {
    this.record('start', user.id);
    return this.getOrCreateConversation(user);
  }

  async startNew(user: any) {
    this.record('startNew', user.id);
    this.conversationCounter++;
    return {
      id: `mock-conv-${user.id}-${this.conversationCounter}`,
      userId: user.id,
      topic: null,
      agentType: 'BOTPRESS',
      createdAt: new Date().toISOString(),
    };
  }

  async resumeConversation(user: any, conversationId: string) {
    this.record('resumeConversation', user.id, conversationId);
    return {
      id: conversationId,
      userId: user.id,
      topic: null,
      agentType: 'BOTPRESS',
      createdAt: new Date().toISOString(),
    };
  }

  async getConversation(user: any) {
    this.record('getConversation', user.id);
    return this.getOrCreateConversation(user);
  }

  async send(user: any, conversationId: string, text: string) {
    this.record('send', user.id, conversationId, text);
  }

  async sendGuest(conversationId: string, text: string) {
    this.record('sendGuest', conversationId, text);
  }

  async listen(user: any, conversationId: string) {
    this.record('listen', user.id, conversationId);
    const mockListener = {
      status: 'connected' as const,
      on: () => mockListener,
      off: () => mockListener,
      disconnect: async () => {},
      connect: async () => {},
    };
    return {
      client: { user: { id: `bp-user-${user.id}` } },
      listener: mockListener,
    };
  }

  async releaseListener(_userId: string, _listener?: any) {}

  async pollForNewMessages(_user: any, _conversationId: string, _dateOffset?: Date) {
    this.record('pollForNewMessages', _user.id, _conversationId);
    if (this.nextPollMessages) {
      const messages = this.nextPollMessages;
      this.nextPollMessages = null;
      return messages;
    }
    return [
      {
        id: `msg-bot-${Date.now()}`,
        userId: 'bot',
        payload: { type: 'text', text: 'I understand your symptoms. Can you tell me more about when they started?' },
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async pollGuestMessages(conversationId: string, _dateOffset?: Date) {
    this.record('pollGuestMessages', conversationId);
    return [
      {
        id: `msg-guest-bot-${Date.now()}`,
        userId: 'bot',
        payload: { type: 'text', text: 'Hello! How can I help you today?' },
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async startGuest() {
    this.record('startGuest');
    this.conversationCounter++;
    return { id: `mock-guest-conv-${this.conversationCounter}`, guest: true as const };
  }

  async getConversationHistory(_user: any, _conversationId: string) {
    this.record('getConversationHistory', _user.id, _conversationId);
    return [
      {
        id: 'msg-1',
        role: 'bot',
        text: 'Hello! I am your AI medical assistant. How can I help you today?',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  async listConversations(userId: string, skip = 0, take = 20) {
    this.record('listConversations', userId, skip, take);
    return { data: [], total: 0, skip, take };
  }

  async renameConversation(userId: string, conversationId: string, topic: string) {
    this.record('renameConversation', userId, conversationId, topic);
    return {
      id: conversationId,
      userId,
      topic,
      agentType: 'BOTPRESS',
      createdAt: new Date().toISOString(),
    };
  }

  private getOrCreateConversation(user: any) {
    if (!this.conversationCounter) this.conversationCounter = 1;
    return {
      id: `mock-conv-${user.id}-${this.conversationCounter}`,
      userId: user.id,
      topic: null,
      agentType: 'BOTPRESS',
      createdAt: new Date().toISOString(),
    };
  }
}
