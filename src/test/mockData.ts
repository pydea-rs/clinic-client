import { Chat, ChatParticipant, User } from '../lib/types/api';

export const mockPatientUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'patient@test.com',
  firstname: 'John',
  lastname: 'Patient',
  role: 'PATIENT',
  isActive: true,
  isAdmin: false,
  isSuperAdmin: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockDoctorUser: User = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  email: 'doctor@test.com',
  firstname: 'Dr. Sarah',
  lastname: 'Doctor',
  role: 'DOCTOR',
  isActive: true,
  isAdmin: false,
  isSuperAdmin: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockAdminUser: User = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  email: 'admin@test.com',
  firstname: 'Admin',
  lastname: 'User',
  role: 'PATIENT',
  isActive: true,
  isAdmin: true,
  isSuperAdmin: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockSuperAdminUser: User = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  email: 'superadmin@test.com',
  firstname: 'Super',
  lastname: 'Admin',
  role: 'PATIENT',
  isActive: true,
  isAdmin: true,
  isSuperAdmin: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const mockApiResponse = <T,>(contents: T) => ({
  status: 200,
  message: 'Success',
  contents,
});

export const mockApiError = (status: number, message: string) => ({
  status,
  message,
  contents: null,
  timestamp: new Date().toISOString(),
  path: '/test',
});

const randomName = () => `${'BCDFGHJKLMNPRSTVZ'[Math.floor(Math.random() * 17)]}${Math.random().toString(36).slice(2, 8)}`;

/** A chat participant as the server sends it: the user's public fields, flattened. */
export const buildChatParticipant = (overrides: Partial<ChatParticipant> = {}): ChatParticipant => ({
  id: crypto.randomUUID(),
  firstname: randomName(),
  lastname: randomName(),
  role: (['DOCTOR', 'NURSE', 'PATIENT'] as const)[Math.floor(Math.random() * 3)],
  joinedAt: new Date(Date.now() - Math.floor(Math.random() * 1e9)).toISOString(),
  lastSeenAt: null,
  isOnline: false,
  ...overrides,
});

export const buildChat = (participants: ChatParticipant[], overrides: Partial<Chat> = {}): Chat => ({
  id: crypto.randomUUID(),
  createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  updatedAt: new Date().toISOString(),
  participants,
  unreadCount: 0,
  ...overrides,
});
