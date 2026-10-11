import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SlotExplorer } from '../SlotExplorer';

const { mockNavigate, mockGetSlots, mockGetDurations } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetSlots: vi.fn(),
  mockGetDurations: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
vi.mock('../../../api', () => ({
  schedulingApi: {
    getDoctorSlots: (...args: unknown[]) => mockGetSlots(...args),
    getDoctorDurations: (...args: unknown[]) => mockGetDurations(...args),
  },
}));

const durations = [
  { id: 1, minutes: 30, price: 40 },
  { id: 2, minutes: 60, price: 70 },
];

/** Slots for the requested day and duration, starting at 09:00. */
function slotsFor(_doctorId: number, { start, duration }: { start: string; duration: number }) {
  const end = (minutes: number) => `${String(9 + Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return Promise.resolve([
    { date: start, startTime: '09:00', endTime: end(duration), durationMinutes: duration },
    { date: start, startTime: end(duration), endTime: end(2 * duration), durationMinutes: duration },
  ]);
}

async function renderExplorer() {
  render(
    <MemoryRouter initialEntries={['/slots/7']}>
      <Routes>
        <Route path="/slots/:doctorId" element={<SlotExplorer />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByRole('button', { name: /09:00/ });
}

describe('SlotExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDurations.mockResolvedValue(durations);
    mockGetSlots.mockImplementation(slotsFor);
  });

  it("should book the picked slot with its own length and that length's price", async () => {
    await renderExplorer();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '60' } });
    fireEvent.click(await screen.findByRole('button', { name: /09:00 - 10:00/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Book Now' }));

    expect(mockNavigate).toHaveBeenCalledWith('/booking/7', {
      state: expect.objectContaining({
        slot: expect.objectContaining({ startTime: '09:00', durationMinutes: 60 }),
        duration: 60,
        price: 70,
      }),
    });
  });

  it.each([
    ['the date', () => fireEvent.change(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), { target: { value: '2031-05-06' } })],
    ['the duration', () => fireEvent.change(screen.getByRole('combobox'), { target: { value: '60' } })],
  ])('should drop the picked slot when %s changes, so a slot that is no longer shown is not booked', async (_case, change) => {
    await renderExplorer();
    fireEvent.click(screen.getAllByRole('button', { name: /09:00/ })[0]);
    expect(screen.getByRole('button', { name: 'Book Now' })).toBeInTheDocument();

    change();

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Book Now' })).not.toBeInTheDocument());
  });

  it('should show the picked slot with its date and UTC', async () => {
    await renderExplorer();
    const [first] = await mockGetSlots.mock.results[0].value;

    fireEvent.click(screen.getAllByRole('button', { name: /09:00/ })[0]);

    expect(screen.getByText(`${first.date} 09:00 - 09:30 UTC`)).toBeInTheDocument();
    expect(screen.getByText('Duration: 30 min')).toBeInTheDocument();
  });
});
