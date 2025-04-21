// pages/login.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useEffect } from 'react'; // Add this import
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase'; // Add this import

const Login: NextPage = () => {
  const { loading } = useAuth();

  // Add this useEffect hook
  useEffect(() => {
    // Clear any lingering auth state on login page load
    const clearState = async () => {
      try {
        // Force clear any potentially stuck auth state
        await supabase.auth.signOut({ scope: 'global' });
        console.log('Auth state cleared on login page load');
      } catch (error) {
        console.error('Error clearing auth state:', error);
      }
    };
    
    clearState();
    // Only run once on component mount
  }, []);

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