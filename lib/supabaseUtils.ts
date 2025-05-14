// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Review, Comment, Profile, ReviewWithProfile, CommentWithProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile,
  dbToFrontendReviewWithProfile, dbToFrontendCommentWithProfile,
  Role, Task
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
        comments:comments!left (
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
    project_lead_id: reviewData.projectLeadId
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

      // Create activity record for the new review
      const { error: activityError } = await client
        .from('activities')
        .insert({
          type: 'review_created',
          user_id: reviewData.userId,
          review_id: newReview.id
        });

      if (activityError) {
        console.error('Error creating activity record:', activityError);
        // Don't throw error here, as the review was created successfully
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
 * @param client The Supabase client instance scoped to the authenticated user
 * @returns The created comment
 */
export async function createComment(
  commentData: Omit<Comment, 'id' | 'createdAt'>,
  client: SupabaseClient
) {
  if (!client || typeof client.from !== 'function') {
    console.error('[createComment] Invalid client object received!');
    throw new Error('Internal server error: Invalid database client provided.');
  }

  // Convert the camelCase to snake_case for the database
  const dbCommentData = {
    content: commentData.content,
    review_id: commentData.reviewId,
    user_id: commentData.userId,
    created_at: new Date().toISOString()
  };
  
  try {
    // Create the comment
    const { data: comment, error: commentError } = await client
      .from('comments')
      .insert(dbCommentData)
      .select()
      .single();

    if (commentError) {
      console.error('[createComment] Error creating comment:', commentError);
      throw commentError;
    }

    // Get the review title for the activity description
    const { data: review, error: reviewError } = await client
      .from('reviews')
      .select('title')
      .eq('id', commentData.reviewId)
      .single();

    if (reviewError) {
      console.error('[createComment] Error fetching review:', reviewError);
      // Don't throw error here, as the comment was created successfully
    }

    // Create activity record
    const { error: activityError } = await client
      .from('activities')
      .insert({
        type: 'comment_added',
        review_id: commentData.reviewId,
        user_id: commentData.userId,
        metadata: {
          review_title: review?.title || commentData.reviewId,
          content: commentData.content
        },
        created_at: new Date().toISOString()
      });

    if (activityError) {
      console.error('[createComment] Error creating activity:', activityError);
      // Don't throw error here, as the comment was created successfully
    }

    return dbToFrontendComment(comment);
  } catch (error) {
    console.error('[createComment] Error:', error);
    throw error;
  }
}

/**
 * Update a review's status - using service role to bypass RLS
 * 
 * @param id The review ID
 * @param status The new status
 * @param userId The ID of the user making the update
 * @param archived Optional boolean to set the archived status
 * @returns The updated review
 */
export async function updateReviewStatus(
  id: string, 
  status: Review['status'], 
  userId: string,
  archived?: boolean
) {
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

  // Prepare update data
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  // Add archived status if provided
  if (typeof archived === 'boolean') {
    updateData.archived = archived;
  }

  // OPTIMIZED: Update the review status and return the updated data in one operation
  const { data, error } = await supabase
    .from('reviews')
    .update(updateData)
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
 * @param currentReviewId Optional current review ID to exclude from duplicate check
 * @returns Validated Kantata project information
 */
export async function validateKantataProject(kantataProjectId: string, currentReviewId?: string) {
  try {
    // First check if we already have a review with this Kantata ID, excluding the current review if provided
    let query = supabase
      .from('reviews')
      .select('id, title, status')
      .eq('kantata_project_id', kantataProjectId);

    if (currentReviewId) {
      query = query.neq('id', currentReviewId);
    }

    const { data: existingReview, error: reviewError } = await query.single();

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

/**
 * Get tasks for a review with optimized query
 * 
 * @param reviewId The review ID to get tasks for
 * @returns Array of tasks with user profile data
 */
export const getTasksByReviewId = async (reviewId: string) => {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assigned_to_user:profiles!tasks_assigned_to_fkey (
        id,
        name,
        email,
        created_at,
        role
      ),
      created_by_user:profiles!tasks_created_by_fkey (
        id,
        name,
        email,
        created_at,
        role
      )
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Transform to frontend format
  return tasks.map(task => ({
    id: task.id,
    reviewId: task.review_id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignedTo: task.assigned_to,
    createdBy: task.created_by,
    dueDate: task.due_date,
    completedAt: task.completed_at,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    assignedToUser: task.assigned_to_user ? {
      id: task.assigned_to_user.id,
      name: task.assigned_to_user.name || 'Unknown User',
      email: task.assigned_to_user.email || '',
      createdAt: task.assigned_to_user.created_at,
      role: task.assigned_to_user.role || 'Member'
    } : undefined,
    createdByUser: {
      id: task.created_by_user.id,
      name: task.created_by_user.name || 'Unknown User',
      email: task.created_by_user.email || '',
      createdAt: task.created_by_user.created_at,
      role: task.created_by_user.role || 'Member'
    }
  }));
};

/**
 * Create a new task
 * 
 * @param taskData The task data to create
 * @param client The Supabase client instance scoped to the authenticated user
 * @returns The created task
 */
export async function createTask(
  taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>,
  client: SupabaseClient
) {
  if (!client || typeof client.from !== 'function') {
    console.error('[createTask] Invalid client object received!');
    throw new Error('Internal server error: Invalid database client provided.');
  }

  // Convert the camelCase to snake_case for the database
  const dbTaskData = {
    review_id: taskData.reviewId,
    title: taskData.title,
    description: taskData.description,
    status: taskData.status,
    assigned_to: taskData.assignedTo,
    created_by: taskData.createdBy,
    due_date: taskData.dueDate,
    completed_at: taskData.completedAt
  };

  try {
    // Create the task
    const { data: task, error: taskError } = await client
      .from('tasks')
      .insert(dbTaskData)
      .select(`
        *,
        assigned_to_user:profiles!tasks_assigned_to_fkey (
          id,
          name,
          email,
          created_at,
          role
        ),
        created_by_user:profiles!tasks_created_by_fkey (
          id,
          name,
          email,
          created_at,
          role
        )
      `)
      .single();

    if (taskError) {
      console.error('[createTask] Error creating task:', taskError);
      throw taskError;
    }

    // Transform to frontend format
    return {
      id: task.id,
      reviewId: task.review_id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      assignedToUser: task.assigned_to_user ? {
        id: task.assigned_to_user.id,
        name: task.assigned_to_user.name || 'Unknown User',
        email: task.assigned_to_user.email || '',
        createdAt: task.assigned_to_user.created_at,
        role: task.assigned_to_user.role || 'Member'
      } : undefined,
      createdByUser: {
        id: task.created_by_user.id,
        name: task.created_by_user.name || 'Unknown User',
        email: task.created_by_user.email || '',
        createdAt: task.created_by_user.created_at,
        role: task.created_by_user.role || 'Member'
      }
    };
  } catch (error) {
    console.error('[createTask] Error:', error);
    throw error;
  }
}

/**
 * Update a task
 * 
 * @param taskId The ID of the task to update
 * @param updates The updates to apply
 * @param client The Supabase client instance scoped to the authenticated user
 * @returns The updated task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>,
  client: SupabaseClient
) {
  if (!client || typeof client.from !== 'function') {
    console.error('[updateTask] Invalid client object received!');
    throw new Error('Internal server error: Invalid database client provided.');
  }

  // Convert the camelCase to snake_case for the database
  const dbUpdates = {
    title: updates.title,
    description: updates.description,
    status: updates.status,
    assigned_to: updates.assignedTo,
    due_date: updates.dueDate,
    completed_at: updates.completedAt
  };

  try {
    // Update the task
    const { data: task, error: taskError } = await client
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select(`
        *,
        assigned_to_user:profiles!tasks_assigned_to_fkey (
          id,
          name,
          email,
          created_at,
          role
        ),
        created_by_user:profiles!tasks_created_by_fkey (
          id,
          name,
          email,
          created_at,
          role
        )
      `)
      .single();

    if (taskError) {
      console.error('[updateTask] Error updating task:', taskError);
      throw taskError;
    }

    // Transform to frontend format
    return {
      id: task.id,
      reviewId: task.review_id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignedTo: task.assigned_to,
      createdBy: task.created_by,
      dueDate: task.due_date,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      assignedToUser: task.assigned_to_user ? {
        id: task.assigned_to_user.id,
        name: task.assigned_to_user.name || 'Unknown User',
        email: task.assigned_to_user.email || '',
        createdAt: task.assigned_to_user.created_at,
        role: task.assigned_to_user.role || 'Member'
      } : undefined,
      createdByUser: {
        id: task.created_by_user.id,
        name: task.created_by_user.name || 'Unknown User',
        email: task.created_by_user.email || '',
        createdAt: task.created_by_user.created_at,
        role: task.created_by_user.role || 'Member'
      }
    };
  } catch (error) {
    console.error('[updateTask] Error:', error);
    throw error;
  }
}

/**
 * Delete a task
 * 
 * @param taskId The ID of the task to delete
 * @param client The Supabase client instance scoped to the authenticated user
 */
export async function deleteTask(taskId: string, client: SupabaseClient) {
  if (!client || typeof client.from !== 'function') {
    console.error('[deleteTask] Invalid client object received!');
    throw new Error('Internal server error: Invalid database client provided.');
  }

  try {
    // Delete the task
    const { error: deleteError } = await client
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (deleteError) {
      console.error('[deleteTask] Error deleting task:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('[deleteTask] Error:', error);
    throw error;
  }
}