// lib/auth.ts
import { createClient } from '@supabase/supabase-js';

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