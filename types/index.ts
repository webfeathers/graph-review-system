// types/index.ts
// Re-export all types from supabase.ts to provide a central location
export * from './supabase';

// Add a comment to models/Review.ts, models/Comment.ts, and models/User.ts

/*
 * ⚠️ IMPORTANT:
 * This file is kept for backward compatibility.
 * Please use the types defined in '../types/supabase.ts' for all new code.
 * 
 * Example: 
 * import { Review, Comment, User } from '../types';
 */

// Update imports in components to use the new central location
// Example:
// import { Review } from '../types';