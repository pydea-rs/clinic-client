import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { Route, Routes } from 'react-router-dom';
import { DoctorListPage } from '../DoctorListPage';
import { DoctorProfilePage } from '../DoctorProfilePage';
import { getApiBaseUrl, setApiBaseUrl } from '../../../lib/api/client';
import type { DoctorProfile } from '../../../lib/types/api';

const { mockGetDoctors, mockGetDoctorById, mockGetDoctorRating } = vi.hoisted(() => ({
  mockGetDoctors: vi.fn(),
  mockGetDoctorById: vi.fn(),
  mockGetDoctorRating: vi.fn(),
}));

vi.mock('../../../api', () => ({
  doctorApi: {
    getDoctors: (...args: unknown[]) => mockGetDoctors(...args),
    getDoctorById: (...args: unknown[]) => mockGetDoctorById(...args),
  },
  reviewApi: {
    getDoctorRating: (...args: unknown[]) => mockGetDoctorRating(...args),
  },
}));

const API_BASE_URL = 'https://api.clinic.test';

function buildDoctor(overrides: Partial<DoctorProfile> = {}): DoctorProfile {
  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  return {
    id: 42,
    userId,
    startedAt: now,
    specialty: 'CARDIOLOGY',
    secondarySpecialties: [],
    visitMethods: ['CHAT'],
    visitTypes: ['CONSULTATION'],
    languages: ['English'],
    verified: true,
    createdAt: now,
    updatedAt: now,
    user: {
      id: userId,
      firstname: 'Mina',
      lastname: 'Karimi',
      avatar: `/uploads/avatars/${crypto.randomUUID()}.png`,
    },
    averageRating: 4.8,
    totalReviews: 10,
    ...overrides,
  };
}

describe('Doctor directory and detail avatars', () => {
  const originalBaseUrl = getApiBaseUrl();

  beforeEach(() => {
    vi.clearAllMocks();
    setApiBaseUrl(API_BASE_URL);
  });

  afterEach(() => {
    setApiBaseUrl(originalBaseUrl);
  });

  it('shows uploaded doctor avatar in DoctorListPage and initials when absent', async () => {
    const withAvatar = buildDoctor({ id: 1 });
    const withoutAvatar = buildDoctor({
      id: 2,
      user: { id: crypto.randomUUID(), firstname: 'Ali', lastname: 'Moradi', avatar: undefined },
    });
    mockGetDoctors.mockResolvedValue({ doctors: [withAvatar, withoutAvatar], total: 2 });

    render(<DoctorListPage />);

    const img = await screen.findByAltText('Dr. Mina Karimi');
    expect(img).toHaveAttribute('src', `${API_BASE_URL}${withAvatar.user?.avatar}`);
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('shows uploaded doctor avatar in DoctorProfilePage and initials when absent', async () => {
    const doctor = buildDoctor({ id: 42 });
    mockGetDoctorById.mockResolvedValue(doctor);
    mockGetDoctorRating.mockResolvedValue({
      averageRating: 4.8,
      totalReviews: 10,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 8 },
    });

    window.history.pushState({}, '', '/doctor/42');
    render(
      <Routes>
        <Route path="/doctor/:id" element={<DoctorProfilePage />} />
      </Routes>,
    );

    const img = await screen.findByAltText('Dr. Mina Karimi');
    expect(img).toHaveAttribute('src', `${API_BASE_URL}${doctor.user?.avatar}`);
  });
});
