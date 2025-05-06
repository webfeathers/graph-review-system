// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, validateEnvironment, IS_DEV } from './env';

// Validate environment on initialization
validateEnvironment();

// Check if we have the required keys
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required Supabase environment variables. ' +
    'Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

// Create the Supabase client
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Add a console warning in development if using without proper setup
if (IS_DEV) {
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Supabase key available:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
}