// types/index.ts
// Re-export all types from supabase.ts to provide a central location

// Use proper 'export type' syntax for isolatedModules compatibility
export type {
  // Database types
  DbProfile,
  DbReview,
  DbComment,
  
  // Frontend types
  Role,
  Profile,
  Review,
  Comment,
  
  // Relationship types
  ReviewWithProfile,
  CommentWithProfile,
  
  // Helper functions
  dbToFrontendReview,
  dbToFrontendProfile,
  dbToFrontendComment,
  frontendToDbReview,
  dbToFrontendReviewWithProfile,
  dbToFrontendCommentWithProfile
} from './supabase';

/* 
 * Usage Guide:
 * 
 * To use these types in your components, import them from this central location:
 * 
 * ```typescript
 * import type { Review, Comment, Profile } from '../types';
 * ```
 * 
 * If you need the User type for backward compatibility:
 * 
 * ```typescript
 * import type { Profile as User } from '../types';
 * ```
 */