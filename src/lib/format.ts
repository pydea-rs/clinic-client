const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  PENDING: 'Pending',
  PENDING_DOCTOR_REVIEW: 'Awaiting Doctor',
  DOCTOR_DECIDED: 'Doctor Reviewed',
  PENDING_PAYMENT: 'Awaiting Payment',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SEARCHING: 'Searching',
  FOUND: 'Found',
  TIMEOUT: 'Timed Out',
  MANUAL_BROWSE: 'Manual Browse',
  CONSULTATION_CREATED: 'Consultation Created',
  MATCHED: 'Matched',
  ACCEPTED: 'Accepted',
  NO_SHOW: 'No Show',
};

const SPECIALTY_LABELS: Record<string, string> = {
  CARDIOLOGY: 'Cardiology',
  DERMATOLOGY: 'Dermatology',
  ENT: 'ENT',
  GASTROENTEROLOGY: 'Gastroenterology',
  GYNECOLOGY: 'Gynecology',
  NEUROLOGY: 'Neurology',
  ONCOLOGY: 'Oncology',
  ORTHOPEDICS: 'Orthopedics',
  PEDIATRICS: 'Pediatrics',
  PSYCHIATRY: 'Psychiatry',
  UROLOGY: 'Urology',
  GENERAL: 'General',
  OTHER: 'Other',
};

const TRIAGE_LABELS: Record<string, string> = {
  SELF_CARE: 'Self Care',
  SEE_DOCTOR: 'See a Doctor',
  URGENT: 'Urgent',
  EMERGENCY: 'Emergency',
};

const VISIT_METHOD_LABELS: Record<string, string> = {
  VIDEO_CALL: 'Video Call',
  VOICE_CALL: 'Voice Call',
  CHAT: 'Chat',
  ON_SITE: 'On-Site',
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consultation',
  EXAMINATION: 'Clinical Examination',
  SURGERY: 'Surgery',
  LABORATORY: 'Laboratory',
  RADIOLOGY: 'Radiology',
  PHARMACY: 'Pharmacy',
  DENTISTRY: 'Dentistry',
  THERAPY: 'Therapy',
  NUTRITION: 'Nutrition',
  DIRECT_DIAGNOSIS: 'Direct Diagnosis',
  OTHER: 'Other',
};

/** Visit methods reserved for real-time calling (Phase 19) and disabled in decisions. */
export const UNIMPLEMENTED_VISIT_METHODS: ReadonlySet<string> = new Set([
  'VOICE_CALL',
  'VIDEO_CALL',
]);

export function isVisitMethodSoon(method?: string | null): boolean {
  return Boolean(method && UNIMPLEMENTED_VISIT_METHODS.has(method));
}

const DOC_TYPE_LABELS: Record<string, string> = {
  LICENSE: 'Medical License',
  ID_CARD: 'ID Card',
  CERTIFICATION: 'Certification',
  PHOTO: 'Photo',
  OTHER: 'Other',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  CONSULTATION_REQUEST: 'Consultation Request',
  DOCTOR_DECISION: 'Doctor Decision',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  APPOINTMENT_REMINDER: 'Appointment Reminder',
  APPOINTMENT_CANCELLED: 'Appointment Cancelled',
  NEW_CHAT_MESSAGE: 'New Message',
  NEW_REVIEW: 'New Review',
  DOCTOR_VERIFIED: 'Doctor Verified',
  SOAP_READY: 'SOAP Ready',
  SYSTEM: 'System',
};

function toTitleCase(str: string): string {
  return str
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] || toTitleCase(status);
}

export function formatSpecialty(specialty: string): string {
  return SPECIALTY_LABELS[specialty] || toTitleCase(specialty);
}

export function formatTriageLevel(level: string): string {
  return TRIAGE_LABELS[level] || toTitleCase(level);
}

export function formatVisitMethod(method: string): string {
  return VISIT_METHOD_LABELS[method] || toTitleCase(method);
}

export function formatVisitType(type: string): string {
  return VISIT_TYPE_LABELS[type] || toTitleCase(type);
}

export function formatDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || toTitleCase(type);
}

export function formatNotificationType(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] || toTitleCase(type);
}

export function formatEnum(value: string): string {
  return toTitleCase(value);
}

/** Uppercase first-letter initials for a user, falling back when names are absent. */
export function getUserInitials(
  firstname?: string | null,
  lastname?: string | null,
  defaultInitials = '?',
): string {
  const initials = `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();
  return initials || defaultInitials;
}
