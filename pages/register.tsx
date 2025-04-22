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
    <div className="flex justify-center items-center min-h-screen bg-gray-100 font-['Montserrat',sans-serif]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img 
            src="https://leandata.com/wp-content/uploads/2019/12/logo-white.png" 
            alt="LeanData Logo" 
            className="h-12 mx-auto bg-[#2db670] p-2 rounded-lg" 
          />
          <h1 className="text-2xl font-bold mt-4 text-[#58595b]">Create Account</h1>
        </div>
        
        <AuthForm mode="register" />
        
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <GoogleLoginButton className="mb-4" />
        </div>
        
        <p className="mt-4 text-center text-[#58595b]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#2db670] hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;