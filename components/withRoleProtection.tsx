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

      // If not authenticated, redirect to login
      if (!user) {
        router.push('/login');
        return;
      }

      // If user is authenticated but doesn't have required role
      if (userRole && !requiredRoles.includes(userRole)) {
        // Special case for Admin pages
        if (requiredRoles.includes('Admin') && !isAdmin()) {
          console.error('Access denied: Admin privileges required');
          router.push('/dashboard');
          return;
        }
        
        // For other role requirements
        console.error(`Access denied: One of ${requiredRoles.join(', ')} roles required`);
        router.push('/dashboard');
      }
    }, [user, userRole, loading, router]);

    // Show loading state while checking authentication and roles
    if (loading || !user || (userRole && !requiredRoles.includes(userRole))) {
      return <LoadingState message="Checking access..." />;
    }

    // If all checks pass, render the protected component
    return <WrappedComponent {...props} />;
  };
}

// Usage examples:
// For admin-only pages: export default withRoleProtection(AdminDashboard);
// For multiple roles: export default withRoleProtection(ComponentName, ['Admin', 'Editor']);
// For member access: export default withRoleProtection(ComponentName, ['Member', 'Admin']);