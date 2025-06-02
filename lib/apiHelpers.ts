// lib/apiHelpers.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from './supabase';
import { Role } from '../types/supabase';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/**
 * Type for the handler function that will be wrapped with authentication
 */
export type AuthenticatedHandler = (
  req: NextApiRequest, 
  res: NextApiResponse, 
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) => Promise<void>;

/**
 * Cache for user roles to reduce database queries
 * Key: userId, Value: { role: Role, timestamp: number }
 */
const userRoleCache = new Map<string, { role: Role, timestamp: number }>();

// Role cache expiration time (5 minutes)
const ROLE_CACHE_TTL = 5 * 60 * 1000;

/**
 * Get user role with caching to reduce database queries
 * 
 * @param userId The user ID to get the role for
 * @param supabaseClient The Supabase client to use for the request
 * @returns The user's role or null if not found
 */
async function getUserRoleWithCache(userId: string, supabaseClient: SupabaseClient): Promise<Role | null> {
  // Check the cache first
  const cached = userRoleCache.get(userId);
  const now = Date.now();
  
  // Use cached value if it exists and hasn't expired
  if (cached && (now - cached.timestamp) < ROLE_CACHE_TTL) {
    return cached.role;
  }
  
  // If not in cache or expired, fetch from database
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      return null;
    }
    
    const role = data.role as Role;
    
    // Update the cache
    userRoleCache.set(userId, { role, timestamp: now });
    
    return role;
  } catch (error) {
    return null;
  }
}

/**
 * Get the authorization token from the request
 * Only checks the Authorization header since we don't have cookie parsing
 * 
 * @param req The Next.js API request
 * @returns The token or null if not found
 */
function getAuthToken(req: NextApiRequest): string | null {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return token;
  }
  return null;
}

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
    // Get the token from request
    const token = getAuthToken(req);
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    try {
      // Create a Supabase client scoped to this request using the user's token
      const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      
      // Verify the token with Supabase using the request-scoped client
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      
      if (error || !user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid or expired authentication token' 
        });
      }
      
      // Always get user's role
      const userRole = await getUserRoleWithCache(user.id, supabaseClient);
      
      if (!userRole) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to verify user role' 
        });
      }
      
      // If role check is required, verify the role
      if (requiredRoles && requiredRoles.length > 0) {
        // Check if the user's role is in the required roles array
        if (!requiredRoles.includes(userRole)) {
          return res.status(403).json({ 
            success: false, 
            message: 'You do not have permission to access this resource' 
          });
        }
      }
      
      // Call the handler with the authenticated user ID, SCOPED client, and their role
      return await handler(req, res, user.id, supabaseClient, userRole);
    } catch (error) {
      // Sanitize error details before sending to client
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication failed. Please try again.' 
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

/**
 * Nests a flat array of comments into a threaded structure.
 * Each comment with parentId is placed in the replies array of its parent.
 * Only top-level comments (parentId == null) are returned at the root level.
 */
export function nestComments<T extends { id: string; parentId?: string; replies?: T[] }>(comments: T[]): T[] {
  const commentMap: Record<string, T & { replies: T[] }> = {};
  const roots: (T & { replies: T[] })[] = [];

  // Initialize map and replies array
  comments.forEach(comment => {
    commentMap[comment.id] = { ...comment, replies: comment.replies || [] };
  });

  // Build the tree
  comments.forEach(comment => {
    if (comment.parentId) {
      const parent = commentMap[comment.parentId];
      if (parent) {
        parent.replies.push(commentMap[comment.id]);
      } else {
        // Orphaned reply, treat as root
        roots.push(commentMap[comment.id]);
      }
    } else {
      roots.push(commentMap[comment.id]);
    }
  });

  return roots;
}