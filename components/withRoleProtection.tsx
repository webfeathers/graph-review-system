// components/withRoleProtection.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { Role } from '../types/supabase';
import { LoadingState } from './LoadingState';

// Higher-Order Component for role-based access control
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: Role[] = ['Admin'] // Default to Admin-only access
) {
  return function WithRoleProtection(props: P) {
    const { user, userRole, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (loading) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      if (!userRole) return;

      const hasRequiredRole = requiredRoles.includes(userRole);
      const isUserAdmin = isAdmin();

      if (!hasRequiredRole && !isUserAdmin) {
        router.replace('/dashboard');
      }
    }, [user, userRole, loading, router, isAdmin, requiredRoles]);

    if (loading || !user || !userRole) {
      return <LoadingState message="Checking access..." />;
    }

    const hasRequiredRole = requiredRoles.includes(userRole);
    const isUserAdmin = isAdmin();

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