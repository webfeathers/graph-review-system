// pages/login.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';

const Login: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle redirects in a more controlled way
  useEffect(() => {
    // Only proceed if auth loading is complete
    if (loading) return;
    
    // If user is authenticated and we're not already redirecting
    if (user && !isRedirecting) {
      setIsRedirecting(true);
      
      // Use setTimeout to ensure state updates before redirect
      setTimeout(() => {
        // Check if we have a redirectedFrom query param
        const redirectTarget = router.query.redirectedFrom 
          ? String(router.query.redirectedFrom)
          : '/dashboard';
          
        // Use window.location for a hard navigation instead of Next.js router
        // This helps avoid the "Abort fetching component" error
        window.location.href = redirectTarget;
      }, 100);
    }
  }, [user, loading, router.query, isRedirecting]);

  // Show loading state
  if (loading || isRedirecting) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 ml-3">{isRedirecting ? 'Redirecting...' : 'Loading...'}</p>
      </div>
    );
  }

  // Show login form for unauthenticated users
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <AuthForm mode="login" />
        <p className="mt-4 text-center">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;