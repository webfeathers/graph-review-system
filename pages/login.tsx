// pages/login.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useEffect } from 'react';
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
            className="h-12 mx-auto bg-[#FFFFFF] p-2 rounded-lg" 
          />
          <h1 className="text-2xl font-bold mt-4 text-[#58595b]">Graph Review Login</h1>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-center text-gray-600 mb-6">
            Sign in with your Google account to access the Graph Review tool
          </p>
          
          <GoogleLoginButton className="w-full" />
        </div>
        
        <p className="mt-4 text-center text-[#58595b]">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
};

export default Login;