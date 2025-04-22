// components/AuthForm.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import GoogleLoginButton from './GoogleLoginButton';
import { ErrorDisplay } from './ErrorDisplay';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const [error, setError] = useState('');
  const { signInWithGoogle } = useAuth();
  const router = useRouter();

  // This component now only handles Google authentication
  // We're keeping the component for compatibility, but it just renders the Google button
  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Log In' : 'Create Account'}
      </h2>
      
      {error && <ErrorDisplay error={error} onDismiss={() => setError('')} />}
      
      <p className="text-center text-gray-600 mb-6">
        {mode === 'login' 
          ? 'Sign in with your Google account to access the Graph Review tool'
          : 'Create an account using your Google account to access the Graph Review tool'
        }
      </p>
      
      <GoogleLoginButton className="w-full" />
    </div>
  );
};

export default AuthForm;