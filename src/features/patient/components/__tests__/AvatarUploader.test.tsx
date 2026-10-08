import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarUploader } from '../AvatarUploader';
import { getApiBaseUrl, setApiBaseUrl } from '../../../../lib/api/client';

const { mockToast, mockUploadAvatar } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockUploadAvatar: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../../api', () => ({
  userApi: { uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args) },
}));

const API_BASE_URL = 'https://api.clinic.test';
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('AvatarUploader', () => {
  const originalBaseUrl = getApiBaseUrl();

  beforeEach(() => {
    vi.clearAllMocks();
    setApiBaseUrl(API_BASE_URL);
  });

  afterEach(() => {
    setApiBaseUrl(originalBaseUrl);
  });

  it('shows the current uploaded avatar from the API', () => {
    const avatar = `/uploads/avatars/${crypto.randomUUID()}.png`;

    render(<AvatarUploader currentAvatar={avatar} />);

    expect(screen.getByAltText('Avatar preview')).toHaveAttribute('src', `${API_BASE_URL}${avatar}`);
  });

  it('previews a newly selected file as a data URL, untouched', async () => {
    render(<AvatarUploader currentAvatar={`/uploads/avatars/${crypto.randomUUID()}.png`} />);

    fireEvent.change(screen.getByLabelText('Choose Image'), {
      target: { files: [new File([PNG_BYTES], 'me.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(screen.getByAltText('Avatar preview').getAttribute('src')).toMatch(/^data:image\/png;base64,/),
    );
  });

  it('shows the placeholder when there is no avatar', () => {
    render(<AvatarUploader />);

    expect(screen.queryByAltText('Avatar preview')).not.toBeInTheDocument();
  });
});
