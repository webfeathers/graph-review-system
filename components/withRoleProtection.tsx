// components/withRoleProtection.tsx
import { useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { Role } from '../types/supabase';
import { LoadingState } from './LoadingState';

// Cache for role check results
const roleCheckCache = new Map<string, boolean>();

// Higher-Order Component for role-based access control
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRoles: Role[] = ['Admin'] // Default to Admin-only access
) {
  return function WithRoleProtection(props: P) {
    const { user, userRole, loading, isAdmin } = useAuth();
    const router = useRouter();

    // Create a cache key based on user, role, and required roles
    const cacheKey = useMemo(() => {
      if (!user || !userRole) return '';
      return `${user.id}:${userRole}:${requiredRoles.join(',')}`;
    }, [user, userRole, requiredRoles]);

    // Memoize the check access function
    const checkAccess = useCallback(() => {
      // Skip if still loading
      if (loading) return;

      // If not authenticated, redirect to login
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      // Check cache first
      if (cacheKey && roleCheckCache.has(cacheKey)) {
        const hasAccess = roleCheckCache.get(cacheKey);
        if (!hasAccess) {
          console.log('Access denied (cached)');
          router.push('/dashboard');
        }
        return;
      }

      // If user is authenticated but doesn't have required role
      if (userRole && !requiredRoles.includes(userRole)) {
        // Special case for Admin pages
        if (requiredRoles.includes('Admin') && !isAdmin()) {
          console.error('Access denied: Admin privileges required');
          if (cacheKey) roleCheckCache.set(cacheKey, false);
          router.push('/dashboard');
          return;
        }
        
        // For other role requirements
        console.error(`Access denied: One of ${requiredRoles.join(', ')} roles required`);
        if (cacheKey) roleCheckCache.set(cacheKey, false);
        router.push('/dashboard');
        return;
      }

      // Cache successful access check
      if (cacheKey) roleCheckCache.set(cacheKey, true);
    }, [user, userRole, loading, router, isAdmin, requiredRoles, cacheKey]);

    // Run access check when dependencies change
    useEffect(() => {
      checkAccess();
    }, [checkAccess]);

    // Show loading state while checking authentication and roles
    if (loading) {
      return <LoadingState message="Checking access..." />;
    }

    // If not authenticated, don't render anything
    if (!user) {
      return null;
    }

    // If user doesn't have required role, don't render anything
    if (!userRole || !requiredRoles.includes(userRole)) {
      return null;
    }

    // User is authenticated and has required role, render the component
    return <WrappedComponent {...props} />;
  };
}

// Usage examples:
// For admin-only pages: export default withRoleProtection(AdminDashboard);
// For multiple roles: export default withRoleProtection(ComponentName, ['Admin', 'Editor']);
// For member access: export default withRoleProtection(ComponentName, ['Member', 'Admin']);