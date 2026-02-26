import { apiClient } from '../lib/api/client';
import { 
  DoctorAvailability, 
  SlotDuration, 
  AvailabilityException, 
  Appointment 
} from '../lib/types/api';

export interface BookingPayload {
  doctorId: number;
  dateTime: string;
  durationMinutes: number;
  consultationId?: string;
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

  updateAvailability: async (payload: Partial<DoctorAvailability>): Promise<DoctorAvailability> => {
    const response = await apiClient.patch('/scheduling/availability', payload);
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

  updateSlotDuration: async (payload: Partial<SlotDuration>): Promise<SlotDuration> => {
    const response = await apiClient.patch('/scheduling/slot-durations', payload);
    return response.data;
  },

  deleteSlotDuration: async (durationId: number): Promise<void> => {
    await apiClient.delete(`/scheduling/slot-durations/${durationId}`);
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
    startDate?: string;
    endDate?: string;
    duration?: number;
  }): Promise<{ slots: string[]; total: number }> => {
    const response = await apiClient.get(`/scheduling/doctor/${doctorId}/slots`, { params });
    return response.data;
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
    const response = await apiClient.get('/scheduling/appointments', {
      params: { page, limit },
    });
    return response.data;
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
