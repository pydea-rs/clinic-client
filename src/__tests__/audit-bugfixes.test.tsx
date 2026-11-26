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
  mockAdvancePayment,
  mockConfirmPayment,
  mockStartConsultation,
  mockCancelConsultation,
} = vi.hoisted(() => ({
  mockUpdateDoctorProfile: vi.fn(),
  mockCreateDoctorProfile: vi.fn(),
  mockGetDoctors: vi.fn(),
  mockGetConsultation: vi.fn(),
  mockAdvancePayment: vi.fn(),
  mockConfirmPayment: vi.fn(),
  mockStartConsultation: vi.fn(),
  mockCancelConsultation: vi.fn(),
}));

vi.mock('../api', () => ({
  doctorApi: {
    updateProfile: (...args: unknown[]) => mockUpdateDoctorProfile(...args),
    createProfile: (...args: unknown[]) => mockCreateDoctorProfile(...args),
    getDoctors: (...args: unknown[]) => mockGetDoctors(...args),
  },
  consultationApi: {
    getConsultationById: (...args: unknown[]) => mockGetConsultation(...args),
    decide: vi.fn(),
    advancePayment: (...args: unknown[]) => mockAdvancePayment(...args),
    confirmPayment: (...args: unknown[]) => mockConfirmPayment(...args),
    start: (...args: unknown[]) => mockStartConsultation(...args),
    complete: vi.fn(),
    cancel: (...args: unknown[]) => mockCancelConsultation(...args),
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
        doctorDecision: 'ONLINE',
        visitMethod: 'VIDEO_CALL',
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
  });
});
