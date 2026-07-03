import { toast } from 'sonner';
import type { ToasterProps } from 'sonner';

/**
 * Hook exposing convenient toast methods.
 * Wraps Sonner's toast for a uniform API across the app.
 */
export const useToastNotifications = () => {
  const success = (message: string, options?: ToasterProps) => toast.success(message, options);
  const error = (message: string, options?: ToasterProps) => toast.error(message, options);
  const warning = (message: string, options?: ToasterProps) => toast.warning(message, options);
  const info = (message: string, options?: ToasterProps) => toast(message, options);

  return { success, error, warning, info };
};
