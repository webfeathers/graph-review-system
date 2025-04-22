// pages/login.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';
import GoogleLoginButton from '../components/GoogleLoginButton';

const Login: NextPage = () => {
  const { loading } = useAuth();

  useEffect(() => {
    // Check if this was a clean logout
    const wasCleanLogout = localStorage.getItem('clean_logout') === 'true';
    
    if (wasCleanLogout) {
      // Clear the flag
      localStorage.removeItem('clean_logout');
      console.log('Clean logout detected - auth state is already clear');
    }
    
    // No automatic signOut here to avoid redirect loops
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
        
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <GoogleLoginButton className="mb-4" />
        </div>
        
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