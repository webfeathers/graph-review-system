// lib/apiHelpers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';

/**
 * Type for the handler function that will be wrapped with authentication
 */
export type AuthenticatedHandler = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string
) => Promise<void>;

/**
 * Higher-order function to wrap API handlers with Supabase authentication
 * 
 * @param handler The API handler function to wrap with authentication
 * @returns A wrapped handler function that includes authentication
 */
export function withAuth(handler: AuthenticatedHandler) {
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
      
      // Call the handler with the authenticated user ID
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