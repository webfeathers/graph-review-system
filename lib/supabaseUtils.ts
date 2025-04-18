// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { 
  Review, Comment, Profile, ReviewWithProfile, CommentWithProfile,
  DbReview, DbComment, DbProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile,
  dbToFrontendReviewWithProfile, dbToFrontendCommentWithProfile
} from '../types/supabase';

// Reviews
export async function getReviews(userId?: string) {
  let query = supabase
    .from('reviews')
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        email,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reviews:', error);
    throw error;
  }

  // Transform the data to the frontend format
  const frontendReviews: ReviewWithProfile[] = [];
  
  for (const review of data) {
    try {
      // Convert directly to ReviewWithProfile which includes the user property
      const frontendReview = dbToFrontendReviewWithProfile(review);
      frontendReviews.push(frontendReview);
    } catch (error) {
      console.error('Error converting review with profile:', error);
      // Fall back to just the review without profile
      const frontendReview = dbToFrontendReview(review);
      frontendReviews.push({
        ...frontendReview,
        user: {
          id: 'unknown',
          name: 'Unknown User',
          email: '',
          createdAt: frontendReview.createdAt
        }
      });
    }
  }
  
  return frontendReviews;
}

export async function getReviewById(id: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        email,
        created_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching review:', error);
    throw error;
  }

  // Convert directly to ReviewWithProfile
  return dbToFrontendReviewWithProfile(data);
}

export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbReviewData: any = {
    title: reviewData.title,
    description: reviewData.description,
    graph_image_url: reviewData.graphImageUrl,
    status: reviewData.status,
    user_id: reviewData.userId
  };

  const { data, error } = await supabase
    .from('reviews')
    .insert(dbReviewData)
    .select()
    .single();

  if (error) {
    console.error('Error creating review:', error);
    throw error;
  }

  return dbToFrontendReview(data);
}

export async function updateReviewStatus(id: string, status: Review['status'], userId: string) {
  // First check if the user is the owner of the review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existingReview || existingReview.user_id !== userId) {
    throw new Error('Unauthorized to update this review');
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating review status:', error);
    throw error;
  }

  return dbToFrontendReview(data);
}

// Comments
export async function getCommentsByReviewId(reviewId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        email,
        created_at
      )
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  // Transform the data to the frontend format
  const frontendComments: CommentWithProfile[] = [];
  
  for (const comment of data) {
    try {
      // Convert directly to CommentWithProfile
      const frontendComment = dbToFrontendCommentWithProfile(comment);
      frontendComments.push(frontendComment);
    } catch (error) {
      console.error('Error converting comment with profile:', error);
      // Fall back to just the comment without profile
      const frontendComment = dbToFrontendComment(comment);
      frontendComments.push({
        ...frontendComment,
        user: {
          id: 'unknown',
          name: 'Unknown User',
          email: '',
          createdAt: frontendComment.createdAt
        }
      });
    }
  }
  
  return frontendComments;
}

export async function createComment(commentData: Omit<Comment, 'id' | 'createdAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbCommentData: any = {
    content: commentData.content,
    review_id: commentData.reviewId,
    user_id: commentData.userId
  };
  
  const { data, error } = await supabase
    .from('comments')
    .insert(dbCommentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw error;
  }

  return dbToFrontendComment(data);
}

// Profiles
export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return dbToFrontendProfile(data);
}

export async function updateProfile(profileData: Partial<Profile> & { id: string }) {
  // Convert camelCase to snake_case for the database
  const dbProfileData: any = {
    id: profileData.id,
    name: profileData.name,
    email: profileData.email
  };
  
  // Remove undefined fields
  Object.keys(dbProfileData).forEach(key => 
    dbProfileData[key] === undefined && delete dbProfileData[key]
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(dbProfileData)
    .eq('id', profileData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return dbToFrontendProfile(data);
}