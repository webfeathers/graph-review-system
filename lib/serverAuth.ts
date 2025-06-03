// lib/serverAuth.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './env';

// Create a Supabase client with admin privileges (only for server-side)
export const supabaseAdmin = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY || ''
);

// Helper functions for authentication - moved from auth.ts
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