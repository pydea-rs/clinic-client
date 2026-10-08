import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { AdminDoctorVerificationPage } from '../AdminDoctorVerificationPage';
import type { DoctorDocument, PendingDoctor } from '../../../lib/types/api';

const { mockToast, mockListPending, mockGetDocuments, mockVerify } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockListPending: vi.fn(),
  mockGetDocuments: vi.fn(),
  mockVerify: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  adminApi: {
    verifications: {
      listPending: (...args: unknown[]) => mockListPending(...args),
      getDocuments: (...args: unknown[]) => mockGetDocuments(...args),
      verify: (...args: unknown[]) => mockVerify(...args),
    },
  },
}));

const randomInt = (max = 100_000) => Math.floor(Math.random() * max) + 1;
const randomName = () => `N${Math.random().toString(36).slice(2, 8)}`;

function buildDocument(doctorId: number, overrides: Partial<DoctorDocument> = {}): DoctorDocument {
  const now = new Date().toISOString();
  return {
    id: randomInt(),
    doctorId,
    type: 'LICENSE',
    fileUrl: `/uploads/doctor-documents/${crypto.randomUUID()}.pdf`,
    fileName: 'license.pdf',
    mimeType: 'application/pdf',
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildPendingDoctor(overrides: Partial<PendingDoctor> = {}): PendingDoctor {
  const id = overrides.id ?? randomInt();
  const userId = crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    userId,
    startedAt: now,
    specialty: 'CARDIOLOGY',
    secondarySpecialties: [],
    visitMethods: ['CHAT'],
    visitTypes: ['CONSULTATION'],
    languages: [],
    verified: false,
    createdAt: now,
    updatedAt: now,
    user: {
      id: userId,
      firstname: randomName(),
      lastname: randomName(),
      email: `doc-${randomInt()}@test.local`,
    },
    documents: [buildDocument(id)],
    ...overrides,
  };
}

const fullName = (d: PendingDoctor) => `${d.user.firstname} ${d.user.lastname}`;

describe('AdminDoctorVerificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending doctors with the documents returned by the listing', async () => {
    const doctor = buildPendingDoctor();
    mockListPending.mockResolvedValue([doctor]);

    render(<AdminDoctorVerificationPage />);

    expect(await screen.findByText(fullName(doctor))).toBeInTheDocument();
    expect(screen.getByText(doctor.user.email)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', doctor.documents[0].fileUrl);
    expect(mockGetDocuments).not.toHaveBeenCalled();
  });

  it('approves using the doctor profile id and removes the doctor from the list', async () => {
    const [doctor, other] = [buildPendingDoctor(), buildPendingDoctor()];
    mockListPending.mockResolvedValue([doctor, other]);
    mockVerify.mockResolvedValue({ verified: true });

    render(<AdminDoctorVerificationPage />);
    await screen.findByText(fullName(doctor));

    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0]);

    await waitFor(() => expect(screen.queryByText(fullName(doctor))).not.toBeInTheDocument());
    expect(mockVerify).toHaveBeenCalledWith(doctor.id, true, undefined);
    expect(screen.getByText(fullName(other))).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it('rejects with the entered reason using the doctor profile id', async () => {
    const doctor = buildPendingDoctor();
    const reason = `Unreadable license ${randomName()}`;
    mockListPending.mockResolvedValue([doctor]);
    mockVerify.mockResolvedValue({ verified: false, rejectionReason: reason });

    render(<AdminDoctorVerificationPage />);
    await screen.findByText(fullName(doctor));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByPlaceholderText('Enter rejection reason...'), { target: { value: reason } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject Application' }));

    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith(doctor.id, false, reason));
    await waitFor(() => expect(screen.queryByText(fullName(doctor))).not.toBeInTheDocument());
  });

  it('does not allow rejecting without a reason', async () => {
    const doctor = buildPendingDoctor();
    mockListPending.mockResolvedValue([doctor]);

    render(<AdminDoctorVerificationPage />);
    await screen.findByText(fullName(doctor));

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));

    expect(screen.getByRole('button', { name: 'Reject Application' })).toBeDisabled();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('refreshes documents using the doctor profile id', async () => {
    const doctor = buildPendingDoctor({ documents: [] });
    const fresh = buildDocument(doctor.id, { type: 'ID_CARD' });
    mockListPending.mockResolvedValue([doctor]);
    mockGetDocuments.mockResolvedValue([fresh]);

    render(<AdminDoctorVerificationPage />);
    await screen.findByText(fullName(doctor));
    expect(screen.queryByRole('link', { name: 'View' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Documents' }));

    expect(await screen.findByRole('link', { name: 'View' })).toHaveAttribute('href', fresh.fileUrl);
    expect(mockGetDocuments).toHaveBeenCalledWith(doctor.id);
  });

  it('keeps the doctor listed and shows an error when verification fails', async () => {
    const doctor = buildPendingDoctor();
    mockListPending.mockResolvedValue([doctor]);
    mockVerify.mockRejectedValue(new Error('Request failed with status code 400'));

    render(<AdminDoctorVerificationPage />);
    await screen.findByText(fullName(doctor));

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to verify doctor'));
    expect(screen.getByText(fullName(doctor))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
  });

  it('shows the empty state when nobody is pending', async () => {
    mockListPending.mockResolvedValue([]);

    render(<AdminDoctorVerificationPage />);

    expect(await screen.findByText('No pending verifications')).toBeInTheDocument();
  });

  it('shows an error and the empty state when the listing fails', async () => {
    mockListPending.mockRejectedValue(new Error('Network Error'));

    render(<AdminDoctorVerificationPage />);

    expect(await screen.findByText('No pending verifications')).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to load pending doctors');
  });
});
