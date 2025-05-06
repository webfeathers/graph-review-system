// types/supabase.ts
// Database types (matching Supabase snake_case)
export type Role = 'Member' | 'Admin';

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
  description: string;
  graph_image_url?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  user_id: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
  kantata_project_id?: string;
  org_id?: string;
  segment?: 'Enterprise' | 'MidMarket';
  remote_access?: boolean;
  graph_name?: string;
  use_case?: string;
  customer_folder?: string;
  handoff_link?: string;
  project_lead_id?: string;
}

export interface DbComment {
  id: string;
  content: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

// Frontend types (using camelCase)
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
  description: string;
  graphImageUrl?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  userId: string;
  createdAt: string;
  updatedAt: string;
  accountName?: string;
  kantataProjectId?: string;
  orgId?: string;
  segment?: 'Enterprise' | 'MidMarket';
  remoteAccess?: boolean;
  graphName?: string;
  useCase?: string;
  customerFolder?: string;
  handoffLink?: string;
  projectLeadId?: string;
}

export interface Comment {
  id: string;
  content: string;
  reviewId: string;
  userId: string;
  createdAt: string;
}

// With joined relationships
export interface ReviewWithProfile extends Review {
  user: Profile;
  projectLead?: Profile;
  comments?: CommentWithProfile[];
}

export interface CommentWithProfile extends Comment {
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
    updatedAt: dbReview.updated_at,
    accountName: dbReview.account_name,
    kantataProjectId: dbReview.kantata_project_id,
    orgId: dbReview.org_id,
    segment: dbReview.segment,
    remoteAccess: dbReview.remote_access,
    graphName: dbReview.graph_name,
    useCase: dbReview.use_case,
    customerFolder: dbReview.customer_folder,
    handoffLink: dbReview.handoff_link,
    projectLeadId: dbReview.project_lead_id
  };
}

export function dbToFrontendReviewWithProfile(dbReview: DbReview & { 
  profiles?: DbProfile,
  project_lead?: DbProfile
}): ReviewWithProfile {
  const review = dbToFrontendReview(dbReview);
  
  if (!dbReview.profiles) {
    throw new Error('Profile data is missing from the database result');
  }
  
  // Create the base result with the user
  const result: ReviewWithProfile = {
    ...review,
    user: dbToFrontendProfile(dbReview.profiles)
  };
  
  // Add project lead if available
  if (dbReview.project_lead) {
    result.projectLead = dbToFrontendProfile(dbReview.project_lead);
  }
  
  return result;
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
    updated_at: review.updatedAt,
    account_name: review.accountName,
    kantata_project_id: review.kantataProjectId,
    org_id: review.orgId,
    segment: review.segment,
    remote_access: review.remoteAccess,
    graph_name: review.graphName,
    use_case: review.useCase,
    customer_folder: review.customerFolder,
    handoff_link: review.handoffLink,
    project_lead_id: review.projectLeadId
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

export function dbToFrontendCommentWithProfile(dbComment: DbComment & { profiles?: DbProfile }): CommentWithProfile {
  const comment = dbToFrontendComment(dbComment);
  
  if (!dbComment.profiles) {
    throw new Error('Profile data is missing from the database result');
  }
  
  return {
    ...comment,
    user: dbToFrontendProfile(dbComment.profiles)
  };
}

export function dbToFrontendProfile(dbProfile: DbProfile): Profile {
  return {
    id: dbProfile.id,
    name: dbProfile.name,
    email: dbProfile.email,
    createdAt: dbProfile.created_at,
    role: dbProfile.role
  };
}