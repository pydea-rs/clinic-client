import { TestClient, createTestClient } from './api-client.js';
import {
  createAuthApi,
  createUserApi,
  createDoctorApi,
  createPatientApi,
  createAdminApi,
  createNurseApi,
} from './frontend-api.js';
import { createTestPdf } from './test-files.js';

export interface TestUser {
  client: TestClient;
  user: any;
  authApi: ReturnType<typeof createAuthApi>;
  userApi: ReturnType<typeof createUserApi>;
}

export interface TestDoctor extends TestUser {
  doctorApi: ReturnType<typeof createDoctorApi>;
  doctorProfile: any;
}

export interface TestPatient extends TestUser {
  patientApi: ReturnType<typeof createPatientApi>;
  patientProfile: any;
}

export interface TestAdmin extends TestUser {
  adminApi: ReturnType<typeof createAdminApi>;
}

let userCounter = 0;

function nextEmail(prefix: string): string {
  userCounter++;
  return `${prefix}-${userCounter}-${Date.now()}@test.local`;
}

export async function seedSuperAdmin(): Promise<TestAdmin> {
  const tc = createTestClient();
  const authApi = createAuthApi(tc.axios);
  const userApi = createUserApi(tc.axios);
  const adminApi = createAdminApi(tc.axios);

  const email = process.env.SUPERUSER_EMAIL || 'admin@ai-clinic.com';
  const password = process.env.SUPERUSER_PASSWORD || 'SuperAdmin123!';

  await authApi.login(email, password);
  const user = await authApi.me();

  return { client: tc, user, authApi, userApi, adminApi };
}

export async function registerAndLogin(
  role: 'PATIENT' | 'DOCTOR',
  overrides?: { firstname?: string; lastname?: string; email?: string; password?: string },
): Promise<TestUser> {
  const tc = createTestClient();
  const authApi = createAuthApi(tc.axios);
  const userApi = createUserApi(tc.axios);

  const email = overrides?.email || nextEmail(role.toLowerCase());
  const password = overrides?.password || 'TestPass123!';

  await authApi.register({
    firstname: overrides?.firstname || `Test${role[0]}`,
    lastname: overrides?.lastname || `User${userCounter}`,
    email,
    password,
    role,
  });

  await authApi.login(email, password);
  const user = await authApi.me();

  return { client: tc, user, authApi, userApi };
}

export async function setupDoctor(
  admin: TestAdmin,
  overrides?: { firstname?: string; lastname?: string; email?: string },
): Promise<TestDoctor> {
  const testUser = await registerAndLogin('DOCTOR', overrides);
  const doctorApi = createDoctorApi(testUser.client.axios);

  // Create doctor profile
  const doctorProfile = await doctorApi.createProfile({
    specialty: 'GENERAL_PRACTICE',
    visitMethods: ['CHAT', 'VIDEO_CALL'],
    bio: 'Integration test doctor',
    location: 'Test City',
  });

  // Upload a document for verification
  const pdfBuffer = createTestPdf();
  await doctorApi.uploadDocument(pdfBuffer, 'license.pdf', 'application/pdf', 'LICENSE');

  // Admin verifies the doctor
  await admin.adminApi.verifications.verify(doctorProfile.id, true);

  // Refresh user data
  const user = await testUser.authApi.me();

  return {
    ...testUser,
    user,
    doctorApi,
    doctorProfile: { ...doctorProfile, verified: true },
  };
}

export async function setupPatient(
  overrides?: { firstname?: string; lastname?: string; email?: string },
): Promise<TestPatient> {
  const testUser = await registerAndLogin('PATIENT', overrides);
  const patientApi = createPatientApi(testUser.client.axios);

  const patientProfile = await patientApi.createProfile({
    location: 'Test City',
    bio: 'Integration test patient',
    medicalHistory: ['None significant'],
    allergies: ['None'],
    medications: [],
  });

  return {
    ...testUser,
    patientApi,
    patientProfile,
  };
}

export async function setupNurse(
  admin: TestAdmin,
  doctor: TestDoctor,
): Promise<TestUser & { nurseApi: ReturnType<typeof createNurseApi> }> {
  const testUser = await registerAndLogin('PATIENT');
  const nurseApi = createNurseApi(testUser.client.axios);

  // Admin changes role to NURSE
  await admin.adminApi.users.update(testUser.user.id, { role: 'NURSE' });

  // Doctor assigns nurse
  const doctorNurseApi = createNurseApi(doctor.client.axios);
  await doctorNurseApi.assign(testUser.user.id, [
    'VIEW_PATIENTS',
    'VIEW_APPOINTMENTS',
    'VIEW_SOAPS',
    'MANAGE_SCHEDULE',
    'CHAT_WITH_PATIENTS',
    'VIEW_CONSULTATION_NOTES',
  ]);

  // Re-login to get updated role
  const email = testUser.user.email;
  await testUser.authApi.login(email, 'TestPass123!');
  const user = await testUser.authApi.me();

  return { ...testUser, user, nurseApi };
}

export function resetCounter(): void {
  userCounter = 0;
}
