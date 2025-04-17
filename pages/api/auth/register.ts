// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Use Supabase Auth to sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // Create a profile for the user
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name,
        email
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }
  }

  return res.status(201).json({
    message: 'User created successfully',
    user: {
      id: data.user?.id,
      name,
      email,
    },
    session: data.session
  });
}