// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Review, Comment, Profile, ReviewWithProfile, CommentWithProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile,
  dbToFrontendReviewWithProfile, dbToFrontendCommentWithProfile,
  Role
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
        user:profiles!fk_reviews_user (
          id,
          name,
          email,
          created_at,
          role
        ),
        projectLead:profiles!fk_project_lead (
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
      // Extract profiles from the join result with proper type checking
      const userProfile = review.user;
      const projectLeadProfile = review.projectLead;
      
      // Convert review to frontend format
      const frontendReview: Review = {
        id: review.id,
        title: review.title,
        description: review.description,
        status: review.status,
        userId: review.user_id,
        createdAt: review.created_at || new Date().toISOString(),
        updatedAt: review.updated_at || new Date().toISOString(),
        accountName: review.account_name,
        orgId: review.org_id,
        kantataProjectId: review.kantata_project_id,
        segment: review.segment as 'Enterprise' | 'MidMarket',
        remoteAccess: review.remote_access,
        graphName: review.graph_name,
        useCase: review.use_case,
        customerFolder: review.customer_folder,
        handoffLink: review.handoff_link,
        projectLeadId: review.project_lead_id
      };
      
      // Construct the review with profile
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
    });
    
    return frontendReviews;
  } catch (err) {
    console.error('Unexpected error in getReviews:', err);
    return []; // Return empty array on any error
  }
}

/**
 * Get a single review by ID with optimized caching and batch operations
 * 
 * @param id The review ID
 * @returns The review with user profile data
 */
export async function getReviewById(id: string) {
  try {
    // Use a single query with proper joins now that foreign keys are set up
    const { data: review, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:profiles!fk_reviews_user (
          id,
          name,
          email,
          created_at,
          role
        ),
        projectLead:profiles!fk_project_lead (
          id,
          name,
          email,
          created_at,
          role
        ),
        comments:comments!inner (
          id,
          content,
          created_at,
          user_id,
          user:profiles!fk_comments_user (
            id,
            name,
            email,
            created_at,
            role
          )
        )
      `)
      .eq('id', id)
      .order('created_at', { foreignTable: 'comments', ascending: true })
      .single();

    if (error) {
      console.error('Error fetching review:', error);
      throw error;
    }

    if (!review) {
      throw new Error('Review not found');
    }

    // Transform to frontend format with proper type checking
    const frontendReview: ReviewWithProfile = {
      id: review.id,
      title: review.title,
      description: review.description,
      status: review.status,
      userId: review.user_id,
      createdAt: review.created_at || new Date().toISOString(),
      updatedAt: review.updated_at || new Date().toISOString(),
      accountName: review.account_name,
      orgId: review.org_id,
      kantataProjectId: review.kantata_project_id,
      segment: review.segment,
      remoteAccess: review.remote_access,
      graphName: review.graph_name,
      useCase: review.use_case,
      customerFolder: review.customer_folder,
      handoffLink: review.handoff_link,
      projectLeadId: review.project_lead_id,
      // Add user profile with proper null checks
      user: review.user ? {
        id: review.user.id,
        name: review.user.name || 'Unknown User',
        email: review.user.email || '',
        createdAt: review.user.created_at,
        role: review.user.role || 'Member'
      } : {
        id: review.user_id,
        name: 'Unknown User',
        email: '',
        createdAt: review.created_at,
        role: 'Member'
      }
    };

    // Add project lead if available
    if (review.projectLead) {
      frontendReview.projectLead = {
        id: review.projectLead.id,
        name: review.projectLead.name || 'Unknown User',
        email: review.projectLead.email || '',
        createdAt: review.projectLead.created_at,
        role: review.projectLead.role || 'Member'
      };
    }

    // Add comments if available
    if (review.comments) {
      frontendReview.comments = review.comments.map((comment: {
        id: string;
        content: string;
        created_at: string;
        user_id: string;
        user?: {
          id: string;
          name: string;
          email: string;
          created_at: string;
          role: Role;
        };
      }) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        userId: comment.user_id,
        reviewId: id,
        user: comment.user ? {
          id: comment.user.id,
          name: comment.user.name || 'Unknown User',
          email: comment.user.email || '',
          createdAt: comment.user.created_at,
          role: comment.user.role || 'Member'
        } : {
          id: comment.user_id,
          name: 'Unknown User',
          email: '',
          createdAt: comment.created_at,
          role: 'Member'
        }
      }));
    }

    return frontendReview;
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
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!fk_comments_user (
        id,
        name,
        email,
        created_at,
        role
      )
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return comments as CommentWithProfile[];
};

/**
 * Create a new review
 * 
 * @param reviewData Data for the new review
 * @param client The Supabase client instance scoped to the authenticated user
 * @returns The newly created review
 */
export async function createReview(
  reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>,
  client: SupabaseClient
) {
  console.log('Creating review with data:', reviewData);
  console.log('[createReview] Received client:', typeof client, Object.keys(client || {}));
  
  if (!client || typeof client.from !== 'function') {
     console.error('[createReview] Invalid client object received!');
     throw new Error('Internal server error: Invalid database client provided.');
  }

  // Convert the camelCase to snake_case for the database
  const dbReviewData = {
    title: reviewData.title,
    description: reviewData.description,
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
    graph_image_url: reviewData.graphImageUrl
  };

  // Use the PASSED-IN, request-scoped client for the insert operation
  try {
      const { data: newReview, error: createError } = await client
        .from('reviews')
        .insert(dbReviewData)
        .select('*')
        .single();
        
      if (createError) {
        console.error('Error creating review:', createError);
        if (createError.message.includes('violates row-level security policy')) {
          throw new Error('Permission denied: Cannot create review due to security policy.');
        }
        throw new Error(`Failed to create review: ${createError.message}`);
      }

      if (!newReview) {
        throw new Error('Review creation failed - no data returned');
      }
      
      return dbToFrontendReview(newReview);
      
  } catch (error) {
     console.error('[createReview] Error during client.from/insert/select:', error);
     throw error; 
  }
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

/**
 * Update project lead for a review with optimized batch operations
 * @param reviewId The ID of the review to update
 * @param newLeadId The ID of the new project lead
 * @param userRole The role of the user making the update
 * @returns The updated review with project lead information
 */
export async function updateProjectLead(reviewId: string, newLeadId: string, userRole: string) {
  try {
    // Validate admin permission first
    if (userRole !== 'Admin') {
      throw new Error('Only administrators can change the Project Lead');
    }

    // Start a Supabase transaction
    const { data: result, error: transactionError } = await supabase.rpc('update_project_lead', {
      p_review_id: reviewId,
      p_new_lead_id: newLeadId,
      p_user_role: userRole
    });

    if (transactionError) {
      throw new Error(`Failed to update project lead: ${transactionError.message}`);
    }

    // Get the updated review with all related data in a single query
    const { data: updatedReview, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          role,
          created_at
        ),
        project_lead:project_lead_id (
          id,
          name,
          email,
          role,
          created_at
        )
      `)
      .eq('id', reviewId)
      .single();

    if (fetchError || !updatedReview) {
      throw new Error(`Failed to fetch updated review: ${fetchError?.message || 'Review not found'}`);
    }

    // Transform the data to the expected format
    return {
      id: updatedReview.id,
      title: updatedReview.title,
      description: updatedReview.description,
      status: updatedReview.status,
      userId: updatedReview.user_id,
      createdAt: updatedReview.created_at,
      updatedAt: updatedReview.updated_at,
      accountName: updatedReview.account_name,
      orgId: updatedReview.org_id,
      kantataProjectId: updatedReview.kantata_project_id,
      segment: updatedReview.segment,
      remoteAccess: updatedReview.remote_access,
      graphName: updatedReview.graph_name,
      useCase: updatedReview.use_case,
      customerFolder: updatedReview.customer_folder,
      handoffLink: updatedReview.handoff_link,
      projectLeadId: updatedReview.project_lead_id,
      user: updatedReview.profiles ? {
        id: updatedReview.profiles.id,
        name: updatedReview.profiles.name || 'Unknown User',
        email: updatedReview.profiles.email || '',
        createdAt: updatedReview.profiles.created_at,
        role: updatedReview.profiles.role || 'Member'
      } : null,
      projectLead: updatedReview.project_lead ? {
        id: updatedReview.project_lead.id,
        name: updatedReview.project_lead.name || 'Unknown User',
        email: updatedReview.project_lead.email || '',
        createdAt: updatedReview.project_lead.created_at,
        role: updatedReview.project_lead.role || 'Member'
      } : null
    };
  } catch (error) {
    console.error('Error in updateProjectLead:', error);
    throw error;
  }
}

