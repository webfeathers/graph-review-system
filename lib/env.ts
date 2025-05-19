// lib/env.ts
/**
 * Environment configuration with validation
 */

/**
 * Application environment
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_DEV = NODE_ENV === 'development';
export const IS_PROD = NODE_ENV === 'production';
export const IS_TEST = NODE_ENV === 'test';

/**
 * Supabase configuration
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Application URLs
 */
export const APP_URL = process.env.NEXT_PUBLIC_URL || (IS_DEV ? 'http://localhost:3000' : 'https://graph-review-system-3a7t.vercel.app');

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = [
    { name: 'NEXT_PUBLIC_SUPABASE_URL', value: SUPABASE_URL },
    { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: SUPABASE_ANON_KEY },
    { name: 'NEXT_PUBLIC_URL', value: process.env.NEXT_PUBLIC_URL },
  ];

  // Only validate service role key on server side
  if (typeof window === 'undefined') {
    requiredVars.push({ name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_KEY });
  }

  const missingVars = requiredVars.filter(v => !v.value);

  if (missingVars.length > 0) {
    const missingVarNames = missingVars.map(v => v.name).join(', ');
    const errorMessage = `Missing required environment variables: ${missingVarNames}`;
    
    if (IS_DEV) {
      // In development, show a clear error in the console
      console.error('⚠️ ENVIRONMENT ERROR ⚠️');
      console.error(errorMessage);
      console.error('Please check your .env file and ensure all required variables are set.');
    } else {
      // In production, throw an error to prevent the app from starting with missing config
      throw new Error(errorMessage);
    }
  }
}

// Only validate client-side required variables
if (!SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

if (!process.env.NEXT_PUBLIC_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_URL');
}