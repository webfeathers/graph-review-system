// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { 
  Review, Comment, Profile, ReviewWithProfile, CommentWithProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile,
  dbToFrontendReviewWithProfile, dbToFrontendCommentWithProfile
} from '../types/supabase';

/**
 * Get all reviews with optimized query using joins
 * 
 * @param userId Optional user ID to filter reviews by
 * @returns Array of reviews with profile information
 */
export async function getReviews(userId?: string) {
  try {
    // Use Supabase's built-in join capability instead of separate queries
    let query = supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          created_at,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }

    // If no reviews, return empty array
    if (!reviews || reviews.length === 0) {
      return [];
    }

    // Transform to frontend format with proper type safety
    const frontendReviews: ReviewWithProfile[] = reviews.map(review => {
      // Extract profile from the join result with proper type checking
      const profile = review.profiles;
      
      // Convert review to frontend format
      const frontendReview: Review = {
        id: review.id,
        title: review.title,
        description: review.description,
        graphImageUrl: review.graph_image_url,
        status: review.status,
        userId: review.user_id,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        accountName: review.account_name,
        orgId: review.org_id,
        kantataProjectId: review.kantata_project_id,
        segment: review.segment,
        remoteAccess: review.remote_access,
        graphName: review.graph_name,
        useCase: review.use_case,
        customerFolder: review.customer_folder,
        handoffLink: review.handoff_link
      };
      
      // Construct the review with profile
      const reviewWithProfile: ReviewWithProfile = {
        ...frontendReview,
        user: profile ? {
          id: profile.id,
          name: profile.name || 'Unknown User',
          email: profile.email || '',
          // Fix here: Use createdAt for the frontend Profile object
          createdAt: profile.created_at,
          role: profile.role || 'Member'
        } : {
          id: review.user_id,
          name: 'Unknown User',
          email: '',
          // And here: Fix the transformation
          createdAt: review.created_at,
          role: 'Member'
        }
      };
      
      return reviewWithProfile;
    });
    
    return frontendReviews;
  } catch (err) {
    console.error('Unexpected error in getReviews:', err);
    return []; // Return empty array on any error
  }
}

/**
 * Get a single review by ID with optimized query
 * 
 * @param id The review ID
 * @returns The review with user profile data
 */
export async function getReviewById(id: string) {
  try {
    // Use a single query with join to get the review and profile
    const { data: review, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          created_at,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching review:', error);
      throw error;
    }

    if (!review) {
      throw new Error('Review not found');
    }

    // Extract the profile from the join result
    const profile = review.profiles;

    // Convert to frontend format
    const frontendReview: Review = {
      id: review.id,
      title: review.title,
      description: review.description,
      graphImageUrl: review.graph_image_url,
      status: review.status,
      userId: review.user_id,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      accountName: review.account_name || '',
      orgId: review.org_id || '',
      kantataProjectId: review.kantata_project_id || '',
      segment: review.segment as 'Enterprise' | 'MidMarket' || 'Enterprise',
      remoteAccess: review.remote_access || false,
      graphName: review.graph_name || '',
      useCase: review.use_case || '',
      customerFolder: review.customer_folder || '',
      handoffLink: review.handoff_link || ''
    };

    // Create review with profile
    const reviewWithProfile: ReviewWithProfile = {
      ...frontendReview,
      user: profile ? {
        id: profile.id,
        name: profile.name || 'Unknown User',
        email: profile.email || '',
        // Fix here too
        createdAt: profile.created_at,
        role: profile.role || 'Member'
      } : {
        id: review.user_id,
        name: 'Unknown User',
        email: '',
        // And here
        createdAt: review.created_at,
        role: 'Member'
      }
    };

    return reviewWithProfile;
  } catch (err) {
    console.error('Error in getReviewById:', err);
    throw err;
  }
}

/**
 * Get comments for a review with optimized query
 * 
 * @param reviewId The review ID to get comments for
 * @returns Array of comments with user profile data
 */
export const getCommentsByReviewId = async (reviewId: string) => {
  try {
    // Instead of trying to use the automatic join with "profiles:user_id"
    // We'll do a manual join with two separate queries
    
    // First, get all comments for the review
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });
      
    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw commentsError;
    }
    
    if (!comments || comments.length === 0) {
      return [];
    }
    
    // Now fetch the associated user profiles
    const userIds = comments.map(comment => comment.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }
    
    // Create a map of user profiles for quick lookup
    const profileMap = (profiles || []).reduce((map, profile) => {
      map[profile.id] = profile;
      return map;
    }, {} as Record<string, any>);
    
    // Combine the data manually
    const commentsWithProfiles = comments.map(comment => {
      const profile = profileMap[comment.user_id] || {
        id: comment.user_id,
        name: 'Unknown User',
        email: '',
        created_at: comment.created_at,
        role: 'Member'
      };
      
      return {
        id: comment.id,
        content: comment.content,
        reviewId: comment.review_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        user: {
          id: profile.id,
          name: profile.name || 'Unknown User',
          email: profile.email || '',
          createdAt: profile.created_at,
          role: profile.role || 'Member'
        }
      };
    });
    
    return commentsWithProfiles;
  } catch (err) {
    console.error('Error in getCommentsByReviewId:', err);
    throw err;
  }
};

/**
 * Create a new review
 * 
 * @param reviewData The review data to create
 * @returns The created review
 */
export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbReviewData = {
    title: reviewData.title,
    description: reviewData.description,
    graph_image_url: reviewData.graphImageUrl,
    status: reviewData.status,
    user_id: reviewData.userId,
    account_name: reviewData.accountName,
    org_id: reviewData.orgId,
    kantata_project_id: reviewData.kantataProjectId,
    segment: reviewData.segment,
    remote_access: reviewData.remoteAccess,
    graph_name: reviewData.graphName,
    use_case: reviewData.useCase,
    customer_folder: reviewData.customerFolder,
    handoff_link: reviewData.handoffLink
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

/**
 * Create a new comment
 * 
 * @param commentData The comment data to create
 * @returns The created comment
 */
export async function createComment(commentData: Omit<Comment, 'id' | 'createdAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbCommentData = {
    content: commentData.content,
    review_id: commentData.reviewId,
    user_id: commentData.userId,
    created_at: new Date().toISOString()
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

/**
 * Update a review's status - using service role to bypass RLS
 * 
 * @param id The review ID
 * @param status The new status
 * @param userId The ID of the user making the update
 * @returns The updated review
 */
export async function updateReviewStatus(id: string, status: Review['status'], userId: string) {
  // First check if the status is 'Approved' and the user is an admin
  if (status === 'Approved') {
    // Get the user's role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (profileError || !userProfile || userProfile.role !== 'Admin') {
      throw new Error('Only administrators can set a review to Approved');
    }
  }

  // Update the review status
  const { data, error } = await supabase
    .from('reviews')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating review status:', error);
    throw error;
  }

  return dbToFrontendReview(data);
}