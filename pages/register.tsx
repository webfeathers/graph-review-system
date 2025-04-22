// pages/register.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
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
            src="https://kcihsgnpmxzgdgwdijgx.supabase.co/storage/v1/object/public/graph-images/ld-logo.png" 
            alt="LeanData Logo" 
            className="h-12 mx-auto bg-[#FFFFFF] p-2 rounded-lg" 
          />
          <h1 className="text-2xl font-bold mt-4 text-[#58595b]">Create Account</h1>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600 mb-6">
            Create an account using your Google account to access the Graph Review tool
          </p>
          
          <GoogleLoginButton className="w-full" />
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