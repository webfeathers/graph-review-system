import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/apiHelpers';
import { SupabaseClient } from '@supabase/supabase-js';
import { Role } from '@/types/supabase';
import { EmailService } from '@/lib/emailService';
import { APP_URL } from '../../../lib/env';

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
  const { method } = req;

  try {
    switch (method) {
      case 'GET': {
        const { reviewId } = req.query;

        if (!reviewId || typeof reviewId !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Review ID is required'
          });
        }

        const { data: tasks, error } = await supabaseClient
          .from('tasks')
          .select(`
            *,
            assignedToUser:assigned_to (
              id,
              name,
              email,
              created_at,
              role
            ),
            createdByUser:created_by (
              id,
              name,
              email,
              created_at,
              role
            )
          `)
          .eq('review_id', reviewId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching tasks:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch tasks',
            error: error.message
          });
        }

        // Transform the data to match the frontend format
        const transformedTasks = tasks.map(task => ({
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
          priority: task.priority,
          assignedToUser: task.assignedToUser ? {
            id: task.assignedToUser.id,
            name: task.assignedToUser.name,
            email: task.assignedToUser.email,
            createdAt: task.assignedToUser.created_at,
            role: task.assignedToUser.role
          } : undefined,
          createdByUser: {
            id: task.createdByUser.id,
            name: task.createdByUser.name,
            email: task.createdByUser.email,
            createdAt: task.createdByUser.created_at,
            role: task.createdByUser.role
          }
        }));

        return res.status(200).json({
          success: true,
          data: transformedTasks
        });
      }

      case 'POST': {
        const { reviewId, title, description, assignedTo, dueDate, priority } = req.body;

        if (!reviewId || !title) {
          return res.status(400).json({
            success: false,
            message: 'Review ID and title are required'
          });
        }

        const { data: task, error } = await supabaseClient
          .from('tasks')
          .insert({
            review_id: reviewId,
            title: title.trim(),
            description: description?.trim(),
            status: 'pending',
            assigned_to: assignedTo,
            created_by: userId,
            due_date: dueDate,
            priority: priority || 'medium'
          })
          .select(`
            *,
            assignedToUser:assigned_to (
              id,
              name,
              email,
              created_at,
              role
            ),
            createdByUser:created_by (
              id,
              name,
              email,
              created_at,
              role
            )
          `)
          .single();

        if (error) {
          console.error('Error creating task:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to create task',
            error: error.message
          });
        }

        // Transform the data to match the frontend format
        const transformedTask = {
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
          priority: task.priority,
          assignedToUser: task.assignedToUser ? {
            id: task.assignedToUser.id,
            name: task.assignedToUser.name,
            email: task.assignedToUser.email,
            createdAt: task.assignedToUser.created_at,
            role: task.assignedToUser.role
          } : undefined,
          createdByUser: {
            id: task.createdByUser.id,
            name: task.createdByUser.name,
            email: task.createdByUser.email,
            createdAt: task.createdByUser.created_at,
            role: task.createdByUser.role
          }
        };

        // Send email notification to the project lead if assigned
        if (task.assignedToUser) {
          await EmailService.sendTaskAssignedNotification(
            task.id,
            task.title,
            task.assignedToUser.email,
            task.assignedToUser.name,
            APP_URL,
            task.review_id
          );
        }

        return res.status(201).json({
          success: true,
          data: transformedTask
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