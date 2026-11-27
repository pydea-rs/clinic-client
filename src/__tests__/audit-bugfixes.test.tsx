import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/test-utils';
import { Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../lib/stores/auth.store';
import { AuthGuard, PatientGuard, isUserAccountBlocked } from '../lib/guards/route-guards';
import { DoctorProfileForm } from '../features/doctor/DoctorProfileForm';
import { DoctorListPage } from '../features/doctor/DoctorListPage';
import { ConsultationDetailPage } from '../features/consultation/ConsultationDetailPage';
import { mockDoctorUser, mockPatientUser } from '../test/mockData';

const {
  mockUpdateDoctorProfile,
  mockCreateDoctorProfile,
  mockGetDoctors,
  mockGetConsultation,
  mockDecideConsultation,
  mockAdvancePayment,
  mockConfirmPayment,
  mockStartConsultation,
  mockCancelConsultation,
  mockOpenConsultationChat,
  mockGetNurseAssignments,
} = vi.hoisted(() => ({
  mockUpdateDoctorProfile: vi.fn(),
  mockCreateDoctorProfile: vi.fn(),
  mockGetDoctors: vi.fn(),
  mockGetConsultation: vi.fn(),
  mockDecideConsultation: vi.fn(),
  mockAdvancePayment: vi.fn(),
  mockConfirmPayment: vi.fn(),
  mockStartConsultation: vi.fn(),
  mockCancelConsultation: vi.fn(),
  mockOpenConsultationChat: vi.fn(),
  mockGetNurseAssignments: vi.fn(),
}));

vi.mock('../api', () => ({
  doctorApi: {
    updateProfile: (...args: unknown[]) => mockUpdateDoctorProfile(...args),
    createProfile: (...args: unknown[]) => mockCreateDoctorProfile(...args),
    getDoctors: (...args: unknown[]) => mockGetDoctors(...args),
  },
  consultationApi: {
    getConsultationById: (...args: unknown[]) => mockGetConsultation(...args),
    decide: (...args: unknown[]) => mockDecideConsultation(...args),
    advancePayment: (...args: unknown[]) => mockAdvancePayment(...args),
    confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
    start: (...args: unknown[]) => mockStartConsultation(...args),
    complete: vi.fn(),
    cancel: (...args: unknown[]) => mockCancelConsultation(...args),
  },
  chatApi: {
    openConsultationChat: (...args: unknown[]) => mockOpenConsultationChat(...args),
  },
  nurseApi: {
    getAssignments: (...args: unknown[]) => mockGetNurseAssignments(...args),
  },
}));

describe('Client audit bugfix regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clearAuth();
  });

  describe('Route guards for banned/deactivated users', () => {
    it('detects banned or inactive accounts and clears auth in AuthGuard & PatientGuard', async () => {
      const bannedPatient = { ...mockPatientUser, isBanned: true };
      expect(isUserAccountBlocked(bannedPatient)).toBe(true);
      expect(isUserAccountBlocked({ ...mockPatientUser, isActive: false })).toBe(true);
      expect(isUserAccountBlocked(mockPatientUser)).toBe(false);

      useAuthStore.setState({
        user: bannedPatient,
        isAuthenticated: true,
        initializing: false,
      });

      render(
        <Routes>
          <Route path="/auth" element={<div>Auth Page</div>} />
          <Route
            path="/patient/test"
            element={
              <PatientGuard>
                <div>Protected Patient Page</div>
              </PatientGuard>
            }
          />
          <Route
            path="/dash"
            element={
              <AuthGuard>
                <div>Dashboard</div>
              </AuthGuard>
            }
          />
        </Routes>,
        { initialEntries: ['/patient/test'] }
      );

      await waitFor(() => {
        expect(screen.getByText('Auth Page')).toBeInTheDocument();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
      });
    });
  });

  describe('DoctorProfileForm update payload', () => {
    it('omits startedAt when updating an existing doctor profile', async () => {
      mockUpdateDoctorProfile.mockResolvedValue({ id: 7 });

      render(
        <DoctorProfileForm
          initialData={{
            id: 7,
            userId: mockDoctorUser.id,
            specialty: 'CARDIOLOGY',
            secondarySpecialties: [],
            startedAt: '2018-05-01T00:00:00.000Z',
            visitMethods: ['CHAT'],
            visitTypes: ['CONSULTATION'],
            clinicLocation: 'Main Clinic',
            bio: 'Cardiologist',
            languages: ['English'],
            verified: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          }}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

      await waitFor(() => {
        expect(mockUpdateDoctorProfile).toHaveBeenCalledTimes(1);
      });

      const sentPayload = mockUpdateDoctorProfile.mock.calls[0][0] as Record<string, unknown>;
      expect(sentPayload).not.toHaveProperty('startedAt');
      expect(sentPayload.specialty).toBe('CARDIOLOGY');
    });
  });

  describe('DoctorListPage specialty enum selector', () => {
    it('sends valid uppercase enum specialty value from select filter', async () => {
      mockGetDoctors.mockResolvedValue({ doctors: [], total: 0 });

      render(<DoctorListPage />);

      const selects = await screen.findAllByRole('combobox');
      const specialtySelect = selects[0];
      fireEvent.change(specialtySelect, { target: { value: 'CARDIOLOGY' } });

      await waitFor(() => {
        expect(mockGetDoctors).toHaveBeenCalledWith(
          expect.objectContaining({ specialty: 'CARDIOLOGY' })
        );
      });
    });
  });

  describe('ConsultationDetailPage full lifecycle actions', () => {
    it('renders Proceed to Payment on DOCTOR_DECIDED and triggers advancePayment', async () => {
      useAuthStore.setState({
        user: mockPatientUser,
        isAuthenticated: true,
        initializing: false,
      });
      mockGetConsultation.mockResolvedValue({
        id: 'cons-1',
        patientId: mockPatientUser.id,
        doctorId: 10,
        soapId: 'soap-12345678',
        status: 'DOCTOR_DECIDED',
        doctorDecision: 'CONSULTATION',
        visitMethod: 'CHAT',
        followUpNeeded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      mockAdvancePayment.mockResolvedValue({});

      render(
        <Routes>
          <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
        </Routes>,
        { initialEntries: ['/consultation/cons-1'] }
      );

      const btn = await screen.findByRole('button', { name: /proceed to payment/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockAdvancePayment).toHaveBeenCalledWith('cons-1');
      });
      expect(screen.getByRole('link', { name: /view soap note/i })).toHaveAttribute('href', '/soap/soap-12345678');
    });

    it('renders Start Consultation for doctor on PAYMENT_CONFIRMED', async () => {
      useAuthStore.setState({
        user: mockDoctorUser,
        isAuthenticated: true,
        initializing: false,
      });
      mockGetConsultation.mockResolvedValue({
        id: 'cons-2',
        patientId: mockPatientUser.id,
        doctorId: 10,
        status: 'PAYMENT_CONFIRMED',
        followUpNeeded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      mockStartConsultation.mockResolvedValue({});

      render(
        <Routes>
          <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
        </Routes>,
        { initialEntries: ['/consultation/cons-2'] }
      );

      const btn = await screen.findByRole('button', { name: /start consultation/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockStartConsultation).toHaveBeenCalledWith('cons-2');
      });
    });

    it('disables Decision submit with "Soon..." when Video Call or Voice Call is chosen and supports DIRECT_DIAGNOSIS', async () => {
      useAuthStore.setState({
        user: mockDoctorUser,
        isAuthenticated: true,
        initializing: false,
      });
      mockGetConsultation.mockResolvedValue({
        id: 'cons-3',
        patientId: mockPatientUser.id,
        doctorId: 10,
        status: 'PENDING_DOCTOR_REVIEW',
        followUpNeeded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      mockDecideConsultation.mockResolvedValue({ id: 'cons-3', status: 'COMPLETED' });

      render(
        <Routes>
          <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
        </Routes>,
        { initialEntries: ['/consultation/cons-3'] }
      );

      fireEvent.click(await screen.findByRole('button', { name: /make decision/i }));

      const decisionSelect = screen.getByLabelText(/decision/i);
      fireEvent.change(decisionSelect, { target: { value: 'CONSULTATION' } });

      fireEvent.click(screen.getByRole('radio', { name: /video call/i }));
      const soonBtn = screen.getByRole('button', { name: 'Soon...' });
      expect(soonBtn).toBeDisabled();

      fireEvent.change(decisionSelect, { target: { value: 'DIRECT_DIAGNOSIS' } });
      fireEvent.change(screen.getByLabelText(/final diagnosis/i), {
        target: { value: 'Mild dehydration' },
      });
      fireEvent.change(screen.getByLabelText(/suggestions/i), {
        target: { value: 'Oral fluids and rest' },
      });
      fireEvent.click(screen.getByRole('button', { name: /submit diagnosis & complete/i }));

      await waitFor(() => {
        expect(mockDecideConsultation).toHaveBeenCalledWith(
          'cons-3',
          expect.objectContaining({
            doctorDecision: 'DIRECT_DIAGNOSIS',
            diagnosis: 'Mild dehydration',
            suggestions: 'Oral fluids and rest',
          }),
        );
      });
    });

    it('shows "Chat as Doctor" on CHAT consultation for permitted nurse and opens shared room', async () => {
      useAuthStore.setState({
        user: {
          ...mockPatientUser,
          id: 'nurse-user-1',
          role: 'NURSE',
        },
        isAuthenticated: true,
        initializing: false,
      });
      mockGetNurseAssignments.mockResolvedValue([
        {
          id: 1,
          doctorId: 10,
          nurseId: 'nurse-user-1',
          permissions: ['VIEW_CONSULTATION_NOTES', 'CHAT_WITH_PATIENTS'],
          isActive: true,
          status: 'ACCEPTED',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
      mockGetConsultation.mockResolvedValue({
        id: 'cons-4',
        patientId: mockPatientUser.id,
        doctorId: 10,
        status: 'DOCTOR_DECIDED',
        doctorDecision: 'CONSULTATION',
        visitMethod: 'CHAT',
        followUpNeeded: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      mockOpenConsultationChat.mockResolvedValue({ id: 'shared-chat-4' });

      render(
        <Routes>
          <Route path="/consultation/:id" element={<ConsultationDetailPage />} />
          <Route path="/chat/:id" element={<div>Shared Chat Room</div>} />
        </Routes>,
        { initialEntries: ['/consultation/cons-4'] }
      );

      const chatButtons = await screen.findAllByRole('button', { name: /chat as doctor/i });
      fireEvent.click(chatButtons[0]);

      await waitFor(() => {
        expect(mockOpenConsultationChat).toHaveBeenCalledWith('cons-4');
        expect(screen.getByText('Shared Chat Room')).toBeInTheDocument();
      });
    });
  });
});
