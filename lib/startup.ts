// lib/startup.ts
import { validateEnvironment } from './env';

/**
 * Run startup validations to ensure everything is configured correctly
 * Call this at app startup in a SSR context
 */
export function runStartupValidations() {
  // Validate environment variables
  validateEnvironment();
  
  // Add additional startup validations here as needed
  // e.g., database connection tests, feature flags, etc.
}