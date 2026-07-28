import type { AxiosInstance } from 'axios';
import type { DoctorProfile, DoctorRating, DoctorDocument, DoctorStats, DoctorSpecialty, VisitMethod, VisitType } from '../lib/types/api';

export type { DoctorProfile, DoctorRating, DoctorDocument };

export interface CreateDoctorProfilePayload {
  startedAt: string;
  specialty: DoctorSpecialty;
  secondarySpecialties?: DoctorSpecialty[];
  clinicLocation?: string;
  bio?: string;
  university?: string;
  visitMethods?: VisitMethod[];
  visitTypes?: VisitType[];
  phoneNumber?: string;
  languages?: string[];
  licenseNumber?: string;
}

export type UpdateDoctorProfilePayload = Partial<Omit<CreateDoctorProfilePayload, 'startedAt'>>;

export function createDoctorApi(client: AxiosInstance) {
  return {
    getDoctors: async (params?: {
      specialty?: string;
      visitMethod?: string;
      location?: string;
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{ doctors: DoctorProfile[]; total: number }> => {
      const { page, limit, ...rest } = params || {};
      const skip = page ? (page - 1) * (limit || 20) : undefined;
      const response = await client.get('/doctor', { params: { ...rest, skip, take: limit } });
      const result = response.data;
      return { doctors: result?.data || (Array.isArray(result) ? result : []), total: result?.total || 0 };
    },

    getDoctorById: async (doctorId: number | string): Promise<DoctorProfile> => {
      const response = await client.get(`/doctor/${doctorId}`);
      return response.data;
    },

    getDoctorRating: async (doctorId: number | string): Promise<DoctorRating> => {
      const response = await client.get(`/doctor/${doctorId}/rating`);
      return response.data;
    },

    createProfile: async (payload: CreateDoctorProfilePayload): Promise<DoctorProfile> => {
      const response = await client.post('/doctor', payload);
      return response.data;
    },

    updateProfile: async (payload: UpdateDoctorProfilePayload): Promise<DoctorProfile> => {
      const response = await client.patch('/doctor/profile', payload);
      return response.data;
    },

    uploadDocument: async (
      file: File | Blob,
      documentTypeOrFilename: string,
      contentType?: string,
      documentType?: string,
    ): Promise<DoctorDocument> => {
      const formData = new FormData();
      const docType = documentType ?? documentTypeOrFilename;
      if (contentType && documentType) {
        const blob = file instanceof Blob ? file : new Blob([file as unknown as BlobPart], { type: contentType });
        formData.append('file', blob, documentTypeOrFilename);
      } else {
        formData.append('file', file as File);
      }
      formData.append('type', docType);
      const response = await client.post('/doctor/documents', formData, {
        headers: { 'Content-Type': undefined },
      });
      return response.data;
    },

    getDocuments: async (): Promise<DoctorDocument[]> => {
      const response = await client.get('/doctor/documents');
      return response.data;
    },

    getStats: async (): Promise<DoctorStats> => {
      const response = await client.get('/doctor/stats');
      return response.data;
    },

    getMyProfile: async (): Promise<DoctorProfile> => {
      const response = await client.get('/doctor/me');
      return response.data;
    },
  };
}

export type DoctorApi = ReturnType<typeof createDoctorApi>;
