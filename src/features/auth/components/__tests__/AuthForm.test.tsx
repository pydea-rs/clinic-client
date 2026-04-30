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

      expect(screen.getByText(/login to continue/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onLogin with correct credentials', async () => {
      mockOnLogin.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@test.com', 'password123');
      });
    });

    it('should not call onLogin with empty fields', async () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const submitButton = screen.getByRole('button', { name: /login/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).not.toHaveBeenCalled();
      });
    });

    it('should call onLogin even when it rejects', async () => {
      mockOnLogin.mockRejectedValue({ message: 'Invalid credentials' });

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@test.com', 'wrong');
      });
    });
  });

  describe('Register Mode', () => {
    it('should switch to register mode', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const switchButton = screen.getByText(/need an account\? register/i);
      fireEvent.click(switchButton);

      expect(screen.getByText(/create your account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onRegister with correct data', async () => {
      mockOnRegister.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Switch to register mode
      const switchButton = screen.getByText(/need an account\? register/i);
      fireEvent.click(switchButton);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
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

    it('should not call onRegister when full name is missing', async () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Switch to register mode
      const switchButton = screen.getByText(/need an account\? register/i);
      fireEvent.click(switchButton);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /register/i });

      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnRegister).not.toHaveBeenCalled();
      });
    });
  });

  describe('Mode Switching', () => {
    it('should keep entered email when switching modes', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });

      const switchButton = screen.getByText(/need an account\? register/i);
      fireEvent.click(switchButton);

      const newEmailInput = screen.getByLabelText(/email/i);
      expect(newEmailInput).toHaveValue('test@test.com');
    });

    it('should toggle between login and register modes', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      // Start in login mode
      expect(screen.getByText(/login to continue/i)).toBeInTheDocument();

      // Switch to register
      fireEvent.click(screen.getByText(/need an account\? register/i));
      expect(screen.getByText(/create your account/i)).toBeInTheDocument();

      // Switch back to login
      fireEvent.click(screen.getByText(/have an account\? login/i));
      expect(screen.getByText(/login to continue/i)).toBeInTheDocument();
    });
  });
});
