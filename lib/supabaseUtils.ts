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
      const profile = review.profiles as Profile | null;
      
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
          createdAt: profile.created_at,
          role: profile.role || 'Member'
        } : {
          id: review.user_id,
          name: 'Unknown User',
          email: '',
          createdAt: review.created_at,
          role: 'Member'
        }
      };
      
      return reviewWithProfile;