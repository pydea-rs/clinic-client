import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '../hooks/useChat';
import { aiChatService } from '../../../lib/ai/ai-chat.service';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../lib/ai/ai-chat.service', () => ({
  aiChatService: {
    startNewConversation: vi.fn(),
    resumeConversation: vi.fn(),
    getConversationHistory: vi.fn(),
    sendMessage: vi.fn(),
    getMessages: vi.fn(),
    getStreamUrl: vi.fn(() => 'https://api.test/ai-agents/stream/conv-1'),
  },
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  private listeners = new Map<string, Array<(e: MessageEvent) => void>>();
  onopen: (() => void) | null = null;
  close = vi.fn();

  constructor(_url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    const list = this.listeners.get(event) ?? [];
    list.push(cb);
    this.listeners.set(event, list);
  }

  emit(event: string, data: unknown) {
    const evt = { data: JSON.stringify(data) } as MessageEvent;
    for (const cb of this.listeners.get(event) ?? []) cb(evt);
  }
}

describe('useChat SOAP polling & deduplication', () => {
  const OriginalEventSource = globalThis.EventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    FakeEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as unknown as { EventSource: typeof OriginalEventSource }).EventSource = OriginalEventSource;
    localStorage.clear();
  });

  it('orders polled messages chronologically, triggers soap_ready callback, and deduplicates across poll and SSE', async () => {
    const convId = 'conv-poll-1';
    const soapId = crypto.randomUUID();
    const onSoapReady = vi.fn();

    localStorage.setItem('bp_delivery_mode', 'poll');
    vi.mocked(aiChatService.startNewConversation).mockResolvedValue(convId);
    vi.mocked(aiChatService.sendMessage).mockResolvedValue(undefined);
    vi.mocked(aiChatService.getMessages).mockResolvedValue([
      {
        id: 'm-2',
        createdAt: '2026-11-26T10:02:00.000Z',
        soapId,
        payload: { text: 'SOAP Note\n\nS - Subjective\nتب\nO - Objective\nندارد\nA - Assessment\nویروس\nP - Plan\nاستراحت' },
      },
      {
        id: 'm-1',
        createdAt: '2026-11-26T10:01:00.000Z',
        payload: { text: 'در حال بررسی...' },
      },
    ]);

    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setSoapReadyCallback(onSoapReady);
    });

    await act(async () => {
      await result.current.initializeChat();
    });

    await act(async () => {
      await result.current.sendMessage('تب و سردرد دارم');
    });

    // advance typewriter for the final polled message
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(onSoapReady).toHaveBeenCalledTimes(1);
    expect(onSoapReady).toHaveBeenCalledWith({ soapId, conversationId: convId });
    expect(result.current.messages.map((m) => m.id)).toContain('m-1');
    expect(result.current.messages.map((m) => m.id)).toContain('m-2');
    const idx1 = result.current.messages.findIndex((m) => m.id === 'm-1');
    const idx2 = result.current.messages.findIndex((m) => m.id === 'm-2');
    expect(idx1).toBeLessThan(idx2);
  });

  it('deduplicates repeated soap_ready SSE events for the same soapId', async () => {
    const convId = 'conv-sse-1';
    const soapId = crypto.randomUUID();
    const onSoapReady = vi.fn();

    vi.mocked(aiChatService.startNewConversation).mockResolvedValue(convId);

    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.setSoapReadyCallback(onSoapReady);
    });

    await act(async () => {
      await result.current.initializeChat();
    });

    const es = FakeEventSource.instances[0];
    act(() => {
      es.emit('soap_ready', { soapId, conversationId: convId });
      es.emit('soap_ready', { soapId, conversationId: convId });
    });

    expect(onSoapReady).toHaveBeenCalledTimes(1);
    expect(onSoapReady).toHaveBeenCalledWith({ soapId, conversationId: convId });
  });
});
