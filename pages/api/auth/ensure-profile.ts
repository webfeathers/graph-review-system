// pages/api/auth/ensure-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { Role } from '../../../types/supabase';

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

    // Get user ID and other profile data
    const { userId: requestedUserId } = req.body;
    
    // If a specific user ID is requested, ensure it matches the authenticated user
    // or throw an error - this prevents users from modifying other users' profiles
    const userId = requestedUserId || user.id;
    
    if (requestedUserId && requestedUserId !== user.id) {
      // Check if the user is an admin (allowed to modify other profiles)
      const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (!adminCheck || adminCheck.role !== 'Admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden - Cannot modify other user profiles' 
        });
      }
    }

    // Extract profile data from request body or user object
    const userData = user.user_metadata || {};
    const { 
      name: bodyName, 
      email: bodyEmail, 
      role: bodyRole 
    } = req.body;
    
    let name = bodyName || userData.name || userData.full_name;
    
    // If no name found in metadata, try to create one from email
    if (!name && user.email) {
      name = user.email.split('@')[0];
    }
    
    // Fallback name if nothing else works
    if (!name) {
      name = 'User';
    }
    
    const email = bodyEmail || user.email || '';
    
    // Only allow setting role to Admin if the current user is an admin
    let role: Role = 'Member';
    if (bodyRole === 'Admin') {
      const { data: adminCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (adminCheck && adminCheck.role === 'Admin') {
        role = 'Admin';
      }
    }

    // Check if profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!profileError && existingProfile) {
      // Profile already exists - check if it needs updating
      const needsUpdate = (
        (!existingProfile.name && name) || 
        (!existingProfile.email && email) ||
        (bodyRole === 'Admin' && role === 'Admin' && existingProfile.role !== 'Admin')
      );
      
      if (needsUpdate) {
        // Update the existing profile with new data
        const updateData: any = {};
        
        if (!existingProfile.name && name) updateData.name = name;
        if (!existingProfile.email && email) updateData.email = email;
        if (bodyRole === 'Admin' && role === 'Admin' && existingProfile.role !== 'Admin') {
          updateData.role = 'Admin';
        }
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();
          
        if (updateError) {
          console.error('Error updating profile:', updateError);
          return res.status(500).json({ 
            success: false, 
            message: `Failed to update profile: ${updateError.message}` 
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully',
          profile: updatedProfile
        });
      }
      
      // Profile exists and is complete
      return res.status(200).json({
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      });
    }
    
    // Create a new profile
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name,
        email,
        created_at: new Date().toISOString(),
        role
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