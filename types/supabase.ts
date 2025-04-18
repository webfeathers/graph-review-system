// types/supabase.ts
// Database types (matching Supabase snake_case)
export type DbProfile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export type DbReview = {
  id: string;
  title: string;
  description: string;
  graph_image_url?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type DbComment = {
  id: string;
  content: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

// Frontend types (using camelCase)
export type Profile = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type Review = {
  id: string;
  title: string;
  description: string;
  graphImageUrl?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type Comment = {
  id: string;
  content: string;
  reviewId: string;
  userId: string;
  createdAt: string;
}

export type ReviewWithUser = Review & {
  user: Profile;
}

export type CommentWithUser = Comment & {
  user: Profile;
}

// Helper functions to convert between database and frontend types
export function dbToFrontendReview(dbReview: DbReview): Review {
  return {
    id: dbReview.id,
    title: dbReview.title,
    description: dbReview.description,
    graphImageUrl: dbReview.graph_image_url,
    status: dbReview.status,
    userId: dbReview.user_id,
    createdAt: dbReview.created_at,
    updatedAt: dbReview.updated_at
  };
}

export function frontendToDbReview(review: Review): DbReview {
  return {
    id: review.id,
    title: review.title,
    description: review.description,
    graph_image_url: review.graphImageUrl,
    status: review.status,
    user_id: review.userId,
    created_at: review.createdAt,
    updated_at: review.updatedAt
  };
}

export function dbToFrontendComment(dbComment: DbComment): Comment {
  return {
    id: dbComment.id,
    content: dbComment.content,
    reviewId: dbComment.review_id,
    userId: dbComment.user_id,
    createdAt: dbComment.created_at
  };
}

export function dbToFrontendProfile(dbProfile: DbProfile): Profile {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    email: dbProfile.email,
    createdAt: dbProfile.created_at
  };
}