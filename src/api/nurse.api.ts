import { apiClient } from '../lib/api/client';
import { NurseAssignment, NursePermission } from '../lib/types/api';

export const nurseApi = {
  assign: async (nurseId: string, permissions?: NursePermission[]): Promise<NurseAssignment> => {
    const response = await apiClient.post('/nurse/assign', { nurseId, permissions });
    return response.data;
  },

  updatePermissions: async (assignmentId: number, permissions: NursePermission[]): Promise<NurseAssignment> => {
    const response = await apiClient.patch(`/nurse/assignment/${assignmentId}/permissions`, { permissions });
    return response.data;
  },

  remove: async (assignmentId: number): Promise<NurseAssignment> => {
    const response = await apiClient.delete(`/nurse/assignment/${assignmentId}`);
    return response.data;
  },

  getAssignments: async (): Promise<NurseAssignment[]> => {
    const response = await apiClient.get('/nurse/assignments');
    return response.data;
  },
};
