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

// Points and badges configuration
export const POINTS_PER_REVIEW = 10;
export const POINTS_PER_REVIEW_APPROVAL = 20;
export const POINTS_PER_COMMENT = 5;
export const POINTS_PER_TASK_COMPLETION = 5;

// Badge types for type safety
export enum BadgeType {
  EXPERT_REVIEWER = 'Expert Reviewer',
  ACTIVE_REVIEWER = 'Active Reviewer',
  CONTRIBUTOR = 'Contributor',
  REVIEW_MASTER = 'Review Master',
  QUALITY_REVIEWER = 'Quality Reviewer',
  HELPFUL_REVIEWER = 'Helpful Reviewer',
  ENGAGED_COMMENTER = 'Engaged Commenter',
  INSIGHTFUL_COMMENTER = 'Insightful Commenter',
  EARLY_ADOPTER = 'Early Adopter',
  TEAM_PLAYER = 'Team Player',
  CONSISTENT_CONTRIBUTOR = 'Consistent Contributor',
  ICE_BREAKER = 'Ice Breaker'
}

export const BADGE_THRESHOLDS: Array<{ 
  type: BadgeType;
  threshold: number;
  description: string;
  category: 'points' | 'reviews' | 'comments' | 'special';
}> = [
  // Points-based badges
  { type: BadgeType.EXPERT_REVIEWER, threshold: 100, description: 'Earned 100+ points', category: 'points' },
  { type: BadgeType.ACTIVE_REVIEWER, threshold: 50, description: 'Earned 50+ points', category: 'points' },
  { type: BadgeType.CONTRIBUTOR, threshold: 10, description: 'Earned 10+ points', category: 'points' },
  
  // Review-based badges
  { type: BadgeType.REVIEW_MASTER, threshold: 20, description: 'Completed 20+ reviews', category: 'reviews' },
  { type: BadgeType.QUALITY_REVIEWER, threshold: 5, description: 'Had 5+ reviews approved', category: 'reviews' },
  { type: BadgeType.HELPFUL_REVIEWER, threshold: 10, description: 'Received 10+ helpful votes on comments', category: 'reviews' },
  
  // Comment-based badges
  { type: BadgeType.ENGAGED_COMMENTER, threshold: 20, description: 'Made 20+ comments', category: 'comments' },
  { type: BadgeType.INSIGHTFUL_COMMENTER, threshold: 5, description: 'Had 5+ comments marked as helpful', category: 'comments' },
  
  // Special achievement badges
  { type: BadgeType.EARLY_ADOPTER, threshold: 1, description: 'Joined in the first month', category: 'special' },
  { type: BadgeType.TEAM_PLAYER, threshold: 5, description: 'Participated in 5+ different reviews', category: 'special' },
  { type: BadgeType.CONSISTENT_CONTRIBUTOR, threshold: 3, description: 'Maintained activity for 3+ months', category: 'special' },
  { type: BadgeType.ICE_BREAKER, threshold: 1, description: 'First to comment on a review', category: 'special' }
];