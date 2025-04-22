// pages/register.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';
import GoogleLoginButton from '../components/GoogleLoginButton';

const Register: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      router.push('/dashboard');
    }
    
    // Check if a clean logout occurred (just in case user lands here after logout)
    const wasCleanLogout = localStorage.getItem('clean_logout') === 'true';
    
    if (wasCleanLogout) {
      // Clear the flag
      localStorage.removeItem('clean_logout');
      console.log('Clean logout detected - auth state is already clear');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md">
        <AuthForm mode="register" />
        
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <GoogleLoginButton className="mb-4" />
        </div>
        
        <p className="mt-4 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-500 hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;