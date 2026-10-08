import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { AdminUsersQuickList } from '../AdminUsersQuickList';
import { getApiBaseUrl, setApiBaseUrl } from '../../../lib/api/client';

const { mockListUsers } = vi.hoisted(() => ({ mockListUsers: vi.fn() }));

vi.mock('../../../api', () => ({
  adminApi: { users: { list: (...args: unknown[]) => mockListUsers(...args) } },
}));

const API_BASE_URL = 'https://api.clinic.test';
const randomName = () => `N${Math.random().toString(36).slice(2, 8)}`;

function buildUser(avatar: string | null) {
  return {
    id: crypto.randomUUID(),
    firstname: randomName(),
    lastname: randomName(),
    email: `${crypto.randomUUID()}@test.local`,
    role: 'PATIENT',
    avatar,
    createdAt: new Date().toISOString(),
  };
}

describe('AdminUsersQuickList', () => {
  const originalBaseUrl = getApiBaseUrl();

  beforeEach(() => {
    vi.clearAllMocks();
    setApiBaseUrl(API_BASE_URL);
  });

  afterEach(() => {
    setApiBaseUrl(originalBaseUrl);
  });

  it('loads uploaded avatars from the API', async () => {
    const avatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    const user = buildUser(avatar);
    mockListUsers.mockResolvedValue({ data: [user], total: 1 });

    render(<AdminUsersQuickList />);

    expect(await screen.findByAltText(user.firstname)).toHaveAttribute('src', `${API_BASE_URL}${avatar}`);
  });

  it('keeps an absolute avatar URL as is', async () => {
    const user = buildUser('https://cdn.example.com/avatar.png');
    mockListUsers.mockResolvedValue({ data: [user], total: 1 });

    render(<AdminUsersQuickList />);

    expect(await screen.findByAltText(user.firstname)).toHaveAttribute('src', 'https://cdn.example.com/avatar.png');
  });

  it('shows a placeholder instead of an image when the user has no avatar', async () => {
    const user = buildUser(null);
    mockListUsers.mockResolvedValue({ data: [user], total: 1 });

    render(<AdminUsersQuickList />);

    expect(await screen.findByText('N/A')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
