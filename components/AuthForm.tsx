// components/AuthForm.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { Button } from './Button';
import { ErrorDisplay } from './ErrorDisplay';
import { validateEmail, validatePassword } from '../lib/validation';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        // On successful login, redirect to dashboard
        router.push('/dashboard');
      } else {
        // Register mode
        if (!name) {
          throw new Error('Name is required');
        }
        
        // Validate fields before submission
        const nameError = name.length < 2 ? 'Name must be at least 2 characters' : '';
        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);
        
        if (nameError || emailError || passwordError) {
          throw new Error(nameError || emailError || passwordError);
        }
        
        const { error, user } = await signUp(email, password, name);
        
        if (error) {
          // Handle specific error cases
          if (error.message?.includes('email already registered')) {
            throw new Error('This email is already registered. Please log in instead.');
          }
          throw error;
        }
        
        if (!user) {
          throw new Error('Account created but unable to sign in automatically. Please try logging in.');
        }
        
        // On successful registration, redirect to dashboard or show confirmation
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' ? 'Log In' : 'Create Account'}
      </h2>
      
      {error && <ErrorDisplay error={error} onDismiss={() => setError('')} />}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="name" className="block text-gray-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Your name"
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="your@email.com"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder={mode === 'register' ? 'Create a password (8+ characters)' : 'Your password'}
          />
        </div>
        
        <Button
          type="submit"
          variant="primary"
          isLoading={loading}
          fullWidth
        >
          {mode === 'login' ? 'Log In' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
};

export default AuthForm;