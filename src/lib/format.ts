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
};

const SPECIALTY_LABELS: Record<string, string> = {
  GENERAL_PRACTICE: 'General Practice',
  INTERNAL_MEDICINE: 'Internal Medicine',
  FAMILY_MEDICINE: 'Family Medicine',
  PEDIATRICS: 'Pediatrics',
  CARDIOLOGY: 'Cardiology',
  DERMATOLOGY: 'Dermatology',
  ENDOCRINOLOGY: 'Endocrinology',
  GASTROENTEROLOGY: 'Gastroenterology',
  NEUROLOGY: 'Neurology',
  ONCOLOGY: 'Oncology',
  OPHTHALMOLOGY: 'Ophthalmology',
  ORTHOPEDICS: 'Orthopedics',
  OTOLARYNGOLOGY: 'ENT',
  PSYCHIATRY: 'Psychiatry',
  PULMONOLOGY: 'Pulmonology',
  RHEUMATOLOGY: 'Rheumatology',
  UROLOGY: 'Urology',
  OBSTETRICS_GYNECOLOGY: 'OB/GYN',
  EMERGENCY_MEDICINE: 'Emergency Medicine',
  ANESTHESIOLOGY: 'Anesthesiology',
  RADIOLOGY: 'Radiology',
  PATHOLOGY: 'Pathology',
  SPORTS_MEDICINE: 'Sports Medicine',
  ALLERGY_IMMUNOLOGY: 'Allergy & Immunology',
  INFECTIOUS_DISEASE: 'Infectious Disease',
  GERIATRICS: 'Geriatrics',
  NEPHROLOGY: 'Nephrology',
  HEMATOLOGY: 'Hematology',
  PLASTIC_SURGERY: 'Plastic Surgery',
  GENERAL_SURGERY: 'General Surgery',
  PHYSICAL_THERAPY: 'Physical Therapy',
  NUTRITION: 'Nutrition',
  PSYCHOLOGY: 'Psychology',
};

const TRIAGE_LABELS: Record<string, string> = {
  SELF_CARE: 'Self Care',
  SEE_DOCTOR: 'See a Doctor',
  URGENT: 'Urgent',
  EMERGENCY: 'Emergency',
};

const VISIT_METHOD_LABELS: Record<string, string> = {
  VIDEO: 'Video Call',
  VOICE: 'Voice Call',
  CHAT: 'Chat',
  IN_PERSON: 'In Person',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  MEDICAL_LICENSE: 'Medical License',
  BOARD_CERTIFICATION: 'Board Certification',
  GOVERNMENT_ID: 'Government ID',
  DIPLOMA: 'Diploma',
  CV_RESUME: 'CV / Resume',
  OTHER: 'Other',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  CONSULTATION_UPDATE: 'Consultation Update',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  APPOINTMENT_REMINDER: 'Appointment Reminder',
  APPOINTMENT_CANCELLED: 'Appointment Cancelled',
  MATCH_FOUND: 'Match Found',
  MATCH_ACCEPTED: 'Match Accepted',
  MATCH_REJECTED: 'Match Rejected',
  NEW_MESSAGE: 'New Message',
  SOAP_READY: 'SOAP Ready',
  GENERAL: 'General',
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

export function formatDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || toTitleCase(type);
}

export function formatNotificationType(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] || toTitleCase(type);
}

export function formatEnum(value: string): string {
  return toTitleCase(value);
}
