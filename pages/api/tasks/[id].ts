import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/apiHelpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Role } from '@/types/supabase';

type ResponseData = {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  const { id } = req.query;
  const { method } = req;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID'
    });
  }

  try {
    switch (method) {
      case 'PATCH': {
        const { status, completedAt } = req.body;

        // Validate status
        if (!status) {
          return res.status(400).json({
            success: false,
            message: 'Status is required'
          });
        }

        // Validate that status is one of the allowed values
        const validStatuses = ['pending', 'in_progress', 'completed'] as const;
        if (!validStatuses.includes(status as any)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
          });
        }

        // Get the task to check permissions
        const { data: task, error: fetchError } = await supabaseClient
          .from('tasks')
          .select('created_by, assigned_to, status')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching task:', fetchError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch task',
            error: fetchError.message
          });
        }

        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Task not found'
          });
        }

        // Check if user has permission to update the task
        if (task.created_by !== userId && task.assigned_to !== userId && userRole !== 'Admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to update this task'
          });
        }

        // Update the task
        const { data: updatedTask, error: updateError } = await supabaseClient
          .from('tasks')
          .update({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating task:', updateError);
          return res.status(500).json({
            success: false,
            message: 'Failed to update task',
            error: updateError.message
          });
        }

        // Fetch assigned user profile
        const { data: assignedToUser } = await supabaseClient
          .from('profiles')
          .select('id, name, email, created_at, role')
          .eq('id', updatedTask.assigned_to)
          .single();

        // Fetch creator user profile
        const { data: createdByUser } = await supabaseClient
          .from('profiles')
          .select('id, name, email, created_at, role')
          .eq('id', updatedTask.created_by)
          .single();

        // Create activity record for the status update
        const { error: activityError } = await supabaseClient
          .from('activities')
          .insert({
            type: 'task_updated',
            review_id: updatedTask.review_id,
            task_id: updatedTask.id,
            user_id: userId,
            metadata: {
              title: updatedTask.title,
              old_status: task.status,
              new_status: status
            },
            created_at: new Date().toISOString()
          });

        if (activityError) {
          console.error('Error creating activity record:', activityError);
          // Don't throw error here, as the task was updated successfully
        }

        // Transform the data to match the frontend format
        const transformedTask = {
          id: updatedTask.id,
          reviewId: updatedTask.review_id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          assignedTo: updatedTask.assigned_to,
          createdBy: updatedTask.created_by,
          dueDate: updatedTask.due_date,
          completedAt: updatedTask.completed_at,
          createdAt: updatedTask.created_at,
          updatedAt: updatedTask.updated_at,
          priority: updatedTask.priority,
          assignedToUser: assignedToUser,
          createdByUser: createdByUser
        };

        return res.status(200).json({
          success: true,
          data: transformedTask
        });
      }

      case 'DELETE': {
        // Get the task to check permissions
        const { data: task, error: fetchError } = await supabaseClient
          .from('tasks')
          .select('created_by')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('Error fetching task:', fetchError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch task',
            error: fetchError.message
          });
        }

        if (!task) {
          return res.status(404).json({
            success: false,
            message: 'Task not found'
          });
        }

        // Check if user has permission to delete the task
        if (task.created_by !== userId && userRole !== 'Admin') {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this task'
          });
        }

        // Delete the task
        const { error: deleteError } = await supabaseClient
          .from('tasks')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting task:', deleteError);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete task',
            error: deleteError.message
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Task deleted successfully'
        });
      }

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Error in tasks API:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAuth(handler); 