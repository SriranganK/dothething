import React from 'react';
import { useToastNotifications } from '@/hooks/useToastNotifications';

interface PermissionGuardProps {
  /** Permission check function returning boolean */
  check: () => boolean;
  /** Message shown when permission is denied */
  warningMessage?: string;
  /** Children rendered when permission passes */
  children: React.ReactNode;
}

/**
 * Renders children only if the permission check passes.
 * Otherwise shows a warning toast.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  check,
  warningMessage = 'You do not have permission to perform this action.',
  children,
}) => {
  const { warning } = useToastNotifications();

  if (check()) {
    return <>{children}</>;
  }

  // Show warning toast once per render
  warning(warningMessage);
  return null;
};
