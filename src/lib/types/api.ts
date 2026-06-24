// ─── Enums (matching backend Prisma schema) ────────────────────────────────

export type UserRole = 'NONE' | 'DOCTOR' | 'NURSE' | 'PATIENT';

export type ConsultationStatus =
  | 'CREATED'
  | 'PENDING_DOCTOR_REVIEW'
  | 'DOCTOR_DECIDED'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ConsultationMode = 'ASYNC' | 'ONLINE' | 'IN_PERSON';

export type VisitMethod = 'CHAT' | 'VOICE_CALL' | 'VIDEO_CALL' | 'ON_SITE';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO' | 'SYSTEM';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type TriageLevel = 'SELF_CARE' | 'SEE_DOCTOR' | 'URGENT' | 'EMERGENCY';

export type DocumentType = 'LICENSE' | 'ID_CARD' | 'CERTIFICATION' | 'PHOTO' | 'OTHER';

export type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type NotificationChannel = 'EMAIL' | 'PUSH' | 'BOTH';

export type DoctorSpecialty =
  | 'CARDIOLOGY' | 'DERMATOLOGY' | 'ENT' | 'GASTROENTEROLOGY'
  | 'GYNECOLOGY' | 'NEUROLOGY' | 'ONCOLOGY' | 'ORTHOPEDICS'
  | 'PEDIATRICS' | 'PSYCHIATRY' | 'UROLOGY' | 'GENERAL' | 'OTHER';

// ─── API Envelope ───────────────────────────────────────────────────────────

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
}

// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
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

// ─── Consultation ───────────────────────────────────────────────────────────

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: number;
  soapId?: string;
  status: ConsultationStatus;
  doctorDecision?: ConsultationMode;
  visitMethod?: VisitMethod;
  notes?: string;
  summary?: string;
  followUpNeeded: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Pick<User, 'id' | 'firstname' | 'lastname' | 'email' | 'avatar'>;
  doctor?: DoctorProfile;
  soap?: PatientSOAP;
  chat?: Chat;
}

// ─── SOAP ───────────────────────────────────────────────────────────────────

export interface PatientSOAP {
  id: string;
  userId: string;
  conversationId: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  rawNote: string;
  suggestedSpecialty?: DoctorSpecialty;
  triageLevel?: TriageLevel;
  confidenceScores?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// ─── Doctor ─────────────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: number;
  userId: string;
  startedAt: string;
  specialty: DoctorSpecialty | string;
  secondarySpecialties?: DoctorSpecialty[];
  university?: string;
  location?: string;
  clinicLocation?: string;
  bio?: string;
  visitMethods?: VisitMethod[];
  visitTypes?: string[];
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  platformSummary?: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'firstname' | 'lastname' | 'email' | 'avatar'>;
  rating?: number;
  totalReviews?: number;
}

export interface DoctorRating {
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface DoctorDocument {
  id: number;
  doctorId: number;
  type: DocumentType | string;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  status: DocumentStatus | string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Review ─────────────────────────────────────────────────────────────────

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
  reviewer?: Pick<User, 'id' | 'firstname' | 'lastname' | 'avatar'>;
  doctor?: Pick<DoctorProfile, 'id' | 'specialty'> & {
    user?: Pick<User, 'firstname' | 'lastname'>;
  };
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatParticipant {
  userId: string;
  joinedAt: string;
  lastSeenAt?: string;
  user?: Pick<User, 'id' | 'firstname' | 'lastname' | 'email'>;
}

export interface Chat {
  id: string;
  topic?: string;
  consultationId?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  participants?: ChatParticipant[];
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  fileUrl?: string;
  repliedToId?: string;
  readBy?: Array<{ userId: string; readAt: string }>;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Scheduling ─────────────────────────────────────────────────────────────

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
  method: VisitMethod | string;
  status: AppointmentStatus;
  notes?: string;
  calendlyEventUri?: string;
  calendlyRescheduleUrl?: string;
  calendlyCancelUrl?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Pick<User, 'id' | 'firstname' | 'lastname' | 'email'>;
  doctor?: DoctorProfile;
}

// ─── Notification ───────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channel: NotificationChannel;
  isRead: boolean;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalConsultations: number;
  pendingVerifications: number;
}
