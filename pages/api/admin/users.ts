// pages/api/admin/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { Role } from '../../../types/supabase';
import { withAdminAuth } from '../../../lib/apiHelpers';

type ResponseData = {
  success: boolean;
  message?: string;
  users?: any[];
  error?: any;
};

// Handler function to process admin user management requests
async function userHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  adminId: string
) {
  try {
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
        role: profile.role as Role || 'Member' // Ensure role has a fallback
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
      
      console.log('Attempting to update user role:', {
        userId,
        role,
        adminId // The ID of the admin making the change
      });
      
      // Check if user exists
      const { data: userExists, error: userCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (userCheckError || !userExists) {
        console.error('User check error:', userCheckError);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Update the user's role - using a simplified approach
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating user role:', updateError);
          return res.status(500).json({ 
            success: false, 
            message: `Error updating user role: ${updateError.message}`,
            error: updateError
          });
        }
        
        // Get the updated user
        const { data: updatedUser, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        if (fetchError) {
          console.error('Error fetching updated user:', fetchError);
          return res.status(200).json({
            success: true,
            message: `User role updated to ${role}, but couldn't fetch updated data`,
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
            role: updatedUser.role || 'Member' // Ensure role has a fallback
          }]
        });
      } catch (error: any) {
        console.error('Unexpected error updating role:', error);
        return res.status(500).json({ 
          success: false, 
          message: `Unexpected error: ${error.message}`,
          error: error
        });
      }
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

// Export the handler with admin authentication
export default withAdminAuth(userHandler);