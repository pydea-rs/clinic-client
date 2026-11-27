import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { SOAPDetailPage } from '../SOAPDetailPage';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { mockPatientUser, mockDoctorUser } from '../../../test/mockData';

const { mockGetSOAPDetail } = vi.hoisted(() => ({
  mockGetSOAPDetail: vi.fn(),
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => {} }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'soap-detail-id' }),
  };
});

vi.mock('../../../api', () => ({
  patientApi: {
    getSOAPDetail: (...args: unknown[]) => mockGetSOAPDetail(...args),
  },
}));

describe('SOAPDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSOAPDetail.mockResolvedValue({
      id: 'soap-detail-id',
      conversationId: 'conv-123',
      subjective: 'سردرد ضربان دار',
      objective: 'BP 120/80',
      assessment: 'Migraine headache',
      plan: 'Neurology evaluation',
      suggestedSpecialty: 'NEUROLOGY',
      triageLevel: 'URGENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('renders a Find a Doctor link to /matching/request?soapId=... for PATIENT users', async () => {
    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true });

    render(<SOAPDetailPage />);

    const link = await screen.findByRole('link', { name: /find a doctor/i });
    expect(link).toHaveAttribute('href', '/matching/request?soapId=soap-detail-id');
  });

  it('hides the Find a Doctor CTA for non-patient roles', async () => {
    useAuthStore.setState({ user: mockDoctorUser, isAuthenticated: true });

    render(<SOAPDetailPage />);

    expect(await screen.findByText('Neurology')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /find a doctor/i })).not.toBeInTheDocument();
  });
});
