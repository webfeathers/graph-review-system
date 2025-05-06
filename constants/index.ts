// constants/index.ts
/**
 * Review status values
 */
export enum ReviewStatus {
  SUBMITTED = 'Submitted',
  IN_REVIEW = 'In Review',
  NEEDS_WORK = 'Needs Work',
  APPROVED = 'Approved',
}

/**
 * Array of all possible review statuses
 */
export const REVIEW_STATUSES = Object.values(ReviewStatus);

/**
 * Storage bucket names in Supabase
 */
export enum StorageBucket {
  AVATARS = 'avatars',
  USER_AVATARS = 'user-avatars'
}

/**
 * Max file sizes for uploads (in bytes)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
} as const;

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
] as const;

/**
 * Form field limits
 */
export const FIELD_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  COMMENT_MAX_LENGTH: 1000,
  NAME_MAX_LENGTH: 50,
  KANTATA_PROJECT_ID_MAX_LENGTH: 50,
  ACCOUNT_NAME_MAX_LENGTH: 100,
  ORG_ID_MAX_LENGTH: 50,
  GRAPH_NAME_MAX_LENGTH: 100,
  USE_CASE_MAX_LENGTH: 200,
  CUSTOMER_FOLDER_MAX_LENGTH: 255,
  HANDOFF_LINK_MAX_LENGTH: 255,
};

/**
 * Routes configuration
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  REVIEWS: '/reviews',
  NEW_REVIEW: '/reviews/new',
  getReviewDetails: (id: string) => `/reviews/${id}`,
};

/**
 * Authentication related constants
 */
export const AUTH = {
  TOKEN_STORAGE_KEY: 'graph-review-auth-token',
  SESSION_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

export const STORAGE_BUCKETS = {
  AVATARS: StorageBucket.AVATARS,
  USER_AVATARS: StorageBucket.USER_AVATARS
} as const;