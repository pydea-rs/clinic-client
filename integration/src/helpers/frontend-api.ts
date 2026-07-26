import { AxiosInstance } from 'axios';
import FormData from 'form-data';

// ─── Auth API ───────────────────────────────────────────────────────

export function createAuthApi(client: AxiosInstance) {
  return {
    login: async (email: string, password: string) => {
      await client.post('/auth/login', { email, password });
    },
    register: async (payload: {
      firstname: string;
      lastname: string;
      email: string;
      password: string;
      role?: 'PATIENT' | 'DOCTOR';
    }) => {
      await client.post('/auth/register', payload);
    },
    me: async () => {
      const response = await client.get('/user');
      return response.data;
    },
    logout: async () => {
      await client.post('/auth/logout');
    },
  };
}

// ─── User API ───────────────────────────────────────────────────────

export function createUserApi(client: AxiosInstance) {
  return {
    getCurrentUser: async () => {
      const response = await client.get('/user');
      return response.data;
    },
    updateProfile: async (payload: {
      email?: string;
      firstname?: string;
      lastname?: string;
      isPrivate?: boolean;
      avatar?: string;
    }) => {
      const response = await client.patch('/user/profile', payload);
      return response.data;
    },
    changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
      await client.patch('/user/change-password', payload);
    },
    uploadAvatar: async (fileBuffer: Buffer, filename: string, contentType: string) => {
      const form = new FormData();
      form.append('file', fileBuffer, { filename, contentType });
      const response = await client.post('/user/avatar', form, {
        headers: form.getHeaders(),
      });
      return response.data;
    },
    getUserById: async (userId: string) => {
      const response = await client.get(`/user/${userId}`);
      return response.data;
    },
    getAllUsers: async () => {
      const response = await client.get('/user/all');
      const data = response.data;
      return Array.isArray(data) ? data : data?.data ?? [];
    },
    searchUsers: async (query: string) => {
      const response = await client.get('/user/search', { params: { q: query } });
      return response.data;
    },
  };
}

// ─── Doctor API ─────────────────────────────────────────────────────

