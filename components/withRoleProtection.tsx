// components/withRoleProtection.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { Role } from '../types/supabase';
import { LoadingState } from './LoadingState';

/**
 * Higher-Order Component for role-based access control.
 * Wraps a component to restrict access based on user roles.
 * 
 * @template P - The props type of the wrapped component
 * @param WrappedComponent - The component to be protected
 * @param requiredRoles - Array of roles that can access the component. Defaults to ['Admin']
 * @returns A new component that checks user roles before rendering
 * 
 * @example
 * // Admin-only page
 * export default withRoleProtection(AdminDashboard);
 * 
 * @example
 * // Multiple roles allowed
 * export default withRoleProtection(ComponentName, ['Admin', 'Editor']);
 * 
 * @example
 * // Member access
 * export default withRoleProtection(ComponentName, ['Member', 'Admin']);
 */
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: Role[] = ['Admin'] // Default to Admin-only access
) {
  /**
   * Protected component that handles role-based access control
   * @param props - Props to be passed to the wrapped component
   * @returns The wrapped component if access is granted, null otherwise
   */
  return function WithRoleProtection(props: P) {
    const { user, userRole, loading, isAdmin } = useAuth();
    const router = useRouter();

    // Check user role and redirect if necessary
    useEffect(() => {
      if (loading) return;

      // Redirect to login if no user is present
      if (!user) {
        router.replace('/login');
        return;
      }

      if (!userRole) return;

      const hasRequiredRole = requiredRoles.includes(userRole);
      const isUserAdmin = isAdmin();

      // Redirect to dashboard if user doesn't have required role
      if (!hasRequiredRole && !isUserAdmin) {
        router.replace('/dashboard');
      }
    }, [user, userRole, loading, router, isAdmin, requiredRoles]);

    // Show loading state while checking access
    if (loading || !user || !userRole) {
      return <LoadingState message="Checking access..." />;
    }

    const hasRequiredRole = requiredRoles.includes(userRole);
    const isUserAdmin = isAdmin();

    // Don't render if user doesn't have required role
    if (!hasRequiredRole && !isUserAdmin) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Usage examples:
// For admin-only pages: export default withRoleProtection(AdminDashboard);
// For multiple roles: export default withRoleProtection(ComponentName, ['Admin', 'Editor']);
// For member access: export default withRoleProtection(ComponentName, ['Member', 'Admin']);