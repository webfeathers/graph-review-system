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
      id,
      title,
      description,
      status,
      user_id,
      project_lead_id,
      created_at,
      updated_at,
      user:profiles!fk_reviews_user(id, name, email, created_at, role),
      projectLead:profiles!fk_project_lead(id, name, email, created_at, role)
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Transform the data to match the frontend interface
  const transformedData = data.map(review => {
    const transformedReview = {
      id: review.id,
      title: review.title,
      description: review.description,
      status: review.status,
      userId: review.user_id,
      projectLeadId: review.project_lead_id,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      user: review.user?.[0] || null,
      projectLead: review.projectLead?.[0] || null
    };
    return transformedReview;
  });

  return transformedData;
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
  // First get all comments with their votes
  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!fk_comments_user(id, name, email, created_at, role),
      votes:comment_votes(*)
    `)
    .eq('review_id', reviewId);

  if (commentsError) throw commentsError;

  // Get all unique user IDs from votes
  const userIds = new Set<string>();
  comments.forEach(comment => {
    comment.votes?.forEach((vote: any) => {
      userIds.add(vote.user_id);
    });
  });

  // Fetch all user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', Array.from(userIds));

  if (profilesError) throw profilesError;

  // Create a map of user profiles for quick lookup
  const profileMap = new Map(profiles.map(profile => [profile.id, profile]));

  // Transform comments with votes and user profiles
  return comments.map(comment => ({
    ...dbToFrontendComment(comment),
    user: dbToFrontendProfile(comment.user),
    votes: comment.votes?.map((vote: any) => ({
      ...dbToFrontendCommentVote(vote),
      user: profileMap.get(vote.user_id) ? dbToFrontendProfile(profileMap.get(vote.user_id)) : undefined
    })),
    voteCount: comment.votes?.reduce((sum: number, vote: DbCommentVote) => 
      sum + (vote.vote_type === 'up' ? 1 : -1), 0) || 0,
    // Do not include replies property here; nestComments will build it
  }));
}

export const addComment = async (
  reviewId: string, 
  content: string, 
  userId: string,
  parentId?: string
) => {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    throw new Error('No active session');
  }

  const comment = await createComment({
    content,
    reviewId,
    userId,
    parentId
  }, supabase);

  // Get the user profile
  const { data: userData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return {
    ...comment,
    votes: [],
    voteCount: 0,
    replies: [],
    user: userData ? {
      id: userData.id,
      name: userData.name || 'Unknown User',
      email: userData.email || '',
      createdAt: userData.created_at || new Date().toISOString(),
      role: userData.role || 'Member'
    } : {
      id: userId,
      name: 'Unknown User',
      email: '',
      createdAt: new Date().toISOString(),
      role: 'Member'
    }
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