export function createDoctorApi(client: AxiosInstance) {
  return {
    getDoctors: async (params?: {
      specialty?: string;
      visitMethod?: string;
      location?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const { page, limit, ...rest } = params || {};
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/doctor', { params: { ...rest, skip, take: limit } });
      const result = response.data;
      return { doctors: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getDoctorById: async (doctorId: number | string) => {
      const response = await client.get(`/doctor/${doctorId}`);
      return response.data;
    },
    getDoctorRating: async (doctorId: number | string) => {
      const response = await client.get(`/doctor/${doctorId}/rating`);
      return response.data;
    },
    createProfile: async (payload: any) => {
      const response = await client.post('/doctor', payload);
      return response.data;
    },
    updateProfile: async (payload: any) => {
      const response = await client.patch('/doctor/profile', payload);
      return response.data;
    },
    uploadDocument: async (fileBuffer: Buffer, filename: string, contentType: string, documentType: string) => {
      const form = new FormData();
      form.append('file', fileBuffer, { filename, contentType });
      form.append('type', documentType);
      const response = await client.post('/doctor/documents', form, {
        headers: form.getHeaders(),
      });
      return response.data;
    },
    getDocuments: async () => {
      const response = await client.get('/doctor/documents');
      return response.data;
    },
    getStats: async () => {
      const response = await client.get('/doctor/stats');
      return response.data;
    },
    getMyProfile: async () => {
      const response = await client.get('/doctor/me');
      return response.data;
    },
  };
}

// ─── Patient API ────────────────────────────────────────────────────

export function createPatientApi(client: AxiosInstance) {
  return {
    getProfile: async () => {
      const response = await client.get('/patient/profile');
      return response.data;
    },
    createProfile: async (payload: any) => {
      const response = await client.post('/patient/profile', payload);
      return response.data;
    },
    updateProfile: async (payload: any) => {
      const response = await client.patch('/patient/profile', payload);
      return response.data;
    },
    getConsultations: async (page?: number, limit?: number, status?: string) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/patient/consultations', {
        params: { skip, take: limit, status: status || undefined },
      });
      const result = response.data;
      return { consultations: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getSOAPs: async (page?: number, limit?: number) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/patient/soaps', { params: { skip, take: limit } });
      const result = response.data;
      return { soaps: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getSOAPDetail: async (soapId: string) => {
      const response = await client.get(`/soap/${soapId}`);
      return response.data;
    },
  };
}

// ─── Consultation API ───────────────────────────────────────────────

export function createConsultationApi(client: AxiosInstance) {
  return {
    create: async (payload: { doctorId: number; soapId?: string }) => {
      const response = await client.post('/consultation', payload);
      return response.data;
    },
    getConsultations: async (page?: number, limit?: number, status?: string) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/consultation', { params: { skip, take: limit, status } });
      const result = response.data;
      return { consultations: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getConsultationById: async (consultationId: string) => {
      const response = await client.get(`/consultation/${consultationId}`);
      return response.data;
    },
    decide: async (consultationId: string, payload: { doctorDecision: string; visitMethod: string }) => {
      const response = await client.patch(`/consultation/${consultationId}/decide`, payload);
      return response.data;
    },
    complete: async (consultationId: string, payload: { notes?: string; summary?: string; followUpNeeded?: boolean }) => {
      const response = await client.patch(`/consultation/${consultationId}/complete`, payload);
      return response.data;
    },
    advancePayment: async (consultationId: string) => {
      const response = await client.patch(`/consultation/${consultationId}/advance-payment`);
      return response.data;
    },
    confirmPayment: async (consultationId: string) => {
      const response = await client.patch(`/consultation/${consultationId}/confirm-payment`);
      return response.data;
    },
    start: async (consultationId: string) => {
      const response = await client.patch(`/consultation/${consultationId}/start`);
      return response.data;
    },
    cancel: async (consultationId: string) => {
      const response = await client.patch(`/consultation/${consultationId}/cancel`);
      return response.data;
    },
  };
}

// ─── Matching API ───────────────────────────────────────────────────

export function createMatchingApi(client: AxiosInstance) {
  return {
    createRequest: async (payload: { soapId?: string; specialty?: string }) => {
      const response = await client.post('/matching/request', payload);
      return response.data;
    },
    getStatus: async (matchRequestId: string) => {
      const response = await client.get(`/matching/status/${matchRequestId}`);
      return response.data;
    },
    getActive: async () => {
      const response = await client.get('/matching/active');
      return response.data || null;
    },
    getPending: async () => {
      const response = await client.get('/matching/pending');
      return response.data;
    },
    cancel: async (matchRequestId: string) => {
      const response = await client.patch(`/matching/${matchRequestId}/cancel`);
      return response.data;
    },
    browse: async (matchRequestId: string) => {
      const response = await client.patch(`/matching/${matchRequestId}/browse`);
      return response.data;
    },
  };
}

// ─── Chat API ───────────────────────────────────────────────────────

export function createChatApi(client: AxiosInstance) {
  return {
    create: async (payload: { participantId: string; topic?: string; consultationId?: string }) => {
      const response = await client.post('/chat', payload);
      return response.data;
    },
    list: async () => {
      const response = await client.get('/chat');
      const result = response.data;
      if (result?.chats) return result;
      if (Array.isArray(result)) return { chats: result, total: result.length };
      return { chats: [], total: 0 };
    },
    getById: async (id: string) => {
      const response = await client.get(`/chat/${id}`);
      return response.data;
    },
    getMessages: async (id: string, params?: { page?: number; limit?: number }) => {
      const skip = params?.page ? (params.page - 1) * (params.limit || 20) : undefined;
      const response = await client.get(`/chat/${id}/messages`, { params: { skip, take: params?.limit } });
      const result = response.data;
      return { messages: result?.messages || result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    sendMessage: async (chatId: string, payload: {
      content: string;
      type?: string;
      fileUrl?: string;
      repliedToId?: string;
    }) => {
      const response = await client.post(`/chat/${chatId}/message`, payload);
      return response.data;
    },
  };
}

// ─── Scheduling API ─────────────────────────────────────────────────

export function createSchedulingApi(client: AxiosInstance) {
  return {
    getAvailability: async (doctorId?: number) => {
      const response = await client.get('/scheduling/availability', { params: { doctorId } });
      return response.data;
    },
    createAvailability: async (payload: any, doctorId?: number) => {
      const response = await client.post('/scheduling/availability', payload, { params: { doctorId } });
      return response.data;
    },
    updateAvailability: async (id: number, payload: any, doctorId?: number) => {
      const response = await client.patch(`/scheduling/availability/${id}`, payload, { params: { doctorId } });
      return response.data;
    },
    deleteAvailability: async (availabilityId: number, doctorId?: number) => {
      await client.delete(`/scheduling/availability/${availabilityId}`, { params: { doctorId } });
    },
    getSlotDurations: async (doctorId?: number) => {
      const response = await client.get('/scheduling/slot-durations', { params: { doctorId } });
      return response.data;
    },
    createSlotDuration: async (payload: any, doctorId?: number) => {
      const response = await client.post('/scheduling/slot-durations', payload, { params: { doctorId } });
      return response.data;
    },
    getExceptions: async (doctorId?: number) => {
      const response = await client.get('/scheduling/exceptions', { params: { doctorId } });
      return response.data;
    },
    createException: async (payload: any, doctorId?: number) => {
      const response = await client.post('/scheduling/exceptions', payload, { params: { doctorId } });
      return response.data;
    },
    deleteException: async (exceptionId: number, doctorId?: number) => {
      await client.delete(`/scheduling/exceptions/${exceptionId}`, { params: { doctorId } });
    },
    getDoctorSlots: async (doctorId: number, params?: { start?: string; end?: string; duration?: number }) => {
      const response = await client.get(`/scheduling/doctor/${doctorId}/slots`, { params });
      const result = response.data;
      return Array.isArray(result) ? result : (result?.data || []);
    },
    getDoctorDurations: async (doctorId: number) => {
      const response = await client.get(`/scheduling/doctor/${doctorId}/durations`);
      return response.data;
    },
    bookAppointment: async (payload: {
      doctorId: number;
      dateTime: string;
      durationMinutes: number;
      price: number;
      method: string;
      consultationId?: string;
      notes?: string;
    }) => {
      const response = await client.post('/scheduling/book', payload);
      return response.data;
    },
    getAppointments: async (page?: number, limit?: number, filters?: { status?: string; from?: string; to?: string }) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/scheduling/appointments', {
        params: { skip, take: limit, ...filters },
      });
      const result = response.data;
      return { appointments: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getAppointmentById: async (appointmentId: number) => {
      const response = await client.get(`/scheduling/appointments/${appointmentId}`);
      return response.data;
    },
    cancelAppointment: async (appointmentId: number) => {
      const response = await client.patch(`/scheduling/appointments/${appointmentId}/cancel`);
      return response.data;
    },
  };
}

// ─── Review API ─────────────────────────────────────────────────────

export function createReviewApi(client: AxiosInstance) {
  return {
    createReview: async (payload: { doctorId: number; title?: string; overview?: string; rating: number }) => {
      const response = await client.post('/review', payload);
      return response.data;
    },
    updateReview: async (reviewId: number, payload: { title?: string; overview?: string; rating?: number }) => {
      const response = await client.patch(`/review/${reviewId}`, payload);
      return response.data;
    },
    deleteReview: async (reviewId: number) => {
      await client.delete(`/review/${reviewId}`);
    },
    getDoctorReviews: async (doctorId: number, page?: number, limit?: number) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get(`/review/doctor/${doctorId}`, { params: { skip, take: limit } });
      const result = response.data;
      return { reviews: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },
    getAllReviews: async (page?: number, limit?: number) => {
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/review/admin/all', { params: { skip, take: limit } });
      const result = response.data;
      return { reviews: result?.data || [], total: result?.total || 0 };
    },
    getDoctorRating: async (doctorId: number) => {
      const response = await client.get(`/review/doctor/${doctorId}/rating`);
      return response.data;
    },
  };
}

// ─── Notification API ───────────────────────────────────────────────

export function createNotificationApi(client: AxiosInstance) {
  return {
    list: async (params?: { skip?: number; take?: number }) => {
      const response = await client.get('/notification', { params });
      return response.data;
    },
    getUnreadCount: async () => {
      const response = await client.get('/notification/unread-count');
      return response.data?.count ?? 0;
    },
    markAsRead: async (notificationId: number) => {
      const response = await client.patch(`/notification/${notificationId}/read`);
      return response.data;
    },
    markAllAsRead: async () => {
      const response = await client.patch('/notification/read-all');
      return response.data;
    },
    subscribePush: async (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
      await client.post('/notification/subscribe', subscription);
    },
    unsubscribePush: async (endpoint: string) => {
      await client.delete('/notification/unsubscribe', { data: { endpoint } });
    },
  };
}

// ─── Admin API ──────────────────────────────────────────────────────

export function createAdminApi(client: AxiosInstance) {
  return {
    users: {
      list: async (params?: { skip?: number; take?: number; role?: string; search?: string; isActive?: boolean; isAdmin?: boolean; isBanned?: boolean }) => {
        const response = await client.get('/admin/users', { params });
        return response.data;
      },
      update: async (id: string, payload: any) => {
        const response = await client.patch(`/admin/users/${id}`, payload);
        return response.data;
      },
      deactivate: async (id: string) => {
        const response = await client.patch(`/admin/users/${id}/deactivate`);
        return response.data;
      },
      ban: async (id: string, reason: string) => {
        const response = await client.patch(`/admin/users/${id}/ban`, { reason });
        return response.data;
      },
      unban: async (id: string) => {
        const response = await client.patch(`/admin/users/${id}/unban`);
        return response.data;
      },
    },
    verifications: {
      listPending: async () => {
        const response = await client.get('/admin/doctors/pending');
        return response.data;
      },
      getDocuments: async (doctorId: number) => {
        const response = await client.get(`/admin/doctors/${doctorId}/documents`);
        return response.data;
      },
      verify: async (doctorId: number, approved: boolean, reason?: string) => {
        const response = await client.patch(`/admin/doctors/${doctorId}/verify`, { approved, reason });
        return response.data;
      },
    },
    adminActions: {
      promote: async (id: string) => {
        const response = await client.patch(`/admin/users/${id}/promote`);
        return response.data;
      },
      demote: async (id: string) => {
        const response = await client.patch(`/admin/users/${id}/demote`);
        return response.data;
      },
    },
    reviews: {
      delete: async (reviewId: number) => {
        await client.delete(`/admin/reviews/${reviewId}`);
      },
    },
    stats: async () => {
      const response = await client.get('/admin/stats');
      return response.data;
    },
  };
}

// ─── Nurse API ──────────────────────────────────────────────────────

export function createNurseApi(client: AxiosInstance) {
  return {
    getDashboard: async () => {
      const response = await client.get('/nurse/dashboard');
      return response.data;
    },
    assign: async (nurseId: string, permissions?: string[]) => {
      const response = await client.post('/nurse/assign', { nurseId, permissions });
      return response.data;
    },
    updatePermissions: async (assignmentId: number, permissions: string[]) => {
      const response = await client.patch(`/nurse/assignment/${assignmentId}/permissions`, { permissions });
      return response.data;
    },
    remove: async (assignmentId: number) => {
      const response = await client.delete(`/nurse/assignment/${assignmentId}`);
      return response.data;
    },
    getAssignments: async () => {
      const response = await client.get('/nurse/assignments');
      return response.data;
    },
    getAssignment: async (assignmentId: number) => {
      const response = await client.get(`/nurse/assignment/${assignmentId}`);
      return response.data;
    },
  };
}

// ─── SOAP API ───────────────────────────────────────────────────────

export function createSoapApi(client: AxiosInstance) {
  return {
    list: async (params?: { skip?: number; take?: number }) => {
      const response = await client.get('/soap', { params });
      return response.data;
    },
    getById: async (id: string) => {
      const response = await client.get(`/soap/${id}`);
      return response.data;
    },
  };
}

// ─── AI Agents API ──────────────────────────────────────────────────

export function createAiAgentsApi(client: AxiosInstance) {
  return {
    listConversations: async (params?: { skip?: number; take?: number }) => {
      const response = await client.get('/ai-agents/conversations', { params });
      return response.data;
    },
    startNewConversation: async () => {
      const response = await client.post('/ai-agents/start/new', {}, { timeout: 60_000 });
      return response.data;
    },
    resumeConversation: async (conversationId: string) => {
      const response = await client.post(`/ai-agents/start/${conversationId}`, {}, { timeout: 60_000 });
      return response.data;
    },
    renameConversation: async (conversationId: string, topic: string) => {
      const response = await client.patch(`/ai-agents/conversations/${conversationId}/rename`, { topic });
      return response.data;
    },
    sendMessage: async (conversationId: string, text: string) => {
      const response = await client.post('/ai-agents/message', { conversationId, text });
      return response.data;
    },
    getMessages: async (conversationId: string, dateOffset?: string) => {
      const response = await client.get(`/ai-agents/messages/${conversationId}`, { params: { dateOffset } });
      return response.data;
    },
    getHistory: async (conversationId: string) => {
      const response = await client.get(`/ai-agents/history/${conversationId}`);
      return response.data;
    },
    startConversation: async () => {
      const response = await client.post('/ai-agents/start', {}, { timeout: 60_000 });
      return response.data;
    },
    openaiChat: async (message: string) => {
      const response = await client.post('/ai-agents/openai', { message });
      return response.data;
    },
  };
}

// ─── Payment API ────────────────────────────────────────────────────

export function createPaymentApi(client: AxiosInstance) {
  return {
    list: async (params?: { skip?: number; take?: number; status?: string }) => {
      const response = await client.get('/payment', { params });
      return response.data;
    },
    getById: async (paymentId: number) => {
      const response = await client.get(`/payment/${paymentId}`);
      return response.data;
    },
    create: async (payload: { consultationId: string; amount: number; method?: string }) => {
      const response = await client.post('/payment', payload);
      return response.data;
    },
    confirm: async (paymentId: number) => {
      const response = await client.post(`/payment/${paymentId}/confirm`);
      return response.data;
    },
  };
}
