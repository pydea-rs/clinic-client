import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../../test/test-utils';
import { AuthForm } from '../AuthForm';

describe('AuthForm', () => {
  const mockOnLogin = vi.fn();
  const mockOnRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Mode', () => {
    it('should render login form by default', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onLogin with correct credentials', async () => {
      mockOnLogin.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith({
          email: 'test@test.com',
          password: 'password123',
        });
      });
    });

    it('should show validation errors for empty fields', async () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show error message on login failure', async () => {
      mockOnLogin.mockRejectedValue({ message: 'Invalid credentials' });

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Register Mode', () => {
    it('should switch to register mode', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const switchButton = screen.getByText(/don't have an account/i);
      fireEvent.click(switchButton);

      expect(screen.getByText(/sign up/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onRegister with correct data', async () => {
      mockOnRegister.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Switch to register mode
      const switchButton = screen.getByText(/don't have an account/i);
      fireEvent.click(switchButton);

      const firstnameInput = screen.getByLabelText(/first name/i);
      const lastnameInput = screen.getByLabelText(/last name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(firstnameInput, { target: { value: 'John' } });
      fireEvent.change(lastnameInput, { target: { value: 'Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnRegister).toHaveBeenCalledWith({
          firstname: 'John',
          lastname: 'Doe',
          email: 'john@test.com',
          password: 'password123',
          role: 'PATIENT',
        });
      });
    });

    it('should validate all required fields in register mode', async () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Switch to register mode
      const switchButton = screen.getByText(/don't have an account/i);
      fireEvent.click(switchButton);

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });

      expect(mockOnRegister).not.toHaveBeenCalled();
    });
  });

  describe('Mode Switching', () => {
    it('should clear form when switching modes', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });

      const switchButton = screen.getByText(/don't have an account/i);
      fireEvent.click(switchButton);

      const newEmailInput = screen.getByLabelText(/email/i);
      expect(newEmailInput).toHaveValue('');
    });

    it('should toggle between login and register modes', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Start in login mode
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();

      // Switch to register
      fireEvent.click(screen.getByText(/don't have an account/i));
      expect(screen.getByText(/sign up/i)).toBeInTheDocument();

      // Switch back to login
      fireEvent.click(screen.getByText(/already have an account/i));
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });
  });
});
