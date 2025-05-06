// pages/api/auth/ensure-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Role } from '../../../types/supabase';

type ResponseData = {
  success: boolean;
  message: string;
  profile?: any;
};

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

// Create a Supabase client with the service role key for API routes
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'apikey': supabaseServiceKey
    }
  }
});

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

  // Get authenticated user
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - No valid authorization header provided' 
    });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Authentication error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Invalid token' 
      });
    }

    // Log user data for debugging
    console.log('Authenticated user:', {
      id: user.id,
      email: user.email,
      role: user.role
    });

    const { firstName, lastName, email, role } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      console.error('Missing required fields:', { firstName, lastName, email });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firstName, lastName, and email are required'
      });
    }

    // Validate role if provided
    if (role && !['Admin', 'Member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either "Admin" or "Member"'
      });
    }

    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Error checking existing profile'
      });
    }

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          name: `${firstName} ${lastName}`.trim(),
          email,
          role: role || existingProfile.role
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return res.status(500).json({
          success: false,
          message: 'Error updating profile'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      });
    } else {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: `${firstName} ${lastName}`.trim(),
          email,
          role: role || 'Member',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({
          success: false,
          message: 'Error creating profile'
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        profile: newProfile
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}