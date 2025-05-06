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
    // Use a single query with join to get the review, user profile, and project lead
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
        ),
        project_lead:project_lead_id (
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

    // Extract the profiles from the join result
    const userProfile = review.profiles;
    const projectLeadProfile = review.project_lead;

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
      handoffLink: review.handoff_link || '',
      projectLeadId: review.project_lead_id || ''
    };

    // Create review with profiles
    const reviewWithProfile: ReviewWithProfile = {
      ...frontendReview,
      user: userProfile ? {
        id: userProfile.id,
        name: userProfile.name || 'Unknown User',
        email: userProfile.email || '',
        createdAt: userProfile.created_at,
        role: userProfile.role || 'Member'
      } : {
        id: review.user_id,
        name: 'Unknown User',
        email: '',
        createdAt: review.created_at,
        role: 'Member'
      }
    };

    // Add project lead if available
    if (projectLeadProfile) {
      reviewWithProfile.projectLead = {
        id: projectLeadProfile.id,
        name: projectLeadProfile.name || 'Unknown User',
        email: projectLeadProfile.email || '',
        createdAt: projectLeadProfile.created_at,
        role: projectLeadProfile.role || 'Member'
      };
    }

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
    
    // Get all unique user IDs from comments
    const userIds = Array.from(new Set(comments.map(comment => comment.user_id)));
    
    // Now fetch all these users in a single query
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      throw profilesError;
    }
    
    // Create a map of user profiles for quick lookup
    const profileMap: Record<string, any> = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileMap[profile.id] = profile;
      });
    }
    
    // Combine the data
    const commentsWithProfiles: CommentWithProfile[] = comments.map(comment => {
      const profile = profileMap[comment.user_id];
      
      return {
        id: comment.id,
        content: comment.content,
        reviewId: comment.review_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        user: profile ? {
          id: profile.id,
          name: profile.name || 'Unknown User',
          email: profile.email || '',
          createdAt: profile.created_at,
          role: profile.role || 'Member'
        } : {
          id: comment.user_id,
          name: 'Unknown User',
          email: '',
          createdAt: comment.created_at,
          role: 'Member'
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
  console.log('Creating review with data:', reviewData);
  console.log('Project Lead ID from review data:', reviewData.projectLeadId);
  
  // Validate Project Lead ID
  if (!reviewData.projectLeadId) {
    console.error('Missing Project Lead ID');
    throw new Error('Project Lead ID is required');
  }

  // Validate that Project Lead exists
  const { data: projectLead, error: projectLeadError } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', reviewData.projectLeadId)
    .single();

  if (projectLeadError || !projectLead) {
    console.error('Invalid Project Lead ID:', reviewData.projectLeadId);
    throw new Error('Invalid Project Lead ID');
  }

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
    handoff_link: reviewData.handoffLink,
    project_lead_id: reviewData.projectLeadId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // First create the review
  const { data: newReview, error: createError } = await supabase
    .from('reviews')
    .insert(dbReviewData)
    .select('*')
    .single();

  if (createError) {
    console.error('Error creating review:', createError);
    throw new Error(`Failed to create review: ${createError.message}`);
  }

  if (!newReview) {
    throw new Error('Review creation failed - no data returned');
  }

  // Now fetch the complete review with profiles in a separate query
  const { data: reviewWithProfiles, error: fetchError } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles:user_id (*),
      project_lead:profiles!project_lead_id (*)
    `)
    .eq('id', newReview.id)
    .single();

  if (fetchError) {
    console.error('Error fetching complete review:', fetchError);
    // Return basic review if we can't fetch the complete one
    return dbToFrontendReview(newReview);
  }

  // Transform to frontend format
  return dbToFrontendReviewWithProfile(reviewWithProfiles);
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

  // OPTIMIZED: Update the review status and return the updated data in one operation
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

/**
 * Get comment counts for multiple reviews in a single query
 * 
 * @param reviewIds Array of review IDs to get comment counts for
 * @returns Object mapping review IDs to their comment counts
 */
export async function getCommentCountsForReviews(reviewIds: string[]): Promise<Record<string, number>> {
  try {
    if (!reviewIds.length) return {};
    
    const countMap: Record<string, number> = {};
    
    // Initialize all IDs with zero counts
    reviewIds.forEach(id => {
      countMap[id] = 0;
    });
    
    // Fetch all comments for these reviews
    const { data, error } = await supabase
      .from('comments')
      .select('review_id')
      .in('review_id', reviewIds);
      
    if (error) {
      console.error('Error fetching comment counts:', error);
      return countMap;
    }
    
    // Count them manually
    if (data) {
      data.forEach(comment => {
        countMap[comment.review_id] = (countMap[comment.review_id] || 0) + 1;
      });
    }
    
    return countMap;
  } catch (error) {
    console.error('Error in getCommentCountsForReviews:', error);
    return {};
  }
}