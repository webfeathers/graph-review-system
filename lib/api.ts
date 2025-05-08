import { supabase } from './supabase';
import { supabaseAdmin } from './serverAuth';
import type { 
  ReviewWithProfile, 
  CommentWithProfile, 
  Profile,
  CommentVote,
  DbCommentVote,
  VoteType
} from '../types/supabase';
import { 
  dbToFrontendReview, 
  dbToFrontendProfile, 
  dbToFrontendComment, 
  dbToFrontendCommentVote,
  DbReview, 
  DbProfile, 
  DbComment 
} from '../types/supabase';
import { createComment } from './supabaseUtils';

// Reviews
export const getReviews = async (userId?: string) => {
  let query = supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!fk_reviews_user(id, name, email, created_at, role),
      projectLead:profiles!fk_project_lead(id, name, email, created_at, role)
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Transform the data to ensure proper date handling
  return data.map(review => ({
    ...review,
    createdAt: review.created_at || new Date().toISOString(),
    updatedAt: review.updated_at || new Date().toISOString(),
    user: {
      ...review.user,
      createdAt: review.user.created_at || new Date().toISOString()
    },
    projectLead: review.projectLead ? {
      ...review.projectLead,
      createdAt: review.projectLead.created_at || new Date().toISOString()
    } : undefined
  })) as ReviewWithProfile[];
};

export const getReviewById = async (id: string): Promise<ReviewWithProfile> => {
  const { data: rawData, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!fk_reviews_user(id, name, email, created_at, role),
      projectLead:profiles!fk_project_lead(id, name, email, created_at, role),
      comments:comments(
        id,
        content,
        created_at,
        user_id,
        user:profiles!fk_comments_user(id, name, email, created_at, role),
        votes:comment_votes!left(*)
      )
    `)
    .eq('id', id)
    .order('created_at', { foreignTable: 'comments', ascending: false })
    .order('created_at', { foreignTable: 'comments.votes', ascending: false });

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Review not found');
    }
    console.error("Error fetching review by ID:", error);
    throw error;
  }

  if (!rawData) {
    throw new Error('Review not found');
  }

  const typedRawData = rawData as any;
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  const review = dbToFrontendReview(typedRawData as DbReview);

  const reviewWithProfile: ReviewWithProfile = {
    ...review,
    user: typedRawData.user ? dbToFrontendProfile(typedRawData.user as DbProfile) : {
      id: review.userId,
      name: 'Unknown User',
      email: '',
      createdAt: review.createdAt,
      role: 'Member'
    },
    projectLead: typedRawData.projectLead ? dbToFrontendProfile(typedRawData.projectLead as DbProfile) : undefined,
    comments: typedRawData.comments ? (typedRawData.comments as any[]).map(comment => {
      // Ensure votes is an array
      const rawVotes = Array.isArray(comment.votes) ? comment.votes : [];
      
      // Transform votes
      const votes = rawVotes.map(dbToFrontendCommentVote);
      
      // Calculate vote count
      const voteCount = votes.reduce((sum: number, vote: CommentVote) => 
        sum + (vote.voteType === 'up' ? 1 : -1), 0);
      
      // Find user's vote
      const userVote = votes.find((v: CommentVote) => v.userId === currentUserId)?.voteType;
      
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at || new Date().toISOString(),
        userId: comment.user_id,
        reviewId: id,
        user: comment.user ? {
          id: comment.user.id,
          name: comment.user.name || 'Unknown User',
          email: comment.user.email || '',
          createdAt: comment.user.created_at || new Date().toISOString(),
          role: comment.user.role || 'Member'
        } : {
          id: comment.user_id,
          name: 'Unknown User',
          email: '',
          createdAt: comment.created_at || new Date().toISOString(),
          role: 'Member'
        },
        votes,
        voteCount,
        userVote
      };
    }) : []
  };

  return reviewWithProfile;
};

export const updateReviewStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProjectLead = async (reviewId: string, newLeadId: string, role: string) => {
  console.log('Updating project lead:', { reviewId, newLeadId, role });

  const response = await fetch(`/api/reviews/${reviewId}/project-lead`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({ newLeadId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update project lead');
  }

  const { data } = await response.json();
  return data as ReviewWithProfile;
};

// Comments
export async function getCommentsByReviewId(reviewId: string): Promise<CommentWithProfile[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!fk_comments_user(id, name, email, created_at, role),
      votes:comment_votes(*)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(comment => ({
    ...dbToFrontendComment(comment),
    user: dbToFrontendProfile(comment.user),
    votes: comment.votes?.map(dbToFrontendCommentVote),
    voteCount: comment.votes?.reduce((sum: number, vote: DbCommentVote) => 
      sum + (vote.vote_type === 'up' ? 1 : -1), 0) || 0
  }));
}

export const addComment = async (reviewId: string, content: string, userId: string) => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    throw new Error('No active session');
  }

  const comment = await createComment({
    content,
    reviewId,
    userId
  }, supabase);

  return {
    ...comment,
    votes: [],
    voteCount: 0
  } as CommentWithProfile;
};

// Profiles
export const getProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Profile[];
};

export const getProfileById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Profile;
};

export async function getCommentVotes(commentId: string): Promise<CommentVote[]> {
  const { data, error } = await supabase
    .from('comment_votes')
    .select('*')
    .eq('comment_id', commentId);

  if (error) throw error;
  return data.map(dbToFrontendCommentVote);
}

export async function getUserVote(commentId: string, userId: string): Promise<VoteType | null> {
  const { data, error } = await supabase
    .from('comment_votes')
    .select('vote_type')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }
  return data.vote_type;
}

export async function voteOnComment(commentId: string, userId: string, voteType: VoteType): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('comment_votes')
    .upsert(
      {
        comment_id: commentId,
        user_id: userId,
        vote_type: voteType,
        created_at: now,
        updated_at: now
      },
      {
        onConflict: 'comment_id,user_id',
        ignoreDuplicates: false
      }
    );

  if (error) throw error;
}

export async function removeVote(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('comment_votes')
    .delete()
    .match({
      comment_id: commentId,
      user_id: userId
    });

  if (error) throw error;
} 