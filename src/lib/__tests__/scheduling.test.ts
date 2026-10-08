import { describe, it, expect, afterEach } from 'vitest';
import { slotStartToIso } from '../scheduling';

const ORIGINAL_TZ = process.env.TZ;

const TIMEZONES = ['UTC', 'Asia/Tehran', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Asia/Kathmandu'];

const pad = (n: number) => String(n).padStart(2, '0');

function randomSlot() {
  const day = new Date(Date.UTC(2026, 0, 1) + Math.floor(Math.random() * 730) * 86_400_000);
  const date = day.toISOString().slice(0, 10);
  const startTime = `${pad(Math.floor(Math.random() * 24))}:${pad(Math.floor(Math.random() * 4) * 15)}`;
  return { date, startTime };
}

describe('slotStartToIso', () => {
  afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.TZ;
    else process.env.TZ = ORIGINAL_TZ;
  });

  it.each(TIMEZONES)('returns the UTC instant of the slot when the browser is in %s', (tz) => {
    process.env.TZ = tz;
    const slot = randomSlot();

    expect(slotStartToIso(slot)).toBe(`${slot.date}T${slot.startTime}:00.000Z`);
  });

  it('does not shift a late-evening slot into the next local day', () => {
    process.env.TZ = 'Pacific/Kiritimati'; // UTC+14
    expect(slotStartToIso({ date: '2026-12-31', startTime: '23:45' })).toBe('2026-12-31T23:45:00.000Z');
  });

  it('differs from naive local parsing outside UTC (regression guard)', () => {
    process.env.TZ = 'Asia/Tehran';
    const slot = { date: '2026-03-17', startTime: '09:00' };

    expect(new Date(`${slot.date}T${slot.startTime}`).toISOString()).toBe('2026-03-17T05:30:00.000Z');
    expect(slotStartToIso(slot)).toBe('2026-03-17T09:00:00.000Z');
  });

  it.each([
    { date: 'not-a-date', startTime: '09:00' },
    { date: '2026-03-17', startTime: '25:00' },
    { date: '2026-02-30', startTime: '09:00' },
    { date: '', startTime: '' },
    { date: '2026-03-17', startTime: '24:00' },
    { date: '2026-03-17', startTime: '9:00' },
    { date: '2026-03-17', startTime: '09:00:00' },
  ])('throws for an invalid slot %o', (slot) => {
    expect(() => slotStartToIso(slot)).toThrow(RangeError);
  });
});
