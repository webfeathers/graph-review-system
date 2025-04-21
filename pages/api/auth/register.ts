// pages/api/auth/register.ts
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