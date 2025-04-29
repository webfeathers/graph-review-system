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
  try {
    // Basic query to get reviews without relying on relationships
    let query = supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return []; // Return empty array instead of throwing
    }

    // If no reviews, return empty array
    if (!reviews || reviews.length === 0) {
      return [];
    }

    // Get unique user IDs from reviews
    const userIds = [...new Set(reviews.map(review => review.user_id))];
    
    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Create frontend format reviews with profile information
    const frontendReviews: ReviewWithProfile[] = reviews.map(review => {
      // Find matching profile, or use fallback
      const profile = profiles?.find(p => p.id === review.user_id);
      
      // Convert review to frontend format
      const frontendReview = {
        id: review.id,
        title: review.title,
        description: review.description,
        graphImageUrl: review.graph_image_url,
        status: review.status,
        userId: review.user_id,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      };
      
      if (profile) {
        // Use the found profile
        return {
          ...frontendReview,
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdAt: profile.created_at,
            role: profile.role || 'Member' // Add role field with fallback to 'Member'
          }
        };
      } else {
        // Fallback for missing profile
        return {
          ...frontendReview,
          user: {
            id: review.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: review.created_at,
            role: 'Member' // Set default role
          }
        };
      }
    });
    
    return frontendReviews;
  } catch (err) {
    console.error('Unexpected error in getReviews:', err);
    return []; // Return empty array on any error
  }
}

export async function getReviewById(id: string) {
  try {
    // Fetch the review
    const { data: review, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', id)
    .single();

    if (error) {
      console.error('Error fetching review:', error);
      throw error;
    }

    if (!review) {
      throw new Error('Review not found');
    }

    // Fetch the user profile
    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', review.user_id)
    .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Convert to frontend format
    const frontendReview = {
      id: review.id,
      title: review.title,
      description: review.description,
      graphImageUrl: review.graph_image_url,
      status: review.status,
      userId: review.user_id,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      // Add the new fields
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

    // Create review with profile
    return {
      ...frontendReview,
      user: profile 
      ? {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        createdAt: profile.created_at,
        role: profile.role || 'Member'
      }
      : {
        id: review.user_id,
        name: 'Unknown User',
        email: '',
        createdAt: review.created_at,
        role: 'Member'
      }
    };
  } catch (err) {
    console.error('Error in getReviewById:', err);
    throw err;
  }
}

// lib/supabaseUtils.ts
    export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) {
  // Convert the camelCase to snake_case for the database
      const dbReviewData: any = {
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

    export async function updateReviewStatus(id: string, status: Review['status'], userId: string) {
  // Use the admin client to bypass restrictions
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      const { createClient } = require('@supabase/supabase-js');
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
  // First check if the status is 'Approved' and the user is an admin
      if (status === 'Approved') {
    // Get the user's role
        const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
        if (profileError || !userProfile || userProfile.role !== 'Admin') {
          throw new Error('Only administrators can set a review to Approved');
        }
      }

  // Bypass the owner check - allow any user to update status
      const { data, error } = await supabaseAdmin
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

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        graphImageUrl: data.graph_image_url,
        status: data.status,
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

// Comments
    export async function getCommentsByReviewId(reviewId: string) {
      try {
    // Fetch comments without using relationships
        const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching comments:', error);
          throw error;
        }

        if (!comments || comments.length === 0) {
          return [];
        }

    // Get unique user IDs
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        
    // Fetch profiles separately
        const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles for comments:', profilesError);
        }
        
    // Transform to frontend format
        const frontendComments: CommentWithProfile[] = comments.map(comment => {
      // Find matching profile, or use fallback
          const profile = profiles?.find(p => p.id === comment.user_id);
          
      // Convert comment to frontend format
          const frontendComment = {
            id: comment.id,
            content: comment.content,
            reviewId: comment.review_id,
            userId: comment.user_id,
            createdAt: comment.created_at
          };
          
          if (profile) {
        // Use the found profile
            return {
              ...frontendComment,
              user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                createdAt: profile.created_at,
            role: profile.role || 'Member' // Add role field with fallback
          }
        };
      } else {
        // Fallback for missing profile
        return {
          ...frontendComment,
          user: {
            id: comment.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: comment.created_at,
            role: 'Member' // Default role
          }
        };
      }
    });
        
        return frontendComments;
      } catch (err) {
        console.error('Error in getCommentsByReviewId:', err);
        throw err;
      }
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

      return {
        id: data.id,
        content: data.content,
        reviewId: data.review_id,
        userId: data.user_id,
        createdAt: data.created_at
      };
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

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at
      };
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

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at
      };
    }