// API Response Envelope Types
export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  contents: T;
}

export interface ApiError {
  status: number;
  message: string;
  contents: null;
  timestamp: string;
  path: string;
}

// Auth Types
export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: 'NONE' | 'DOCTOR' | 'NURSE' | 'PATIENT';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isPrivate: boolean;
  isActive: boolean;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
}

// Consultation Types
export interface Consultation {
  id: string;
  patientId: string;
  doctorId: number;
  soapId?: string;
  status: 'CREATED' | 'PENDING_DOCTOR_REVIEW' | 'DOCTOR_DECIDED' | 'PENDING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  doctorDecision?: 'ASYNC' | 'ONLINE' | 'IN_PERSON';
  visitMethod?: 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';
  notes?: string;
  summary?: string;
  followUpNeeded: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// SOAP Types
export interface PatientSOAP {
  id: string;
  userId: string;
  conversationId: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  rawNote: string;
  suggestedSpecialty?: string;
  triageLevel?: 'SELF_CARE' | 'SEE_DOCTOR' | 'URGENT' | 'EMERGENCY';
  confidenceScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// Doctor Types
export interface DoctorProfile {
  id: number;
  userId: string;
  startedAt: string;
  specialty: string;
  secondarySpecialties: string[];
  university?: string;
  location?: string;
  clinicLocation?: string;
  bio?: string;
  visitMethods: string[];
  visitTypes: string[];
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  platformSummary?: string;
  createdAt: string;
  updatedAt: string;
}

// Review Types
export interface DoctorReview {
  id: number;
  reviewerId: string;
  doctorId: number;
  title?: string;
  overview?: string;
  verified: boolean;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

// Chat Types
export interface Chat {
  id: string;
  topic?: string;
  consultationId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface Message {
  id: number;
  chatId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';
  fileUrl?: string;
  repliedToId?: number;
  readBy?: Array<{ userId: string; readAt: string }>;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Scheduling Types
export interface DoctorAvailability {
  id: number;
  doctorId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlotDuration {
  id: number;
  doctorId: number;
  minutes: number;
  price: string;
  label?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityException {
  id: number;
  doctorId: number;
  date: string;
  isBlocked: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
}

export interface Appointment {
  id: number;
  patientId: string;
  doctorId: number;
  consultationId?: string;
  dateTime: string;
  durationMinutes: number;
  price: string;
  method: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel: 'EMAIL' | 'PUSH' | 'BOTH';
  isRead: boolean;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

// Admin Types
export interface PlatformStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalConsultations: number;
  pendingVerifications: number;
}
