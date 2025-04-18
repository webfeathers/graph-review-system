// pages/login.tsx (simplified)
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';

const Login: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { redirectedFrom } = router.query;

  useEffect(() => {
    // Only run this effect when loading is complete
    if (loading) return;
    
    // If user is authenticated, redirect to the appropriate page
    if (user) {
      const target = redirectedFrom ? String(redirectedFrom) : '/dashboard';
      router.replace(target);
    }
  }, [user, loading, redirectedFrom, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 ml-3">Loading...</p>
      </div>
    );
  }

  // If user is authenticated but redirect hasn't happened yet, show loading
  if (user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 ml-3">Redirecting...</p>
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