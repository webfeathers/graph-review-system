// lib/apiHelpers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';
import { Role } from '../types/supabase';

/**
 * Type for the handler function that will be wrapped with authentication
 */
export type AuthenticatedHandler = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string,
  userRole?: Role
) => Promise<void>;

/**
 * Higher-order function to wrap API handlers with Supabase authentication
 * 
 * @param handler The API handler function to wrap with authentication
 * @param requiredRoles Optional array of roles that are allowed to access this endpoint
 * @returns A wrapped handler function that includes authentication and authorization
 */
export function withAuth(
  handler: AuthenticatedHandler,
  requiredRoles?: Role[]
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - No valid authorization header provided' 
      });
    }
    
    // Extract the token
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
      
      // If role check is required, get user's role from profile
      if (requiredRoles && requiredRoles.length > 0) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (profileError || !profile) {
          console.error('Error fetching user profile:', profileError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to verify user role' 
          });
        }
        
        const userRole = profile.role as Role;
        
        // Check if the user's role is in the required roles array
        if (!requiredRoles.includes(userRole)) {
          return res.status(403).json({ 
            success: false, 
            message: 'Forbidden - Insufficient permissions' 
          });
        }
        
        // Call the handler with the authenticated user ID and their role
        return await handler(req, res, user.id, userRole);
      }
      
      // If no role check required, just call the handler with the user ID
      return await handler(req, res, user.id);
    } catch (error) {
      console.error('Error in authentication middleware:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal Server Error' 
      });
    }
  };
}

/**
 * Higher-order function to wrap API handlers with admin-only authentication
 * 
 * @param handler The API handler function to wrap with authentication
 * @returns A wrapped handler function that includes authentication and admin authorization
 */
export function withAdminAuth(handler: AuthenticatedHandler) {
  return withAuth(handler, ['Admin']);
}