// pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { Role } from '../../../types/supabase';

// Response data type
type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  error?: any; // Changed to any to include more error details
};

// Simple handler for comments API
async function commentHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  userRole?: Role
) {
  // POST /api/comments - Create a new comment
  if (req.method === 'POST') {
    try {
      console.log('POST request to /api/comments received');
      
      // Extract data from request body
      const { content, reviewId } = req.body;
      
      // Log request data for debugging
      console.log('Request data:', { content: content?.substring(0, 20) + '...', reviewId, userId });
      
      // Validate required fields
      if (!content || !reviewId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Content and review ID are required' 
        });
      }

      console.log('Authenticated user ID:', userId);
console.log('Creating comment with data:', {
  content: content?.substring(0, 20) + '...',
  review_id: reviewId,
  user_id: userId
});
      
      // Simplified: Just insert the comment without complex validation or email notification
      console.log('Inserting comment into database');
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content,
          review_id: reviewId,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select('*');
      
      // Handle database errors
      if (error) {
        console.error('Database error inserting comment:', error);
        return res.status(500).json({
          success: false,
          message: 'Error creating comment',
          error: error
        });
      }
      
      // Success - return the created comment
      console.log('Comment created successfully:', data);
      return res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: data
      });
      
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Unexpected error in POST /api/comments:', error);
      
      // Return detailed error information
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
    }
  }
  
  // GET /api/comments - Simplified version just for testing
  if (req.method === 'GET') {
    try {
      const { reviewId } = req.query;
      
      if (!reviewId || typeof reviewId !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Review ID is required' 
        });
      }
      
      // Simply get comments without joining with profiles
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching comments', 
          error: error 
        });
      }
      
      return res.status(200).json({
        success: true,
        data: data || []
      });
    } catch (error: any) {
      console.error('Unexpected error in GET /api/comments:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  }
  
  // Handle other methods
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

// Export with authentication middleware
export default withAuth(commentHandler);