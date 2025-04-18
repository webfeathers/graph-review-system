
// pages/api/auth/register.ts (improved)
import type { NextApiRequest, NextApiResponse } from 'next';
import { createUserWithProfile } from '../../../lib/serverAuth';
import { validateEmail, validatePassword } from '../../../lib/validation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  const { name, email, password } = req.body;

  // Validate inputs
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields' 
    });
  }

  // Validate email format
  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ 
      success: false, 
      message: emailError 
    });
  }

  // Validate password
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ 
      success: false, 
      message: passwordError 
    });
  }

  try {
    // Use the transaction-like function to create user and profile
    const { success, user, session, error } = await createUserWithProfile(
      email,
      password,
      name
    );

    if (!success || error) {
      return res.status(400).json({ 
        success: false, 
        message: error?.message || 'Failed to create user account' 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user?.id,
        name,
        email,
      },
      session
    });
  } catch (error: any) {
    console.error('Unexpected error during registration:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during registration' 
    });
  }
}

// components/AuthForm.tsx (improved error handling)
/*
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
        if (error.message.includes('email already registered')) {
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
*/