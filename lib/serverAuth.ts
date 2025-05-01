// lib/serverAuth.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './env';

// Create a Supabase client with admin privileges (only for server-side)
const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY || ''
);

/**
 * Creates a user and their profile in a transaction-like manner
 * 
 * @param email User email
 * @param password User password
 * @param name User name
 * @returns Object with success status, user data, session, and any error
 */
export async function createUserWithProfile(
  email: string,
  password: string,
  name: string
) {
  try {
    // First create the user in Auth
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return { success: false, error };
    }

    // If user creation was successful, create their profile
    if (data?.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          name,
          email,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        
        // Attempt to clean up the created user since profile creation failed
        try {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        } catch (cleanupError) {
          console.error('Failed to clean up user after profile creation error:', cleanupError);
        }
        
        return { 
          success: false, 
          error: new Error('Failed to create user profile')
        };
      }
    }

    return { 
      success: true, 
      user: data?.user || null, 
      session: data?.session || null,
      error: null
    };
  } catch (error) {
    console.error('Unexpected error in createUserWithProfile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

/**
 * Verifies a user's session token
 * 
 * @param token JWT token from client
 * @returns User data or null if invalid
 */
export async function verifyUserSession(token: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !data?.user) {
      return null;
    }
    
    return data.user;
  } catch (error) {
    console.error('Error verifying user session:', error);
    return null;
  }
}


// Create a Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// This client should only be used server-side as it has admin privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for authentication
export async function getUser(accessToken: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  
  if (error) {
    throw error;
  }
  
  return data.user;
}

export async function getUserById(userId: string) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (error) {
    throw error;
  }
  
  return data.user;
}