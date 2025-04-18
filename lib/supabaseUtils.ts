// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { 
  Review, Comment, Profile, 
  DbReview, DbComment, DbProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile 
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

  // Convert the data from snake_case to camelCase
  return data.map((review: any) => {
    const frontendReview = dbToFrontendReview(review);
    if (review.profiles) {
      frontendReview.user = dbToFrontendProfile(review.profiles);
    }
    return frontendReview;
  });
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

  // Convert the data from snake_case to camelCase
  const review = dbToFrontendReview(data);
  if (data.profiles) {
    review.user = dbToFrontendProfile(data.profiles);
  }
  
  return review;
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

  // Convert the data from snake_case to camelCase
  return data.map((comment: any) => {
    const frontendComment = dbToFrontendComment(comment);
    if (comment.profiles) {
      frontendComment.user = dbToFrontendProfile(comment.profiles);
    }
    return frontendComment;
  });
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