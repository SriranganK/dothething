import { useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Hook that provides convenient permission checks for common resources.
 * Returns a set of boolean flags and helper functions.
 */
export const useRBAC = () => {
  const { hasPermission } = usePermissions();

  const canCreateBoard = useCallback(() => hasPermission('create', 'board'), [hasPermission]);
  const canEditBoard = useCallback(() => hasPermission('edit', 'board'), [hasPermission]);
  const canDeleteBoard = useCallback(() => hasPermission('delete', 'board'), [hasPermission]);

  const canCreateCard = useCallback(() => hasPermission('create', 'card'), [hasPermission]);
  const canEditCard = useCallback(() => hasPermission('edit', 'card'), [hasPermission]);
  const canDeleteCard = useCallback(() => hasPermission('delete', 'card'), [hasPermission]);
  const canMoveCard = useCallback(() => hasPermission('move', 'card'), [hasPermission]);
  const canAssign = useCallback(() => hasPermission('assign', 'card'), [hasPermission]);
  const canArchive = useCallback(() => hasPermission('archive', 'card'), [hasPermission]);

  return {
    canCreateBoard,
    canEditBoard,
    canDeleteBoard,
    canCreateCard,
    canEditCard,
    canDeleteCard,
    canMoveCard,
    canAssign,
    canArchive,
  };
};
