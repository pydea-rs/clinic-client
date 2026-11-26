import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Message } from '../components/Message';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { mockPatientUser } from '../../../test/mockData';
import type { AiChatMessage } from '../../../lib/types/chat';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

const buildMessage = (overrides: Partial<AiChatMessage> = {}): AiChatMessage => ({
  id: crypto.randomUUID(),
  text: 'Hello',
  isUser: false,
  timestamp: new Date('2026-11-26T12:00:00Z'),
  ...overrides,
});

describe('Message directionality', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('sets dir="rtl" on Persian user and AI message containers (including digit prefixes)', () => {
    const persianUser = '۳۰ ساله و دچار تب هستم';
    const persianBot = 'لطفاً علائم خود را بیشتر توضیح دهید.';

    const { rerender } = render(<Message message={buildMessage({ isUser: true, text: persianUser })} />);
    expect(screen.getByText(persianUser).closest('[dir]')).toHaveAttribute('dir', 'rtl');

    rerender(<Message message={buildMessage({ isUser: false, text: persianBot })} />);
    expect(screen.getByText(persianBot).closest('[dir]')).toHaveAttribute('dir', 'rtl');
  });

  it('keeps dir="ltr" on English messages and messages with 10+ leading digits', () => {
    const englishUser = 'I have a migraine since yesterday';
    const tenDigitsBot = '0123456789سلام';

    const { rerender } = render(<Message message={buildMessage({ isUser: true, text: englishUser })} />);
    expect(screen.getByText(englishUser).closest('[dir]')).toHaveAttribute('dir', 'ltr');

    rerender(<Message message={buildMessage({ isUser: false, text: tenDigitsBot })} />);
    expect(screen.getByText(tenDigitsBot).closest('[dir]')).toHaveAttribute('dir', 'ltr');
  });
});
