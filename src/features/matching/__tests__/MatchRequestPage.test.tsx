import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { MatchRequestPage } from '../MatchRequestPage';

const { mockGetActive, mockCreateRequest, mockGetSOAPs, mockGetSOAPDetail, mockNavigate } = vi.hoisted(() => ({
  mockGetActive: vi.fn(),
  mockCreateRequest: vi.fn(),
  mockGetSOAPs: vi.fn(),
  mockGetSOAPDetail: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../api', () => ({
  matchingApi: {
    getActive: (...args: unknown[]) => mockGetActive(...args),
    createRequest: (...args: unknown[]) => mockCreateRequest(...args),
  },
  patientApi: {
    getSOAPs: (...args: unknown[]) => mockGetSOAPs(...args),
    getSOAPDetail: (...args: unknown[]) => mockGetSOAPDetail(...args),
  },
}));

describe('MatchRequestPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActive.mockResolvedValue(null);
  });

  it('preselects soapId from URL via fallback getSOAPDetail and submits SOAP-based match request', async () => {
    const soapId = crypto.randomUUID();
    const matchId = crypto.randomUUID();

    mockGetSOAPs.mockResolvedValue({ soaps: [], total: 0 });
    mockGetSOAPDetail.mockResolvedValue({
      id: soapId,
      assessment: 'Persistent gastritis',
      suggestedSpecialty: 'GASTROENTEROLOGY',
      triageLevel: 'SEE_DOCTOR',
      createdAt: new Date().toISOString(),
    });
    mockCreateRequest.mockResolvedValue({
      matchRequest: { id: matchId },
      doctors: [],
    });

    render(<MatchRequestPage />, {
      initialEntries: [`/matching/request?soapId=${soapId}`],
    });

    expect(await screen.findByText(/Specialty: Gastroenterology/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /find best match/i }));

    await waitFor(() => {
      expect(mockCreateRequest).toHaveBeenCalledWith({ soapId }, expect.anything());
      expect(mockNavigate).toHaveBeenCalledWith(`/matching/${matchId}/waiting`, {
        state: { doctors: [] },
      });
    });
  });

  it('shows accurate "Best available doctor (any specialty)" text instead of General practitioner when suggestedSpecialty is absent', async () => {
    const soapId = crypto.randomUUID();
    mockGetSOAPs.mockResolvedValue({
      soaps: [
        {
          id: soapId,
          assessment: 'General checkup notes',
          suggestedSpecialty: undefined,
          triageLevel: 'SELF_CARE',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    render(<MatchRequestPage />, {
      initialEntries: [`/matching/request?soapId=${soapId}`],
    });

    expect(await screen.findByText('Best available doctor (any specialty)')).toBeInTheDocument();
    expect(screen.queryByText('General practitioner')).not.toBeInTheDocument();
  });
});
