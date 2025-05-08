import { supabase } from './supabase';

interface CreateActivityParams {
  type: 'review' | 'comment' | 'project' | 'user';
  action: string;
  description: string;
  userId: string;
  link?: string;
  reviewId?: string;
  projectId?: string;
  reviewTitle?: string;
}

/**
 * Creates an activity record in the database.
 * This function is used to track various actions in the system.
 * 
 * @param params - The activity parameters
 * @returns The created activity record
 * 
 * @example
 * ```typescript
 * await createActivity({
 *   type: 'review',
 *   action: 'created',
 *   description: 'New Graph Review',
 *   userId: 'user123',
 *   link: '/reviews/123',
 *   reviewId: 'review123',
 *   reviewTitle: 'Project X Review'
 * });
 * ```
 */
export const createActivity = async (params: CreateActivityParams) => {
  const description = params.reviewTitle 
    ? `${params.description}: ${params.reviewTitle}`
    : params.description;

  const { data, error } = await supabase
    .from('activities')
    .insert({
      type: params.type,
      action: params.action,
      description: description,
      user_id: params.userId,
      link: params.link,
      review_id: params.reviewId,
      project_id: params.projectId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating activity:', error);
    throw error;
  }

  return data;
}; 