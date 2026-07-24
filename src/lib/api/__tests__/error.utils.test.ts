import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../error.utils';

describe('getErrorMessage', () => {
  describe('string input', () => {
    it('should return the string directly', () => {
      expect(getErrorMessage('Something failed')).toBe('Something failed');
    });

    it('should return fallback for empty string', () => {
      expect(getErrorMessage('')).toBe('Something went wrong');
    });

    it('should return fallback for whitespace-only string', () => {
      expect(getErrorMessage('   ')).toBe('Something went wrong');
    });
  });

  describe('object with message property', () => {
    it('should extract message from Error object', () => {
      expect(getErrorMessage(new Error('Oops'))).toBe('Oops');
    });

    it('should extract message from plain object', () => {
      expect(getErrorMessage({ message: 'Bad request' })).toBe('Bad request');
    });

    it('should return fallback when message is empty string', () => {
      expect(getErrorMessage({ message: '' })).toBe('Something went wrong');
    });

    it('should return fallback when message is whitespace', () => {
      expect(getErrorMessage({ message: '  ' })).toBe('Something went wrong');
    });
  });

  describe('API error shape', () => {
    it('should extract message from API error envelope', () => {
      const apiError = {
        status: 400,
        message: 'Validation failed',
        contents: null,
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/test',
      };
      expect(getErrorMessage(apiError)).toBe('Validation failed');
    });
  });

  describe('fallback behavior', () => {
    it('should return default fallback for null', () => {
      expect(getErrorMessage(null)).toBe('Something went wrong');
    });

    it('should return default fallback for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('Something went wrong');
    });

    it('should return default fallback for number', () => {
      expect(getErrorMessage(42)).toBe('Something went wrong');
    });

    it('should return default fallback for boolean', () => {
      expect(getErrorMessage(true)).toBe('Something went wrong');
    });

    it('should return default fallback for object without message', () => {
      expect(getErrorMessage({ code: 500 })).toBe('Something went wrong');
    });

    it('should return custom fallback when provided', () => {
      expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback');
    });

    it('should return custom fallback for non-string message', () => {
      expect(getErrorMessage({ message: 123 }, 'Fallback')).toBe('Fallback');
    });
  });
});
