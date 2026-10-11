import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { createChatApi } from '../chat.api';
import type { Message } from '../../lib/types/api';

const chatId = crypto.randomUUID();

function buildMessages(count: number): Message[] {
  const start = Date.now() - count * 60_000;
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(start + i * 60_000).toISOString();
    return {
      id: String(1000 + i),
      chatId,
      senderId: crypto.randomUUID(),
      content: `message ${i} ${Math.random().toString(36).slice(2, 8)}`,
      type: 'TEXT',
      createdAt: at,
      updatedAt: at,
    };
  });
}

function apiReturning(data: unknown) {
  const get = vi.fn().mockResolvedValue({ data });
  return { api: createChatApi({ get } as unknown as AxiosInstance), get };
}

describe('chatApi.getMessages', () => {
  it('should return the server\'s newest-first page oldest first', async () => {
    const oldestFirst = buildMessages(2 + Math.floor(Math.random() * 20));
    const fromServer = [...oldestFirst].reverse();
    const total = oldestFirst.length + Math.floor(Math.random() * 100);
    const { api } = apiReturning({ messages: fromServer, total });

    const result = await api.getMessages(chatId);

    expect(result).toEqual({ messages: oldestFirst, total });
    expect(fromServer[0]).toBe(oldestFirst[oldestFirst.length - 1]);
  });

  it('should ask for the page counted back from the newest message', async () => {
    const page = 1 + Math.floor(Math.random() * 5);
    const limit = 1 + Math.floor(Math.random() * 50);
    const { api, get } = apiReturning({ messages: [], total: 0 });

    await api.getMessages(chatId, { page, limit });

    expect(get).toHaveBeenCalledWith(`/chat/${chatId}/messages`, {
      params: { skip: (page - 1) * limit, take: limit },
    });
  });

  it.each([
    ['nothing', undefined],
    ['an empty page', { messages: [], total: 0 }],
  ])('should return no messages when the server sends %s', async (_case, data) => {
    const { api } = apiReturning(data);

    await expect(api.getMessages(chatId)).resolves.toEqual({ messages: [], total: 0 });
  });
});
