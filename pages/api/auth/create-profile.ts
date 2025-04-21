// pages/api/auth/create-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
};

/**
 * API endpoint to create user profiles using the service role key
 * This bypasses RLS and can be used when client-side profile creation fails
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  // Extract user data from request body
  const { id, name, email } = req.body;

  // Validate required fields
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'User ID is required' 
    });
  }

  try {
    // First check if profile already exists to avoid duplicates
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', id)
      .single();
      
    if (!checkError && existingProfile) {
      return res.status(200).json({
        success: true,
        message: 'Profile already exists',
        data: existingProfile
      });
    }
    
    // Create the profile using the admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id,
        name: name || 'User',
        email: email || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create profile',
        error: error.message
      });
    }

    // Return success with the created profile data
    return res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data
    });
  } catch (error: any) {
    console.error('Unexpected error in create-profile API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}