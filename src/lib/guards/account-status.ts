import type { User } from '../types/api';

export function isUserAccountBlocked(user: User | null): boolean {
  return Boolean(user?.isBanned || user?.isActive === false);
}
