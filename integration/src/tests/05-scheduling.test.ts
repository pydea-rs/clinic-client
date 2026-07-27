import { describe, it, expect, beforeAll } from 'vitest';
import { createTestClient, TestClient } from '../helpers/api-client.js';
import { createAdminApi } from '@client/api/admin.api';
import { createDoctorApi } from '@client/api/doctor.api';
import { createSchedulingApi } from '@client/api/scheduling.api';

/**
 * Phase 6 — Scheduling integration tests.
 *
 * Register budget (5/60s): 2 (doctor + patient) = 2 used
 * Login budget (5/60s): 1 (superadmin) = 1 used
 */

async function warmUp(tc: TestClient): Promise<void> {
  await tc.axios.get('/user');
}

function futureMonday(): Date {
  const now = new Date();
  const daysUntilMonday = ((1 - now.getUTCDay()) + 7) % 7 || 7;
  const monday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday + 7, // at least 1 week ahead
    10, 0, 0, 0,
  ));
  return monday;
}

function futureWednesday(): Date {
  const mon = futureMonday();
  return new Date(Date.UTC(
    mon.getUTCFullYear(),
    mon.getUTCMonth(),
    mon.getUTCDate() + 2,
    10, 0, 0, 0,
  ));
}

describe('Scheduling', () => {
  const superadminEmail = 'admin@ai-clinic.com';
  const superadminPassword = 'SuperAdmin123!';
  const doctorEmail = `sched-doc-${Date.now()}@test.local`;
  const doctorPassword = 'DocPass456!';
  const patientEmail = `sched-pat-${Date.now()}@test.local`;
  const patientPassword = 'PatPass456!';

  let doctorTc: TestClient;
  let doctorScheduling: ReturnType<typeof createSchedulingApi>;
  let doctorProfileId: number;

  let patientTc: TestClient;
  let patientScheduling: ReturnType<typeof createSchedulingApi>;

  let mondayAvailId: number;
  let tuesdayAvailId: number;
  let wednesdayAvailId: number;
  let slotDurationId: number;
  let exceptionId: number;
  let appointmentId: number;

  beforeAll(async () => {
    // Register #1: doctor
    doctorTc = createTestClient();
    await warmUp(doctorTc);
    await doctorTc.axios.post('/auth/register', {
      firstname: 'SchedDoc',
      lastname: 'Test',
      email: doctorEmail,
      password: doctorPassword,
      role: 'DOCTOR',
    });
    const doctorApi = createDoctorApi(doctorTc.axios);
    doctorScheduling = createSchedulingApi(doctorTc.axios);

    // Create doctor profile
    const profile = await doctorApi.createProfile({
      startedAt: '2015-06-01T00:00:00.000Z',
      specialty: 'GENERAL',
      visitMethods: ['CHAT', 'VIDEO_CALL'],
      visitTypes: ['CONSULTATION'],
      bio: 'General practitioner',
    });
    doctorProfileId = profile.id;

    // Login #1: superadmin to verify doctor
    const adminTc = createTestClient();
    await warmUp(adminTc);
    await adminTc.axios.post('/auth/login', {
      email: superadminEmail,
      password: superadminPassword,
    });
    const adminApi = createAdminApi(adminTc.axios);
    await adminApi.verifications.verify(doctorProfileId, true);

    // Register #2: patient
    patientTc = createTestClient();
    await warmUp(patientTc);
    await patientTc.axios.post('/auth/register', {
      firstname: 'SchedPat',
      lastname: 'Test',
      email: patientEmail,
      password: patientPassword,
      role: 'PATIENT',
    });
    patientScheduling = createSchedulingApi(patientTc.axios);
  });

  // ─── Set Availability ────────────────────────────────────────────

  describe('Availability', () => {
    it('should set Monday availability 09:00-17:00', async () => {
      const avail = await doctorScheduling.createAvailability({
        dayOfWeek: 1, // Monday
        startTime: '09:00',
        endTime: '17:00',
      });

      expect(avail).toBeDefined();
      expect(avail.id).toBeDefined();
      expect(avail.dayOfWeek).toBe(1);
      expect(avail.startTime).toBe('09:00');
      expect(avail.endTime).toBe('17:00');
      expect(avail.isActive).toBe(true);
      mondayAvailId = avail.id;
    });

    it('should set Tuesday and Wednesday availability', async () => {
      const tue = await doctorScheduling.createAvailability({
        dayOfWeek: 2, // Tuesday
        startTime: '10:00',
        endTime: '16:00',
      });
      expect(tue.dayOfWeek).toBe(2);
      tuesdayAvailId = tue.id;

      const wed = await doctorScheduling.createAvailability({
        dayOfWeek: 3, // Wednesday
        startTime: '08:00',
        endTime: '12:00',
      });
      expect(wed.dayOfWeek).toBe(3);
      wednesdayAvailId = wed.id;
    });

    it('should update Monday hours to 10:00-18:00', async () => {
      const updated = await doctorScheduling.updateAvailability(mondayAvailId, {
        startTime: '10:00',
        endTime: '18:00',
      });

      expect(updated.startTime).toBe('10:00');
      expect(updated.endTime).toBe('18:00');
    });

    it('should delete Wednesday availability', async () => {
      await doctorScheduling.deleteAvailability(wednesdayAvailId);

      const all = await doctorScheduling.getAvailability();
      const wed = all.find((a: any) => a.id === wednesdayAvailId);
      expect(wed).toBeUndefined();
    });
  });

  // ─── Slot Durations ──────────────────────────────────────────────

  describe('Slot Durations', () => {
    it('should set 30-minute slot duration', async () => {
      const duration = await doctorScheduling.createSlotDuration({
        minutes: 30,
        price: 50,
        label: 'Standard consultation',
      });

      expect(duration).toBeDefined();
      expect(duration.id).toBeDefined();
      expect(duration.minutes).toBe(30);
      expect(Number(duration.price)).toBe(50);
      expect(duration.label).toBe('Standard consultation');
      slotDurationId = duration.id;
    });

    it('should return durations via public endpoint', async () => {
      const unauthTc = createTestClient();
      const unauthScheduling = createSchedulingApi(unauthTc.axios);
      const durations = await unauthScheduling.getDoctorDurations(doctorProfileId);

      expect(Array.isArray(durations)).toBe(true);
      expect(durations.length).toBeGreaterThanOrEqual(1);
      const found = durations.find((d: any) => d.id === slotDurationId);
      expect(found).toBeDefined();
      expect(found.minutes).toBe(30);
    });
  });

  // ─── Exceptions ──────────────────────────────────────────────────

  describe('Exceptions', () => {
    it('should add a full-day exception (block)', async () => {
      const exceptionDate = futureMonday();
      const exc = await doctorScheduling.createException({
        date: exceptionDate.toISOString().split('T')[0],
        isBlocked: true,
        reason: 'Holiday',
      });

      expect(exc).toBeDefined();
      expect(exc.id).toBeDefined();
      expect(exc.isBlocked).toBe(true);
      expect(exc.reason).toBe('Holiday');
      exceptionId = exc.id;
    });

    it('should add a partial-day exception', async () => {
      const exceptionDate = new Date(futureMonday());
      exceptionDate.setUTCDate(exceptionDate.getUTCDate() + 7); // a week after
      const exc = await doctorScheduling.createException({
        date: exceptionDate.toISOString().split('T')[0],
        isBlocked: false,
        startTime: '10:00',
        endTime: '12:00',
        reason: 'Morning meeting',
      });

      expect(exc).toBeDefined();
      expect(exc.startTime).toBe('10:00');
      expect(exc.endTime).toBe('12:00');
    });
  });

  // ─── Available Slots (Public) ────────────────────────────────────

  describe('Available Slots', () => {
    it('should return available slots for a date range', async () => {
      const unauthTc = createTestClient();
      const unauthScheduling = createSchedulingApi(unauthTc.axios);

      const start = futureMonday();
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 14);

      const slots = await unauthScheduling.getDoctorSlots(doctorProfileId, {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        duration: 30,
      });

      expect(Array.isArray(slots)).toBe(true);
      // Should have slots on Mondays and Tuesdays (Wednesday was deleted)
      // The first Monday is blocked by full-day exception, so it should have no slots on that day
      const exceptionDate = futureMonday().toISOString().split('T')[0];
      const blockedDaySlots = slots.filter((s: any) => s.date === exceptionDate);
      expect(blockedDaySlots.length).toBe(0);
    });

    it('should have slots on non-exception days', async () => {
      const unauthTc = createTestClient();
      const unauthScheduling = createSchedulingApi(unauthTc.axios);

      // Check for Tuesday slots (no exception on Tuesdays)
      const start = futureMonday();
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 14);

      const slots = await unauthScheduling.getDoctorSlots(doctorProfileId, {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        duration: 30,
      });

      // Find a Tuesday slot
      const tuesdaySlots = slots.filter((s: any) => {
        const d = new Date(s.date + 'T00:00:00Z');
        return d.getUTCDay() === 2;
      });
      expect(tuesdaySlots.length).toBeGreaterThan(0);
      expect(tuesdaySlots[0].durationMinutes).toBe(30);
    });
  });

  // ─── Book Appointment ────────────────────────────────────────────

  describe('Appointments', () => {
    it('should book an appointment on a valid slot', async () => {
      // Find an available Tuesday slot
      const start = futureMonday();
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 14);

      const unauthScheduling = createSchedulingApi(createTestClient().axios);
      const slots = await unauthScheduling.getDoctorSlots(doctorProfileId, {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        duration: 30,
      });

      // Pick a Tuesday slot
      const tuesdaySlot = slots.find((s: any) => {
        const d = new Date(s.date + 'T00:00:00Z');
        return d.getUTCDay() === 2;
      });
      expect(tuesdaySlot).toBeDefined();

      const appointment = await patientScheduling.bookAppointment({
        doctorId: doctorProfileId,
        dateTime: `${tuesdaySlot.date}T${tuesdaySlot.startTime}:00.000Z`,
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      });

      expect(appointment).toBeDefined();
      expect(appointment.id).toBeDefined();
      expect(appointment.status).toBe('PENDING');
      expect(appointment.durationMinutes).toBe(30);
      expect(appointment.method).toBe('CHAT');
      appointmentId = appointment.id;
    });

    it('should list patient appointments', async () => {
      const { appointments } = await patientScheduling.getAppointments();

      expect(appointments.length).toBeGreaterThanOrEqual(1);
      const found = appointments.find((a: any) => a.id === appointmentId);
      expect(found).toBeDefined();
      expect(found.status).toBe('PENDING');
    });

    it('should list doctor appointments', async () => {
      const { appointments } = await doctorScheduling.getAppointments();

      expect(appointments.length).toBeGreaterThanOrEqual(1);
      const found = appointments.find((a: any) => a.id === appointmentId);
      expect(found).toBeDefined();
    });

    it('should get appointment by ID', async () => {
      const appointment = await patientScheduling.getAppointmentById(appointmentId);

      expect(appointment).toBeDefined();
      expect(appointment.id).toBe(appointmentId);
      expect(appointment.status).toBe('PENDING');
      expect(appointment.doctor).toBeDefined();
      expect(appointment.patient).toBeDefined();
    });

    it('should cancel an appointment', async () => {
      const cancelled = await patientScheduling.cancelAppointment(appointmentId);

      expect(cancelled.status).toBe('CANCELLED');
    });
  });

  // ─── Unhappy Paths ───────────────────────────────────────────────

  describe('Unhappy Paths', () => {
    it('should reject booking an already-taken slot with 409', async () => {
      const start = futureMonday();
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 14);

      const unauthScheduling = createSchedulingApi(createTestClient().axios);
      const slots = await unauthScheduling.getDoctorSlots(doctorProfileId, {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        duration: 30,
      });

      // Pick a LATE Tuesday slot to avoid collision with the booking test's slot
      const tuesdaySlots = slots.filter((s: any) => {
        const d = new Date(s.date + 'T00:00:00Z');
        return d.getUTCDay() === 2;
      });
      expect(tuesdaySlots.length).toBeGreaterThanOrEqual(2);
      const tuesdaySlot = tuesdaySlots[tuesdaySlots.length - 1]; // last available

      const dateTime = `${tuesdaySlot.date}T${tuesdaySlot.startTime}:00.000Z`;

      // First booking succeeds
      const first = await patientTc.axios.post('/scheduling/book', {
        doctorId: doctorProfileId,
        dateTime,
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      });
      expect([200, 201]).toContain(first.status);

      // Second booking on same slot → 409
      const response = await patientTc.axios.post('/scheduling/book', {
        doctorId: doctorProfileId,
        dateTime,
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      });
      expect(response.status).toBe(409);
    });

    it('should reject patient creating an exception with 403', async () => {
      const response = await patientTc.axios.post('/scheduling/exceptions', {
        date: futureMonday().toISOString().split('T')[0],
        isBlocked: true,
        reason: 'Hacking',
      });
      expect(response.status).toBe(403);
    });

    it('should reject booking with invalid doctor ID with 404', async () => {
      const response = await patientTc.axios.post('/scheduling/book', {
        doctorId: 999999,
        dateTime: futureMonday().toISOString(),
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      });
      expect(response.status).toBe(404);
    });

    it('should reject booking a past slot with 400', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const response = await patientTc.axios.post('/scheduling/book', {
        doctorId: doctorProfileId,
        dateTime: pastDate.toISOString(),
        durationMinutes: 30,
        price: 50,
        method: 'CHAT',
      });
      expect(response.status).toBe(400);
    });

    it('should reject patient setting availability with 403', async () => {
      const response = await patientTc.axios.post('/scheduling/availability', {
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
      });
      expect(response.status).toBe(403);
    });

    it('should reject deleting nonexistent availability with 404', async () => {
      const response = await doctorTc.axios.delete('/scheduling/availability/999999');
      expect(response.status).toBe(404);
    });

    it('should reject cancelling already-cancelled appointment with 400', async () => {
      const response = await patientTc.axios.patch(`/scheduling/appointments/${appointmentId}/cancel`);
      expect(response.status).toBe(400);
    });
  });
});
