import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../../test/test-utils';
import { AuthForm } from '../AuthForm';

describe('Password strength indicator', () => {
  const noop = vi.fn().mockResolvedValue(undefined);

  const getStrengthLabel = () => {
    const candidates = ['Weak', 'Fair', 'Good', 'Strong'];
    for (const label of candidates) {
      const el = screen.queryByText(label);
      if (el) return label;
    }
    return null;
  };

  const switchToRegister = () => {
    fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
  };

  const typePassword = (value: string) => {
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value } });
  };

  it('should not show strength indicator in login mode', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    typePassword('password123');
    expect(getStrengthLabel()).toBeNull();
  });

  it('should not show strength indicator when password is empty', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    expect(getStrengthLabel()).toBeNull();
  });

  it('should show "Weak" for short passwords (< 6 chars)', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('ab1');
    expect(getStrengthLabel()).toBe('Weak');
  });

  it('should show "Fair" for 6+ chars without mixed case or numbers', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('abcdef');
    expect(getStrengthLabel()).toBe('Fair');
  });

  it('should show "Good" for 8+ chars with mixed case', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('Abcdefgh');
    expect(getStrengthLabel()).toBe('Good');
  });

  it('should show "Good" for 8+ chars with numbers', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('abcdefg1');
    expect(getStrengthLabel()).toBe('Good');
  });

  it('should show "Strong" for 10+ chars with mixed case, number, and special', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('Abcdefg1!@');
    expect(getStrengthLabel()).toBe('Strong');
  });

  it('should NOT be strong if missing special char', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('Abcdefgh12');
    expect(getStrengthLabel()).toBe('Good');
  });

  it('should NOT be strong if missing uppercase', () => {
    render(<AuthForm onLogin={noop} onRegister={noop} />);
    switchToRegister();
    typePassword('abcdefgh1!');
    expect(getStrengthLabel()).toBe('Good');
  });
});
