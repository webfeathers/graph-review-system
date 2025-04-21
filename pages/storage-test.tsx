// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, validateEnvironment, IS_DEV } from './env';

// Validate environment on initialization
validateEnvironment();

// Log the values for debugging (not in production)
if (IS_DEV) {
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Supabase key available:', SUPABASE_ANON_KEY ? 'Yes' : 'No');
}

export const supabase = createClient(
  SUPABASE_URL || '',  // Fallback to empty string to prevent runtime errors
  SUPABASE_ANON_KEY || '', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Enable more detailed logging in development
    debug: IS_DEV
  }
);

// Add a console warning in development if using without proper setup
if (IS_DEV && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    'Supabase client initialized with missing credentials. ' +
    'API calls will fail. Check your environment variables.'
  );
}

// A simple test function to verify the Supabase connection
export async function testSupabaseConnection() {
  try {
    // First check if auth is working
    const authResponse = await supabase.auth.getSession();
    
    // Then check if storage is accessible
    const storageResponse = await supabase.storage.listBuckets();
    
    return {
      success: !authResponse.error && !storageResponse.error,
      authError: authResponse.error,
      storageError: storageResponse.error,
      authData: authResponse.data,
      storageData: storageResponse.data
    };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return {
      success: false,
      error
    };
  }
}