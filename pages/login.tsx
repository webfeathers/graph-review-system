// pages/login.tsx (fixed)
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
  const { redirectedFrom } = router.query;

  useEffect(() => {
    if (loading) return;
    
    // Prevent redirect loops by checking if we're not already redirecting
    if (user && !isRedirecting) {
      console.log('Login page: Redirecting to dashboard, user is authenticated');
      setIsRedirecting(true);
      
      // If there was a redirectedFrom query param, go there, otherwise dashboard
      const redirectPath = 
        typeof redirectedFrom === 'string' && redirectedFrom
          ? redirectedFrom
          : '/dashboard';
          
      router.push(redirectPath);
    }
  }, [user, loading, redirectedFrom, router, isRedirecting]);

  // Show loading state if detecting auth or during redirect
  if (loading || isRedirecting) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, we'll redirect in the useEffect
  // This just prevents flash of the login form
  if (user) {
    return null;
  }

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