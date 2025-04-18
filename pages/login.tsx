// pages/login.tsx (extremely simplified)
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';

const Login: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Very simple redirect - only triggers once when component mounts and auth is loaded
  useEffect(() => {
    // Only check after auth is loaded
    if (!loading && user) {
      // Redirect to dashboard if already logged in
      router.push('/dashboard');
    }
  }, [loading]); // Only run on initial load and when loading changes

  // Show loading state
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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