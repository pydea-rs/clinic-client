import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../../test/test-utils';
import { AuthForm } from '../AuthForm';

const getSubmitButton = () =>
  document.querySelector('button[type="submit"]') as HTMLButtonElement;

describe('AuthForm', () => {
  const mockOnLogin = vi.fn();
  const mockOnRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Mode', () => {
    it('should render login form by default', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onLogin with correct credentials', async () => {
      mockOnLogin.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@test.com', 'password123');
      });
    });

    it('should not call onLogin with empty fields', async () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockOnLogin).not.toHaveBeenCalled();
      });
    });

    it('should call onLogin even when it rejects', async () => {
      mockOnLogin.mockRejectedValue({ message: 'Invalid credentials' });

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(getSubmitButton());

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('test@test.com', 'wrong');
      });
    });
  });

  describe('Register Mode', () => {
    it('should switch to register mode', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const registerTab = screen.getByRole('button', { name: /^register$/i });
      fireEvent.click(registerTab);

      expect(screen.getByText(/create your account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should call onRegister with correct data', async () => {
      mockOnRegister.mockResolvedValue(undefined);

      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      const registerTab = screen.getByRole('button', { name: /^register$/i });
      fireEvent.click(registerTab);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(getSubmitButton());

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

      const registerTab = screen.getByRole('button', { name: /^register$/i });
      fireEvent.click(registerTab);

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(getSubmitButton());

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

      const registerTab = screen.getByRole('button', { name: /^register$/i });
      fireEvent.click(registerTab);

      const newEmailInput = screen.getByLabelText(/email/i);
      expect(newEmailInput).toHaveValue('test@test.com');
    });

    it('should toggle between login and register modes', () => {
      render(<AuthForm onLogin={mockOnLogin} onRegister={mockOnRegister} />);

      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^register$/i }));
      expect(screen.getByText(/create your account/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });
});
