// pages/api/auth/ensure-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

type ResponseData = {
  success: boolean;
  message: string;
  profile?: any;
};

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

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
      
    if (!profileError && existingProfile) {
      // Profile already exists
      return res.status(200).json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      });
    }
    
    // If profile doesn't exist or there was an error, create a new one
    // For Google login, extract name from user_metadata
    const userData = user.user_metadata || {};
    let name = userData.name || userData.full_name;
    
    // If no name found in metadata, try to create one from email
    if (!name && user.email) {
      name = user.email.split('@')[0];
    }
    
    // Fallback name if nothing else works
    if (!name) {
      name = 'User';
    }
    
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: name,
        email: user.email || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating profile:', createError);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to create profile: ${createError.message}` 
      });
    }
    
    return res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    });
    
  } catch (error: any) {
    console.error('Unexpected error in ensure-profile API:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}