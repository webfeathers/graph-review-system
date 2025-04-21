// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, validateEnvironment, IS_DEV } from './env';

// Validate environment on initialization
validateEnvironment();

export const supabase = createClient(
  SUPABASE_URL || '',  // Fallback to empty string to prevent runtime errors
  SUPABASE_ANON_KEY || ''
);

// Add a console warning in development if using without proper setup
if (IS_DEV && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    'Supabase client initialized with missing credentials. ' +
    'API calls will fail. Check your environment variables.'
  );
}