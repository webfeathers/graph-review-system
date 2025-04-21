// pages/login.tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../components/AuthProvider';

// In your Login.tsx component
useEffect(() => {
  // Clear any lingering auth state on login page load
  const clearState = async () => {
    if (typeof window !== 'undefined') {
      // Force clear any potentially stuck auth state
      await supabase.auth.signOut({ scope: 'global' });
      console.log('Auth state cleared on login page load');
    }
  };
  
  clearState();
  // Only run once on component mount
}, []);

const Login: NextPage = () => {
  const { loading } = useAuth();

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