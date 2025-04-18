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
  GRAPH_IMAGES = 'graph-images',
  USER_AVATARS = 'user-avatars',
}

/**
 * Max file sizes for uploads (in bytes)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  AVATAR: 2 * 1024 * 1024, // 2MB
};

/**
 * Allowed image MIME types
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/**
 * Form field limits
 */
export const FIELD_LIMITS = {
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 2000,
  COMMENT_MAX_LENGTH: 1000,
  NAME_MAX_LENGTH: 50,
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