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
    <div className="flex justify-center items-center min-h-screen bg-gray-100 font-['Montserrat',sans-serif]">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img 
            src="https://kcihsgnpmxzgdgwdijgx.supabase.co/storage/v1/object/public/graph-images/ld-logo.png" 
            alt="LeanData Logo" 
            className="h-12 mx-auto bg-[#2db670] p-2 rounded-lg" 
          />
          <h1 className="text-2xl font-bold mt-4 text-[#58595b]">Graph Review Login</h1>
        </div>
        
        <AuthForm mode="login" />
        
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-3 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <GoogleLoginButton className="mb-4" />
        </div>
        
        <p className="mt-4 text-center text-[#58595b]">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#2db670] hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;