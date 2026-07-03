import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

/**
 * Hook to check if the current user has a specific permission.
 * Permissions are assumed to be an array of strings stored in the auth slice of the Redux store.
 */
export const usePermissions = () => {
  const permissions = useSelector((state: RootState) => state.auth.permissions) ?? [];

  const hasPermission = useCallback(
    (action: string, resource: string) => {
      // If no permissions are defined (e.g., owner), allow all actions
      if (permissions.length === 0) return true;
      const required = `${action}:${resource}`;
      return permissions.includes(required);
    },
    [permissions]
  );

  return { hasPermission };
};
