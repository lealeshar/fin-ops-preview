import { useAuth } from '../contexts/auth.context';
import { UserRole } from '../types/enums';

export interface Permissions {
  canCreate:         boolean; // admin, ops
  canEdit:           boolean; // admin, ops
  canArchive:        boolean; // admin only
  canApprovePay:     boolean; // admin, finance
  canManageSettings: boolean; // admin only
}

export function usePermission(): Permissions {
  const { role } = useAuth();

  const isAdmin   = role === UserRole.Admin;
  const isOps     = role === UserRole.Ops;
  const isFinance = role === UserRole.Finance;

  return {
    canCreate:         isAdmin || isOps,
    canEdit:           isAdmin || isOps,
    canArchive:        isAdmin,
    canApprovePay:     isAdmin || isFinance,
    canManageSettings: isAdmin,
  };
}
