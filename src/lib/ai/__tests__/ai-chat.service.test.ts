import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiChatService } from '../ai-chat.service';
import { apiClient, getApiBaseUrl } from '../../api/client';

vi.mock('../../api/client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  getApiBaseUrl: vi.fn().mockReturnValue('http://localhost:8080'),
}));

describe('AiChatService', () => {
  let service: AiChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiChatService();
  });

  describe('startConversation', () => {
    it('should return conversation ID on success', async () => {
      const id = crypto.randomUUID();
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id } });

      const result = await service.startConversation();

      expect(result).toBe(id);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai-agents/start',
        {},
        { timeout: 60_000 },
      );
    });

    it('should throw when server returns no ID', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await expect(service.startConversation()).rejects.toThrow(
        'Server did not return a conversation ID',
      );
    });

    it('should throw when server returns null data', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: null });

      await expect(service.startConversation()).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should post message to correct endpoint', async () => {
      const conversationId = crypto.randomUUID();
      const text = `test-msg-${crypto.randomUUID()}`;
      vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });

      await service.sendMessage(conversationId, text);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai-agents/message',
        { conversationId, text },
        { timeout: 60_000 },
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages array', async () => {
      const conversationId = crypto.randomUUID();
      const messages = [{ id: '1', text: 'hello' }];
      vi.mocked(apiClient.get).mockResolvedValue({ data: messages });

      const result = await service.getMessages(conversationId);

      expect(result).toEqual(messages);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/ai-agents/messages/${conversationId}`,
        expect.objectContaining({ timeout: 60_000 }),
      );
    });

    it('should pass dateOffset as param when provided', async () => {
      const conversationId = crypto.randomUUID();
      const since = new Date('2026-01-01T00:00:00Z');
      vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

      await service.getMessages(conversationId, since);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/ai-agents/messages/${conversationId}`,
        expect.objectContaining({
          params: { dateOffset: since.toISOString() },
        }),
      );
    });

    it('should return empty array when data is not an array', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: null });

      const result = await service.getMessages(crypto.randomUUID());

      expect(result).toEqual([]);
    });
  });

  describe('getConversationHistory', () => {
    it('should return history messages', async () => {
      const conversationId = crypto.randomUUID();
      const history = [
        { id: '1', role: 'user', text: 'hi', createdAt: new Date().toISOString() },
        { id: '2', role: 'bot', text: 'hello', createdAt: new Date().toISOString() },
      ];
      vi.mocked(apiClient.get).mockResolvedValue({ data: history });

      const result = await service.getConversationHistory(conversationId);

      expect(result).toEqual(history);
      expect(apiClient.get).toHaveBeenCalledWith(
        `/ai-agents/history/${conversationId}`,
        { timeout: 60_000 },
      );
    });

    it('should return empty array when data is not an array', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: 'unexpected' });

      const result = await service.getConversationHistory(crypto.randomUUID());

      expect(result).toEqual([]);
    });
  });

  describe('startNewConversation', () => {
    it('should return new conversation ID', async () => {
      const id = crypto.randomUUID();
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id } });

      const result = await service.startNewConversation();

      expect(result).toBe(id);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/ai-agents/start/new',
        {},
        { timeout: 60_000 },
      );
    });

    it('should throw when server returns no ID', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: {} });

      await expect(service.startNewConversation()).rejects.toThrow(
        'Server did not return a conversation ID',
      );
    });
  });

  describe('resumeConversation', () => {
    it('should return conversation ID on success', async () => {
      const id = crypto.randomUUID();
      vi.mocked(apiClient.post).mockResolvedValue({ data: { id } });

      const result = await service.resumeConversation(id);

      expect(result).toBe(id);
      expect(apiClient.post).toHaveBeenCalledWith(
        `/ai-agents/start/${id}`,
        {},
        { timeout: 60_000 },
      );
    });

    it('should throw when server returns no ID', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: null });

      await expect(
        service.resumeConversation(crypto.randomUUID()),
      ).rejects.toThrow('Server did not return a conversation ID');
    });
  });

  describe('getStreamUrl', () => {
    it('should construct correct SSE stream URL', () => {
      const conversationId = crypto.randomUUID();

      const result = service.getStreamUrl(conversationId);

      expect(result).toBe(
        `http://localhost:8080/ai-agents/stream/${conversationId}`,
      );
    });
  });
});
