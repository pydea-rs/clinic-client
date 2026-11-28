import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils';
import { ConsultationDetailPage } from '../ConsultationDetailPage';
import { useAuthStore } from '../../../lib/stores/auth.store';
import { mockDoctorUser, mockPatientUser } from '../../../test/mockData';

const {
  mockGetConsultationById,
  mockConfirmPayment,
  mockComplete,
  mockCancel,
  mockOpenConsultationChat,
} = vi.hoisted(() => ({
  mockGetConsultationById: vi.fn(),
  mockConfirmPayment: vi.fn(),
  mockComplete: vi.fn(),
  mockCancel: vi.fn(),
  mockOpenConsultationChat: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../../../api', () => ({
  consultationApi: {
    getConsultationById: (...args: unknown[]) => mockGetConsultationById(...args),
    decide: vi.fn(),
    advancePayment: vi.fn(),
    confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
    start: vi.fn(),
    complete: (...args: unknown[]) => mockComplete(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
  chatApi: {
    openConsultationChat: (...args: unknown[]) => mockOpenConsultationChat(...args),
  },
  nurseApi: {
    getAssignments: vi.fn().mockResolvedValue([]),
  },
}));

describe('ConsultationDetailPage workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('allows PATIENT with CHAT decision to open consultation chat directly and confirm payment', async () => {
    const consultationId = crypto.randomUUID();
    const chatId = crypto.randomUUID();

    useAuthStore.setState({ user: mockPatientUser, isAuthenticated: true, initializing: false });
    mockGetConsultationById.mockResolvedValue({
      id: consultationId,
      patientId: mockPatientUser.id,
      doctorId: 10,
      status: 'PENDING_PAYMENT',
      doctorDecision: 'CONSULTATION',
      visitMethod: 'CHAT',
      visitType: 'CONSULTATION',
      followUpNeeded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockOpenConsultationChat.mockResolvedValue({ id: chatId });
    mockConfirmPayment.mockResolvedValue({});

    render(
      <Routes>
        <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
        <Route path="/chat/:id" element={<div>Patient Consultation Chat</div>} />
      </Routes>,
      { initialEntries: [`/consultation/${consultationId}`] },
    );

    const confirmBtn = await screen.findByRole('button', { name: /confirm payment/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalledWith(consultationId));

    const openChatBtn = screen.getAllByRole('button', { name: /start chat/i })[0];
    fireEvent.click(openChatBtn);
    await waitFor(() => {
      expect(mockOpenConsultationChat).toHaveBeenCalledWith(consultationId);
      expect(screen.getByText('Patient Consultation Chat')).toBeInTheDocument();
    });
  });

  it('allows DOCTOR on IN_PROGRESS consultation to complete with dynamic notes, summary, and follow-up', async () => {
    const consultationId = crypto.randomUUID();
    const notes = `Notes-${Math.random().toString(36).slice(2, 8)}`;
    const summary = `Summary-${Math.random().toString(36).slice(2, 8)}`;

    useAuthStore.setState({ user: mockDoctorUser, isAuthenticated: true, initializing: false });
    mockGetConsultationById.mockResolvedValue({
      id: consultationId,
      patientId: mockPatientUser.id,
      doctorId: 10,
      status: 'IN_PROGRESS',
      doctorDecision: 'CONSULTATION',
      visitMethod: 'CHAT',
      followUpNeeded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockComplete.mockResolvedValue({});

    const { container } = render(
      <Routes>
        <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
      </Routes>,
      { initialEntries: [`/consultation/${consultationId}`] },
    );

    fireEvent.click(await screen.findByRole('button', { name: /complete consultation/i }));
    const notesField = container.querySelector('textarea[name="notes"]');
    const summaryField = container.querySelector('textarea[name="summary"]');
    const followUpBox = container.querySelector('input[name="followUpNeeded"]');
    if (!notesField || !summaryField || !followUpBox) {
      throw new Error('Expected completion form inputs to render');
    }
    fireEvent.change(notesField, { target: { value: notes } });
    fireEvent.change(summaryField, { target: { value: summary } });
    fireEvent.click(followUpBox);
    fireEvent.click(screen.getByRole('button', { name: /complete consultation/i }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(consultationId, {
        notes,
        summary,
        followUpNeeded: true,
      });
    });
  });

  it('omits blank notes and summary instead of overwriting existing notes with empty strings', async () => {
    const consultationId = crypto.randomUUID();
    const existingNotes = `Existing-${Math.random().toString(36).slice(2, 8)}`;

    useAuthStore.setState({ user: mockDoctorUser, isAuthenticated: true, initializing: false });
    mockGetConsultationById.mockResolvedValue({
      id: consultationId,
      patientId: mockPatientUser.id,
      doctorId: 10,
      status: 'IN_PROGRESS',
      doctorDecision: 'CONSULTATION',
      visitMethod: 'CHAT',
      notes: existingNotes,
      followUpNeeded: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockComplete.mockResolvedValue({});

    const { container } = render(
      <Routes>
        <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
      </Routes>,
      { initialEntries: [`/consultation/${consultationId}`] },
    );

    fireEvent.click(await screen.findByRole('button', { name: /complete consultation/i }));
    const notesField = container.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
    expect(notesField.defaultValue).toBe(existingNotes);
    fireEvent.change(notesField, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /complete consultation/i }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(consultationId, {
        notes: undefined,
        summary: undefined,
        followUpNeeded: false,
      });
    });
  });
});
