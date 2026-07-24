import { describe, it, expect } from 'vitest';
import {
  formatStatus,
  formatSpecialty,
  formatTriageLevel,
  formatVisitMethod,
  formatDocType,
  formatNotificationType,
  formatEnum,
} from '../format';

describe('format utilities', () => {
  describe('formatStatus', () => {
    it('should return mapped label for known statuses', () => {
      expect(formatStatus('CREATED')).toBe('Created');
      expect(formatStatus('PENDING')).toBe('Pending');
      expect(formatStatus('PENDING_DOCTOR_REVIEW')).toBe('Awaiting Doctor');
      expect(formatStatus('DOCTOR_DECIDED')).toBe('Doctor Reviewed');
      expect(formatStatus('PENDING_PAYMENT')).toBe('Awaiting Payment');
      expect(formatStatus('PAYMENT_CONFIRMED')).toBe('Payment Confirmed');
      expect(formatStatus('IN_PROGRESS')).toBe('In Progress');
      expect(formatStatus('COMPLETED')).toBe('Completed');
      expect(formatStatus('CANCELLED')).toBe('Cancelled');
      expect(formatStatus('SEARCHING')).toBe('Searching');
      expect(formatStatus('TIMEOUT')).toBe('Timed Out');
      expect(formatStatus('MANUAL_BROWSE')).toBe('Manual Browse');
      expect(formatStatus('CONSULTATION_CREATED')).toBe('Consultation Created');
      expect(formatStatus('MATCHED')).toBe('Matched');
      expect(formatStatus('ACCEPTED')).toBe('Accepted');
      expect(formatStatus('NO_SHOW')).toBe('No Show');
    });

    it('should fall back to title case for unknown statuses', () => {
      expect(formatStatus('SOME_NEW_STATUS')).toBe('Some New Status');
    });
  });

  describe('formatSpecialty', () => {
    it('should return mapped label for known specialties', () => {
      expect(formatSpecialty('CARDIOLOGY')).toBe('Cardiology');
      expect(formatSpecialty('DERMATOLOGY')).toBe('Dermatology');
      expect(formatSpecialty('ENT')).toBe('ENT');
      expect(formatSpecialty('GASTROENTEROLOGY')).toBe('Gastroenterology');
      expect(formatSpecialty('GENERAL')).toBe('General');
      expect(formatSpecialty('OTHER')).toBe('Other');
    });

    it('should fall back to title case for unknown specialties', () => {
      expect(formatSpecialty('SPORTS_MEDICINE')).toBe('Sports Medicine');
    });
  });

  describe('formatTriageLevel', () => {
    it('should return mapped label for all triage levels', () => {
      expect(formatTriageLevel('SELF_CARE')).toBe('Self Care');
      expect(formatTriageLevel('SEE_DOCTOR')).toBe('See a Doctor');
      expect(formatTriageLevel('URGENT')).toBe('Urgent');
      expect(formatTriageLevel('EMERGENCY')).toBe('Emergency');
    });

    it('should fall back to title case for unknown triage levels', () => {
      expect(formatTriageLevel('CRITICAL')).toBe('Critical');
    });
  });

  describe('formatVisitMethod', () => {
    it('should return mapped label for all visit methods', () => {
      expect(formatVisitMethod('VIDEO_CALL')).toBe('Video Call');
      expect(formatVisitMethod('VOICE_CALL')).toBe('Voice Call');
      expect(formatVisitMethod('CHAT')).toBe('Chat');
      expect(formatVisitMethod('ON_SITE')).toBe('On-Site');
    });

    it('should fall back to title case for unknown methods', () => {
      expect(formatVisitMethod('EMAIL')).toBe('Email');
    });
  });

  describe('formatDocType', () => {
    it('should return mapped label for all doc types', () => {
      expect(formatDocType('LICENSE')).toBe('Medical License');
      expect(formatDocType('ID_CARD')).toBe('ID Card');
      expect(formatDocType('CERTIFICATION')).toBe('Certification');
      expect(formatDocType('PHOTO')).toBe('Photo');
      expect(formatDocType('OTHER')).toBe('Other');
    });

    it('should fall back to title case for unknown doc types', () => {
      expect(formatDocType('DIPLOMA')).toBe('Diploma');
    });
  });

  describe('formatNotificationType', () => {
    it('should return mapped label for all notification types', () => {
      expect(formatNotificationType('CONSULTATION_REQUEST')).toBe('Consultation Request');
      expect(formatNotificationType('DOCTOR_DECISION')).toBe('Doctor Decision');
      expect(formatNotificationType('PAYMENT_CONFIRMED')).toBe('Payment Confirmed');
      expect(formatNotificationType('APPOINTMENT_REMINDER')).toBe('Appointment Reminder');
      expect(formatNotificationType('APPOINTMENT_CANCELLED')).toBe('Appointment Cancelled');
      expect(formatNotificationType('NEW_CHAT_MESSAGE')).toBe('New Message');
      expect(formatNotificationType('NEW_REVIEW')).toBe('New Review');
      expect(formatNotificationType('DOCTOR_VERIFIED')).toBe('Doctor Verified');
      expect(formatNotificationType('SOAP_READY')).toBe('SOAP Ready');
      expect(formatNotificationType('SYSTEM')).toBe('System');
    });

    it('should fall back to title case for unknown types', () => {
      expect(formatNotificationType('ACCOUNT_SUSPENDED')).toBe('Account Suspended');
    });
  });

  describe('formatEnum (toTitleCase)', () => {
    it('should convert UPPER_SNAKE_CASE to Title Case', () => {
      expect(formatEnum('HELLO_WORLD')).toBe('Hello World');
    });

    it('should handle single word', () => {
      expect(formatEnum('ACTIVE')).toBe('Active');
    });

    it('should handle multiple underscores', () => {
      expect(formatEnum('THIS_IS_A_LONG_ENUM')).toBe('This Is A Long Enum');
    });

    it('should handle already lowercase input', () => {
      expect(formatEnum('hello')).toBe('Hello');
    });

    it('should handle mixed case input', () => {
      expect(formatEnum('hElLo_WoRlD')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(formatEnum('')).toBe('');
    });
  });
});
