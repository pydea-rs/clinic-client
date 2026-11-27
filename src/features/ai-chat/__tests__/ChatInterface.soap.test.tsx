import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { ChatInterface } from '../components/ChatInterface';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { mockPatientUser, mockDoctorUser } from '../../../test/mockData';

const { mockNavigate, mockGetById, mockSetSoapReadyCallback } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetById: vi.fn(),
  mockSetSoapReadyCallback: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api', () => ({
  soapApi: {
    getById: (...args: unknown[]) => mockGetById(...args),
    getByConversation: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    messages: [{ id: 'm1', text: 'SOAP generated', isUser: false, timestamp: new Date() }],
    connectionStatus: 'connected',
    isTyping: false,
    conversationId: 'conv-1',
    initializeChat: vi.fn(),
    sendMessage: vi.fn(),
    setSoapReadyCallback: mockSetSoapReadyCallback,
    resetChat: vi.fn(),
  }),
}));

vi.mock('../components/ChatHeader', () => ({ ChatHeader: () => <div data-testid="chat-header" /> }));
vi.mock('../components/Message', () => ({ Message: ({ message }: { message: { text: string } }) => <div>{message.text}</div> }));
vi.mock('../components/TypingIndicator', () => ({ TypingIndicator: () => null }));
vi.mock('../components/MessageInput', () => ({ MessageInput: () => <div data-testid="msg-input" /> }));

describe('ChatInterface SOAP matching redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('redirects PATIENT users to /matching/request?soapId=... when Find a Doctor is clicked', async () => {
    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true });
    const soapId = crypto.randomUUID();
    mockGetById.mockResolvedValue({
      id: soapId,
      assessment: 'Suspected migraine headache',
      suggestedSpecialty: 'NEUROLOGY',
      triageLevel: 'URGENT',
    });

    render(<ChatInterface />);

    const calls = mockSetSoapReadyCallback.mock.calls;
    const soapReadyCb = calls[calls.length - 1]?.[0] as (d: {
      soapId: string;
      conversationId: string;
    }) => Promise<void>;
    expect(soapReadyCb).toBeDefined();
    await soapReadyCb({ soapId, conversationId: 'conv-1' });

    const findBtn = await screen.findByRole('button', { name: /find a doctor/i });
    fireEvent.click(findBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/matching/request?soapId=${soapId}`);
    });
  });

  it('falls back to /doctors directory query for non-patient roles', async () => {
    useAuthStore.setState({ user: mockDoctorUser, isAuthenticated: true });
    const soapId = crypto.randomUUID();
    mockGetById.mockResolvedValue({
      id: soapId,
      assessment: 'Mild rash',
      suggestedSpecialty: 'DERMATOLOGY',
      triageLevel: 'SELF_CARE',
    });

    render(<ChatInterface />);

    const calls = mockSetSoapReadyCallback.mock.calls;
    const soapReadyCb = calls[calls.length - 1]?.[0] as (d: {
      soapId: string;
      conversationId: string;
    }) => Promise<void>;
    await soapReadyCb({ soapId, conversationId: 'conv-1' });

    const findBtn = await screen.findByRole('button', { name: /find a doctor/i });
    fireEvent.click(findBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(`/doctors?specialty=DERMATOLOGY&soapId=${soapId}`);
    });
  });
});
