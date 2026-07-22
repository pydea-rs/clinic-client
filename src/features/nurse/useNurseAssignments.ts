import { useQuery } from '@tanstack/react-query';
import { nurseApi } from '../../api/nurse.api';
import { NurseAssignment, NursePermission } from '../../lib/types/api';
import { useAuthStore } from '../../lib/stores/auth.store';

export function useNurseAssignments() {
  const user = useAuthStore((s) => s.user);
  const isNurse = user?.role === 'NURSE';

  const { data: assignments = [], isLoading, error } = useQuery<NurseAssignment[]>({
    queryKey: ['nurse-assignments'],
    queryFn: () => nurseApi.getAssignments(),
    staleTime: 60_000,
    enabled: isNurse,
  });

  const hasPermission = (permission: NursePermission): boolean =>
    assignments.some((a) => a.permissions.includes(permission));

  const getDoctorIds = (permission: NursePermission): number[] =>
    assignments
      .filter((a) => a.permissions.includes(permission))
      .map((a) => a.doctorId);

  return { assignments, isLoading, error, hasPermission, getDoctorIds };
}
