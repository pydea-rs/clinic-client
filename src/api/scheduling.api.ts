import { apiClient } from '../lib/api/client';
import {
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

export const schedulingApi = {
  // Doctor availability CRUD
  getAvailability: async (): Promise<DoctorAvailability[]> => {
    const response = await apiClient.get('/scheduling/availability');
    return response.data;
  },

  createAvailability: async (payload: Partial<DoctorAvailability>): Promise<DoctorAvailability> => {
    const response = await apiClient.post('/scheduling/availability', payload);
    return response.data;
  },

  updateAvailability: async (id: number, payload: Partial<DoctorAvailability>): Promise<DoctorAvailability> => {
    const response = await apiClient.patch(`/scheduling/availability/${id}`, payload);
    return response.data;
  },

  deleteAvailability: async (availabilityId: number): Promise<void> => {
    await apiClient.delete(`/scheduling/availability/${availabilityId}`);
  },

  // Slot durations CRUD
  getSlotDurations: async (): Promise<SlotDuration[]> => {
    const response = await apiClient.get('/scheduling/slot-durations');
    return response.data;
  },

  createSlotDuration: async (payload: Partial<SlotDuration>): Promise<SlotDuration> => {
    const response = await apiClient.post('/scheduling/slot-durations', payload);
    return response.data;
  },

  // Availability exceptions CRUD
  getExceptions: async (): Promise<AvailabilityException[]> => {
    const response = await apiClient.get('/scheduling/exceptions');
    return response.data;
  },

  createException: async (payload: Partial<AvailabilityException>): Promise<AvailabilityException> => {
    const response = await apiClient.post('/scheduling/exceptions', payload);
    return response.data;
  },

  deleteException: async (exceptionId: number): Promise<void> => {
    await apiClient.delete(`/scheduling/exceptions/${exceptionId}`);
  },

  // Public slot explorer
  getDoctorSlots: async (doctorId: number, params?: {
    start?: string;
    end?: string;
    duration?: number;
  }): Promise<AvailableSlot[]> => {
    const response = await apiClient.get(`/scheduling/doctor/${doctorId}/slots`, { params });
    const result = response.data;
    return Array.isArray(result) ? result : (result?.data || []);
  },

  getDoctorDurations: async (doctorId: number): Promise<SlotDuration[]> => {
    const response = await apiClient.get(`/scheduling/doctor/${doctorId}/durations`);
    return response.data;
  },

  // Booking
  bookAppointment: async (payload: BookingPayload): Promise<Appointment> => {
    const response = await apiClient.post('/scheduling/book', payload);
    return response.data;
  },

  // Appointments
  getAppointments: async (page?: number, limit?: number): Promise<{ appointments: Appointment[]; total: number }> => {
    const skip = page ? (page - 1) * (limit || 20) : undefined;
    const response = await apiClient.get('/scheduling/appointments', {
      params: { skip, take: limit },
    });
    const result = response.data;
    return { appointments: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
  },

  getAppointmentById: async (appointmentId: number): Promise<Appointment> => {
    const response = await apiClient.get(`/scheduling/appointments/${appointmentId}`);
    return response.data;
  },

  cancelAppointment: async (appointmentId: number): Promise<Appointment> => {
    const response = await apiClient.patch(`/scheduling/appointments/${appointmentId}/cancel`);
    return response.data;
  },
};
