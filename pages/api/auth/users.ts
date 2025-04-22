// pages/api/admin/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { Role } from '../../../types/supabase';

type ResponseData = {
  success: boolean;
  message?: string;
  users?: any[];
  error?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Get authentication token
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Invalid token' 
      });
    }
    
    // Check if the user is an admin
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (adminCheckError || !adminCheck || adminCheck.role !== 'Admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden - Admin access required' 
      });
    }
    
    // Handle GET request - List all users
    if (req.method === 'GET') {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching user profiles',
          error: profilesError.message
        });
      }
      
      // Format the response
      const formattedUsers = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        createdAt: profile.created_at,
        role: profile.role as Role
      }));
      
      return res.status(200).json({
        success: true,
        users: formattedUsers
      });
    }
    
    // Handle PATCH request - Update user role
    if (req.method === 'PATCH') {
      const { userId, role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and role are required' 
        });
      }
      
      // Validate role
      if (role !== 'Member' && role !== 'Admin') {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role. Must be "Member" or "Admin"' 
        });
      }
      
      // Check if user exists
      const { data: userExists, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (userCheckError || !userExists) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Update the user's role
      const { data: updatedUser, error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single();
        
      if (updateError) {
        console.error('Error updating user role:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating user role',
          error: updateError.message
        });
      }
      
      return res.status(200).json({
        success: true,
        message: `User role updated to ${role}`,
        users: [{
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          createdAt: updatedUser.created_at,
          role: updatedUser.role as Role
        }]
      });
    }
    
    // Handle unsupported methods
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
    
  } catch (error: any) {
    console.error('Unexpected error in users API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}