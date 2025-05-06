export type Role = 'Admin' | 'Member' | 'authenticated';

export interface Profile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: Role;
}

export interface Review {
  id: string;
  title: string;
  content: string;
  status: string;
  userId: string;
  projectLeadId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewWithProfile extends Review {
  user: Profile;
  projectLead?: Profile;
}

export interface Comment {
  id: string;
  content: string;
  reviewId: string;
  userId: string;
  createdAt: string;
}

export interface CommentWithProfile extends Comment {
  user: Profile;
}

// Database types
export interface DbProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: Role;
}

export interface DbReview {
  id: string;
  title: string;
  content: string;
  status: string;
  user_id: string;
  project_lead_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DbComment {
  id: string;
  content: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

// Helper functions to transform database types to frontend types
export const dbToFrontendProfile = (profile: DbProfile): Profile => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  createdAt: profile.created_at,
  role: profile.role
});

export const dbToFrontendReview = (review: DbReview): Review => ({
  id: review.id,
  title: review.title,
  content: review.content,
  status: review.status,
  userId: review.user_id,
  projectLeadId: review.project_lead_id,
  createdAt: review.created_at,
  updatedAt: review.updated_at
});

export const dbToFrontendComment = (comment: DbComment): Comment => ({
  id: comment.id,
  content: comment.content,
  reviewId: comment.review_id,
  userId: comment.user_id,
  createdAt: comment.created_at
}); 