import type { AvailableSlot } from '../api/scheduling.api';

// Slot date/time are UTC; without the "Z" they would be parsed in the browser's timezone.
// The round-trip check rejects inputs Date silently rolls over (e.g. Feb 30 → Mar 2).
export function slotStartToIso(slot: Pick<AvailableSlot, 'date' | 'startTime'>): string {
  const iso = `${slot.date}T${slot.startTime}:00.000Z`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== iso) {
    throw new RangeError(`Invalid slot: ${slot.date} ${slot.startTime}`);
  }
  return iso;
}
