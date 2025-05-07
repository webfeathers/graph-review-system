export type Role = 'Admin' | 'Member';

// Database types (using snake_case)
export interface DbProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: Role;
  avatar_url?: string;
}

export interface DbReview {
  id: string;
  title: string;
  description: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  user_id: string;
  created_at: string;
  updated_at: string;
  account_name?: string;
  org_id?: string;
  kantata_project_id?: string;
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

export type VoteType = 'up' | 'down';

export interface CommentVote {
  id: string;
  commentId: string;
  userId: string;
  voteType: VoteType;
  createdAt: string;
  updatedAt: string;
}

export interface DbCommentVote {
  id: string;
  comment_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
  updated_at: string;
}

// Frontend types (using camelCase)
export interface Profile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: Role;
  reviewCount?: number;
  commentCount?: number;
  points?: number;
  badges?: string[];
  avatarUrl?: string;
}

export interface Review {
  id: string;
  title: string;
  description: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  userId: string;
  createdAt: string;
  updatedAt: string;
  accountName?: string;
  orgId?: string;
  kantataProjectId?: string;
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
  votes?: CommentVote[];
  voteCount?: number;
  userVote?: VoteType;
}

// Helper functions to convert between database and frontend types
export function dbToFrontendReview(dbReview: DbReview): Review {
  return {
    id: dbReview.id,
    title: dbReview.title,
    description: dbReview.description,
    status: dbReview.status,
    userId: dbReview.user_id,
    createdAt: dbReview.created_at,
    updatedAt: dbReview.updated_at,
    accountName: dbReview.account_name,
    orgId: dbReview.org_id,
    kantataProjectId: dbReview.kantata_project_id,
    segment: dbReview.segment,
    remoteAccess: dbReview.remote_access,
    graphName: dbReview.graph_name,
    useCase: dbReview.use_case,
    customerFolder: dbReview.customer_folder,
    handoffLink: dbReview.handoff_link,
    projectLeadId: dbReview.project_lead_id
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
    createdAt: dbProfile.created_at,
    role: dbProfile.role,
    avatarUrl: dbProfile.avatar_url
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

export function dbToFrontendCommentWithProfile(dbComment: DbComment & { profiles?: DbProfile }): CommentWithProfile {
  const comment = dbToFrontendComment(dbComment);
  
  // Create a default profile if none exists
  const defaultProfile: Profile = {
    id: dbComment.user_id,
    name: 'Unknown User',
    email: '',
    createdAt: new Date().toISOString(),
    role: 'Member'
  };
  
  return {
    ...comment,
    user: dbComment.profiles ? dbToFrontendProfile(dbComment.profiles) : defaultProfile
  };
}

export const dbToFrontendCommentVote = (vote: DbCommentVote): CommentVote => ({
  id: vote.id,
  commentId: vote.comment_id,
  userId: vote.user_id,
  voteType: vote.vote_type,
  createdAt: vote.created_at,
  updatedAt: vote.updated_at
}); 