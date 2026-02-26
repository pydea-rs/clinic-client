import { apiClient } from '../lib/api/client';
import { DoctorAvailability, SlotDuration, AvailabilityException, Appointment } from '../lib/types/api';

// Scheduling API Adapter
export const schedulingApi = {
  // Doctor availability CRUD
  availability: {
    create: async (items: Array<{ dayOfWeek: number; startTime: string; endTime: string }>): Promise<DoctorAvailability[]> => {
      const response = await apiClient.post('/scheduling/availability', items);
      return response.data;
    },
    list: async (): Promise<DoctorAvailability[]> => {
      const response = await apiClient.get('/scheduling/availability');
      return response.data;
    },
    update: async (id: number, payload: { dayOfWeek?: number; startTime?: string; endTime?: string }): Promise<DoctorAvailability> => {
      const response = await apiClient.patch(`/scheduling/availability/${id}`, payload);
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/scheduling/availability/${id}`);
    },
  },

  // Slot durations CRUD
  slotDurations: {
    create: async (durations: Array<{ minutes: number; price: number; label?: string }>): Promise<SlotDuration[]> => {
      const response = await apiClient.post('/scheduling/slot-durations', durations);
      return response.data;
    },
    list: async (): Promise<SlotDuration[]> => {
      const response = await apiClient.get('/scheduling/slot-durations');
      return response.data;
    },
  },

  // Availability exceptions CRUD
  exceptions: {
    create: async (payload: { date: string; isBlocked: boolean; startTime?: string; endTime?: string; reason?: string }): Promise<AvailabilityException> => {
      const response = await apiClient.post('/scheduling/exceptions', payload);
      return response.data;
    },
    list: async (params?: { startDate?: string; endDate?: string }): Promise<AvailabilityException[]> => {
      const response = await apiClient.get('/scheduling/exceptions', { params });
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await apiClient.delete(`/scheduling/exceptions/${id}`);
    },
  },

  // Public slot explorer
  getSlots: async (doctorId: number, params?: { startDate: string; endDate: string; duration?: number }): Promise<Array<{ startTime: string; endTime: string; duration: number; price: string }>> => {
    const response = await apiClient.get(`/scheduling/doctor/${doctorId}/slots`, { params });
    return response.data;
  },

  // Get slot durations (public)
  getDurations: async (doctorId: number): Promise<Array<{ minutes: number; price: string; label?: string }>> => {
    const response = await apiClient.get(`/scheduling/doctor/${doctorId}/durations`);
    return response.data;
  },

  // Booking
  book: async (payload: {
    doctorId: number;
    dateTime: string;
    durationMinutes: number;
    method: string;
  }): Promise<Appointment> => {
    const response = await apiClient.post('/scheduling/book', payload);
    return response.data;
  },

  // Appointments
  appointments: {
    list: async (params?: { page?: number; limit?: number; status?: string }): Promise<{ data: Appointment[]; total: number }> => {
      const response = await apiClient.get('/scheduling/appointments', { params });
      return response.data;
    },
    getById: async (id: number): Promise<Appointment> => {
      const response = await apiClient.get(`/scheduling/appointments/${id}`);
      return response.data;
    },
    cancel: async (id: number): Promise<Appointment> => {
      const response = await apiClient.patch(`/scheduling/appointments/${id}/cancel`);
      return response.data;
    },
  },
};
