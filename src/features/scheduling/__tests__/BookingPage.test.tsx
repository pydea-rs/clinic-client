import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingPage } from '../BookingPage';

const { mockToast, mockBook, mockCreateConsultation, mockGetDoctor } = vi.hoisted(() => ({
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockBook: vi.fn(),
  mockCreateConsultation: vi.fn(),
  mockGetDoctor: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: mockToast }));

vi.mock('../../../api', () => ({
  schedulingApi: { bookAppointment: (...args: unknown[]) => mockBook(...args) },
  consultationApi: { create: (...args: unknown[]) => mockCreateConsultation(...args) },
  doctorApi: { getDoctorById: (...args: unknown[]) => mockGetDoctor(...args) },
}));

const ORIGINAL_TZ = process.env.TZ;
const pad = (n: number) => String(n).padStart(2, '0');

function randomSlot() {
  const day = new Date(Date.now() + (1 + Math.floor(Math.random() * 60)) * 86_400_000);
  const date = day.toISOString().slice(0, 10);
  const hour = 8 + Math.floor(Math.random() * 8);
  return { date, startTime: `${pad(hour)}:00`, endTime: `${pad(hour)}:30` };
}

function renderBooking(doctorId: number | string, state: unknown) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/booking/${doctorId}`, state }]}>
        <Routes>
          <Route path="/booking/:doctorId" element={<BookingPage />} />
          <Route path="/slots/:doctorId" element={<div>Slot picker</div>} />
          <Route path="/appointments" element={<div>Appointments list</div>} />
          <Route path="/consultation/:id" element={<div>Consultation page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BookingPage', () => {
  let doctorId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    doctorId = Math.floor(Math.random() * 10_000) + 1;
    mockGetDoctor.mockResolvedValue({ id: doctorId, user: { firstname: 'Sara', lastname: 'Rezaei' } });
  });

  afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.TZ;
    else process.env.TZ = ORIGINAL_TZ;
  });

  it.each(['Asia/Tehran', 'America/Los_Angeles', 'UTC'])(
    'books the UTC instant of the selected slot when the browser is in %s',
    async (tz) => {
      process.env.TZ = tz;
      const slot = randomSlot();
      const price = 20 + Math.floor(Math.random() * 80);
      mockBook.mockResolvedValue({ id: crypto.randomUUID() });

      renderBooking(doctorId, { slot, duration: 30, price });
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm Booking' }));

      expect(await screen.findByText('Appointments list')).toBeInTheDocument();
      expect(mockBook).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId,
          dateTime: `${slot.date}T${slot.startTime}:00.000Z`,
          durationMinutes: 30,
          price,
        }),
      );
    },
  );

  it('labels the selected slot as UTC', async () => {
    const slot = randomSlot();

    renderBooking(doctorId, { slot, duration: 30, price: 50 });

    expect(
      await screen.findByText(`${slot.date} ${slot.startTime} - ${slot.endTime} UTC`),
    ).toBeInTheDocument();
  });

  it('creates a consultation for the SOAP context after booking', async () => {
    const soapId = crypto.randomUUID();
    mockBook.mockResolvedValue({ id: crypto.randomUUID() });
    mockCreateConsultation.mockResolvedValue({ id: crypto.randomUUID() });

    renderBooking(doctorId, { slot: randomSlot(), duration: 30, price: 50, soapId });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Booking' }));

    expect(await screen.findByText('Consultation page')).toBeInTheDocument();
    expect(mockCreateConsultation).toHaveBeenCalledWith({ doctorId, soapId });
  });

  it('stays on the page and shows the server error when booking fails', async () => {
    mockBook.mockRejectedValue({ message: 'Requested time is outside doctor availability hours.' });

    renderBooking(doctorId, { slot: randomSlot(), duration: 30, price: 50 });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm Booking' }));

    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith('Requested time is outside doctor availability hours.'),
    );
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeEnabled();
    expect(screen.queryByText('Appointments list')).not.toBeInTheDocument();
  });

  it('redirects to the slot picker when no slot was selected', async () => {
    renderBooking(doctorId, null);

    expect(await screen.findByText('Slot picker')).toBeInTheDocument();
    expect(mockBook).not.toHaveBeenCalled();
  });

  it('shows an error for a non-numeric doctor id without fetching or redirecting', async () => {
    renderBooking('not-a-number', { slot: randomSlot(), duration: 30, price: 50 });

    expect(await screen.findByText('Invalid doctor ID.')).toBeInTheDocument();
    expect(screen.queryByText('Slot picker')).not.toBeInTheDocument();
    expect(mockGetDoctor).not.toHaveBeenCalled();
    expect(mockBook).not.toHaveBeenCalled();
  });

  it('redirects to the slot picker when the slot is invalid', async () => {
    renderBooking(doctorId, { slot: { date: '2026-02-30', startTime: '09:00', endTime: '09:30' } });

    expect(await screen.findByText('Slot picker')).toBeInTheDocument();
    expect(mockBook).not.toHaveBeenCalled();
  });
});
