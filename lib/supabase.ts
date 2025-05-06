// lib/supabase.ts
// Test comment to verify edit access
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

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY
    }
  }
});

// Only log in development and only once
if (IS_DEV && !process.env.SUPABASE_LOGGED) {
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Supabase key available:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
  process.env.SUPABASE_LOGGED = 'true';
}