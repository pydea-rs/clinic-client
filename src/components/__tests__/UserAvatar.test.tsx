import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserAvatar } from '../UserAvatar';
import { getUserInitials } from '../../lib/format';
import { getApiBaseUrl, setApiBaseUrl } from '../../lib/api/client';

const API_BASE_URL = 'https://api.clinic.test';

describe('getUserInitials', () => {
  it('returns uppercase initials from firstname and lastname', () => {
    expect(getUserInitials('jane', 'doe')).toBe('JD');
    expect(getUserInitials('Alice')).toBe('A');
    expect(getUserInitials(undefined, 'Smith')).toBe('S');
  });

  it('returns default fallback when both names are missing or empty', () => {
    expect(getUserInitials('', '')).toBe('?');
    expect(getUserInitials(null, null, 'DR')).toBe('DR');
  });
});

describe('UserAvatar', () => {
  const originalBaseUrl = getApiBaseUrl();

  beforeEach(() => {
    setApiBaseUrl(API_BASE_URL);
  });

  afterEach(() => {
    setApiBaseUrl(originalBaseUrl);
  });

  it('resolves uploaded avatar paths against API base URL', () => {
    const avatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    render(<UserAvatar avatar={avatar} firstname="Jane" lastname="Doe" />);

    expect(screen.getByAltText('Jane Doe')).toHaveAttribute('src', `${API_BASE_URL}${avatar}`);
  });

  it('keeps absolute URLs unchanged', () => {
    const avatar = `https://cdn.example.com/${crypto.randomUUID()}.png`;
    render(<UserAvatar avatar={avatar} firstname="Jane" lastname="Doe" alt="Doctor Photo" />);

    expect(screen.getByAltText('Doctor Photo')).toHaveAttribute('src', avatar);
  });

  it('renders initials or custom fallback when avatar is missing or whitespace', () => {
    const { rerender } = render(<UserAvatar avatar={null} firstname="Jane" lastname="Doe" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();

    rerender(<UserAvatar avatar="   " firstname="Jane" lastname="Doe" fallback={<span>CustomFallback</span>} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('CustomFallback')).toBeInTheDocument();
  });

  it('falls back when the image fails to load and recovers when a new avatar URL is provided', () => {
    const firstAvatar = `/uploads/avatars/${crypto.randomUUID()}.png`;
    const nextAvatar = `/uploads/avatars/${crypto.randomUUID()}.png`;

    const { rerender } = render(<UserAvatar avatar={firstAvatar} firstname="Jane" lastname="Doe" />);
    const img = screen.getByAltText('Jane Doe');
    fireEvent.error(img);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();

    rerender(<UserAvatar avatar={nextAvatar} firstname="Jane" lastname="Doe" />);
    expect(screen.getByAltText('Jane Doe')).toHaveAttribute('src', `${API_BASE_URL}${nextAvatar}`);
  });
});
