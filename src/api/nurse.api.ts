import type { AxiosInstance } from 'axios';
import type { NurseAssignment, NursePermission } from '../lib/types/api';

export interface NurseDashboardData {
  assignments: NurseAssignment[];
  stats: {
    upcomingAppointments: number;
    activeConsultations: number;
    assignedDoctors: number;
  };
}

export function createNurseApi(client: AxiosInstance) {
  return {
    getDashboard: async (): Promise<NurseDashboardData> => {
      const response = await client.get('/nurse/dashboard');
      return response.data;
    },

    assign: async (nurseId: string, permissions?: NursePermission[]): Promise<NurseAssignment> => {
      const response = await client.post('/nurse/assign', { nurseId, permissions });
      return response.data;
    },

    updatePermissions: async (assignmentId: number, permissions: NursePermission[]): Promise<NurseAssignment> => {
      const response = await client.patch(`/nurse/assignment/${assignmentId}/permissions`, { permissions });
      return response.data;
    },

    remove: async (assignmentId: number): Promise<NurseAssignment> => {
      const response = await client.delete(`/nurse/assignment/${assignmentId}`);
      return response.data;
    },

    getAssignments: async (): Promise<NurseAssignment[]> => {
      const response = await client.get('/nurse/assignments');
      return response.data;
    },

    getAssignment: async (assignmentId: number): Promise<NurseAssignment> => {
      const response = await client.get(`/nurse/assignment/${assignmentId}`);
      return response.data;
    },
  };
}

export type NurseApi = ReturnType<typeof createNurseApi>;
