import type { AxiosInstance } from 'axios';
import type {
  DoctorAvailability,
  SlotDuration,
  AvailabilityException,
  Appointment
} from '../lib/types/api';

export interface AvailableSlot {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface BookingPayload {
  doctorId: number;
  dateTime: string;
  durationMinutes: number;
  price: number;
  method: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';
  consultationId?: string;
  notes?: string;
}

export function createSchedulingApi(client: AxiosInstance) {
  return {
    getAvailability: async (doctorId?: number): Promise<DoctorAvailability[]> => {
      const response = await client.get('/scheduling/availability', { params: { doctorId } });
      return response.data;
    },

    createAvailability: async (payload: Partial<DoctorAvailability>, doctorId?: number): Promise<DoctorAvailability> => {
      const response = await client.post('/scheduling/availability', payload, { params: { doctorId } });
      return response.data;
    },

    updateAvailability: async (id: number, payload: Partial<DoctorAvailability>, doctorId?: number): Promise<DoctorAvailability> => {
      const response = await client.patch(`/scheduling/availability/${id}`, payload, { params: { doctorId } });
      return response.data;
    },

    deleteAvailability: async (availabilityId: number, doctorId?: number): Promise<void> => {
      await client.delete(`/scheduling/availability/${availabilityId}`, { params: { doctorId } });
    },

    getSlotDurations: async (doctorId?: number): Promise<SlotDuration[]> => {
      const response = await client.get('/scheduling/slot-durations', { params: { doctorId } });
      return response.data;
    },

    createSlotDuration: async (payload: Partial<SlotDuration>, doctorId?: number): Promise<SlotDuration> => {
      const response = await client.post('/scheduling/slot-durations', payload, { params: { doctorId } });
      return response.data;
    },

    getExceptions: async (doctorId?: number): Promise<AvailabilityException[]> => {
      const response = await client.get('/scheduling/exceptions', { params: { doctorId } });
      return response.data;
    },

    createException: async (payload: Partial<AvailabilityException>, doctorId?: number): Promise<AvailabilityException> => {
      const response = await client.post('/scheduling/exceptions', payload, { params: { doctorId } });
      return response.data;
    },

    deleteException: async (exceptionId: number, doctorId?: number): Promise<void> => {
      await client.delete(`/scheduling/exceptions/${exceptionId}`, { params: { doctorId } });
    },

    getDoctorSlots: async (doctorId: number, params?: {
      start?: string;
      end?: string;
      duration?: number;
    }): Promise<AvailableSlot[]> => {
      const response = await client.get(`/scheduling/doctor/${doctorId}/slots`, { params });
      const result = response.data;
      return Array.isArray(result) ? result : (result?.data || []);
    },

    getDoctorDurations: async (doctorId: number): Promise<SlotDuration[]> => {
      const response = await client.get(`/scheduling/doctor/${doctorId}/durations`);
      return response.data;
    },

    bookAppointment: async (payload: BookingPayload): Promise<Appointment> => {
      const response = await client.post('/scheduling/book', payload);
      return response.data;
    },

    getAppointments: async (page?: number, limit?: number, filters?: { status?: string; from?: string; to?: string }): Promise<{ appointments: Appointment[]; total: number }> => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/scheduling/appointments', {
        params: { skip, take: limit, ...filters },
      });
      const result = response.data;
      return { appointments: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getAppointmentById: async (appointmentId: number): Promise<Appointment> => {
      const response = await client.get(`/scheduling/appointments/${appointmentId}`);
      return response.data;
    },

    cancelAppointment: async (appointmentId: number): Promise<Appointment> => {
      const response = await client.patch(`/scheduling/appointments/${appointmentId}/cancel`);
      return response.data;
    },
  };
}

export type SchedulingApi = ReturnType<typeof createSchedulingApi>;