/**
 * Validate and cache Kantata Project ID with optimized caching
 * @param kantataProjectId The Kantata project ID to validate
 * @returns Validated Kantata project information
 */
export async function validateKantataProject(kantataProjectId: string) {
  try {
    // First check if we already have a review with this Kantata ID
    const { data: existingReview, error: reviewError } = await supabase
      .from('reviews')
      .select('id, title, status')
      .eq('kantata_project_id', kantataProjectId)
      .single();

    if (existingReview) {
      return {
        isValid: false,
        message: `A review already exists for this Kantata project (Review ID: ${existingReview.id})`,
        existingReview
      };
    }

    // Check cache first
    const { data: cachedProject, error: cacheError } = await supabase
      .from('kantata_project_cache')
      .select('*')
      .eq('project_id', kantataProjectId)
      .single();

    // If we have a recent cache (less than 1 hour old), use it
    if (cachedProject && !cacheError) {
      const cacheAge = Date.now() - new Date(cachedProject.updated_at).getTime();
      const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

      if (cacheAge < CACHE_TTL) {
        return {
          isValid: true,
          message: 'Project validated from cache',
          projectData: {
            id: kantataProjectId,
            title: cachedProject.title,
            status: cachedProject.status,
            leadId: cachedProject.lead_id
          }
        };
      }
    }

    // Get Kantata API token from environment
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    if (!kantataApiToken) {
      throw new Error('Kantata API token not configured');
    }

    // Validate project exists in Kantata
    const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}`;
    const response = await fetch(kantataApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          isValid: false,
          message: 'Project not found in Kantata'
        };
      }
      throw new Error(`Kantata API error: ${response.status} ${response.statusText}`);
    }

    const projectData = await response.json();
    const workspace = projectData.workspaces?.[kantataProjectId];

    if (!workspace) {
      return {
        isValid: false,
        message: 'Invalid project data from Kantata'
      };
    }

    // Cache the project data with upsert
    const { error: upsertError } = await supabase
      .from('kantata_project_cache')
      .upsert({
        project_id: kantataProjectId,
        title: workspace.title,
        status: workspace.status,
        lead_id: workspace.lead_id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      });

    if (upsertError) {
      console.error('Error caching Kantata project data:', upsertError);
      // Don't throw error, just log it
    }

    return {
      isValid: true,
      message: 'Project validated successfully',
      projectData: {
        id: kantataProjectId,
        title: workspace.title,
        status: workspace.status,
        leadId: workspace.lead_id
      }
    };
  } catch (error) {
    console.error('Error validating Kantata project:', error);
    throw error;
  }
}