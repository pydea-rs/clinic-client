import { ApiError } from '../types/api';

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (isObject(error) && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  const apiError = error as Partial<ApiError>;
  if (typeof apiError?.message === 'string' && apiError.message.trim().length > 0) {
    return apiError.message;
  }

  return fallback;
};
