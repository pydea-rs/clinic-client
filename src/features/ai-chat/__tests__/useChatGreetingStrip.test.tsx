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
    getStreamUrl: vi.fn(() => 'https://api.test/ai-agents/stream/conv-greet'),
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

describe('useChat repeated greeting stripping', () => {
  const OriginalEventSource = globalThis.EventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.unstubAllEnvs();
    localStorage.clear();
    FakeEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    (globalThis as unknown as { EventSource: typeof OriginalEventSource }).EventSource = OriginalEventSource;
    localStorage.clear();
  });

  it('keeps greeting on 1st bot response and strips repeated EN/FA greetings on turns 2..5 (including message_updated)', async () => {
    vi.stubEnv('VITE_STRIP_AI_GREETING', 'true');
    vi.stubEnv('VITE_APP_NAME', 'Ai-Clinic-Demo');
    vi.mocked(aiChatService.startNewConversation).mockResolvedValue('conv-sse');

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.initializeChat();
    });

    const es = FakeEventSource.instances[0];
    const emitAndFinishStream = async (id: string, text: string, updatedText?: string) => {
      await act(async () => {
        es.emit('message_created', { id, payload: { text }, createdAt: '2026-11-27T00:00:00Z' });
        vi.advanceTimersByTime(100);
        if (updatedText) {
          es.emit('message_updated', { id, payload: { text: updatedText }, updatedAt: '2026-11-27T00:00:01Z' });
        }
        vi.advanceTimersByTime(3000);
      });
    };

    await emitAndFinishStream('b1', 'Hi, welcome to Ai-Clinic-Demo. How can I help?');
    await emitAndFinishStream(
      'b2',
      'Hi, welcome to Ai-Clinic-Demo. How long have you had this headache?',
      'Hi, welcome to Ai-Clinic-Demo. How long have you had this headache?',
    );
    await emitAndFinishStream('b3', 'Hi. Do you also have a fever?');
    await emitAndFinishStream('b4', 'سلام، خوش اومدید. آیا سابقه بیماری دارید؟');
    await emitAndFinishStream('b5', 'سلام؛ شدت درد را از ۱ تا ۱۰ بگویید.');

    expect(result.current.messages.map((m) => m.text)).toEqual([
      'Hi, welcome to Ai-Clinic-Demo. How can I help?',
      'How long have you had this headache?',
      'Do you also have a fever?',
      'آیا سابقه بیماری دارید؟',
      'شدت درد را از ۱ تا ۱۰ بگویید.',
    ]);
  });

  it('strips repeated greetings in resumed history and continues stripping on new SSE messages', async () => {
    vi.stubEnv('VITE_STRIP_AI_GREETING', 'true');
    vi.stubEnv('VITE_APP_NAME', 'Ai-Clinic-Demo');
    vi.mocked(aiChatService.resumeConversation).mockResolvedValue('conv-hist');
    vi.mocked(aiChatService.getConversationHistory).mockResolvedValue([
      { id: 'u1', role: 'user', text: 'سلام', createdAt: '2026-11-27T00:00:00Z' },
      { id: 'b1', role: 'bot', text: 'سلام، خوش اومدید. چطور کمک کنم؟', createdAt: '2026-11-27T00:00:01Z' },
      { id: 'u2', role: 'user', text: 'سردرد دارم', createdAt: '2026-11-27T00:00:02Z' },
      { id: 'b2', role: 'bot', text: 'سلام؛ از چند روز پیش؟', createdAt: '2026-11-27T00:00:03Z' },
    ]);

    const { result } = renderHook(() => useChat({ conversationId: 'conv-hist' }));
    await act(async () => {
      await result.current.initializeChat();
    });

    const es = FakeEventSource.instances[0];
    await act(async () => {
      es.emit('message_created', {
        id: 'b3',
        payload: { text: 'سلام، خوش اومدید. تب هم دارید؟' },
        createdAt: '2026-11-27T00:00:05Z',
      });
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.messages.map((m) => m.text)).toEqual([
      'سلام',
      'سلام، خوش اومدید. چطور کمک کنم؟',
      'سردرد دارم',
      'از چند روز پیش؟',
      'تب هم دارید؟',
    ]);
  });

  it('does not strip repeated greetings when VITE_STRIP_AI_GREETING is false', async () => {
    vi.stubEnv('VITE_STRIP_AI_GREETING', 'false');
    vi.mocked(aiChatService.startNewConversation).mockResolvedValue('conv-off');

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.initializeChat();
    });

    const es = FakeEventSource.instances[0];
    await act(async () => {
      es.emit('message_created', { id: 'b1', payload: { text: 'Hi, welcome to Ai-Clinic-Demo. First' } });
      vi.advanceTimersByTime(3000);
      es.emit('message_created', { id: 'b2', payload: { text: 'Hi. Second' } });
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.messages.map((m) => m.text)).toEqual([
      'Hi, welcome to Ai-Clinic-Demo. First',
      'Hi. Second',
    ]);
  });
});
