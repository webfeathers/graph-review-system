// pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { EmailService } from '../../../lib/emailService';
import { getReviewById } from '../../../lib/supabaseUtils';
import { Role } from '../../../types/supabase';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
};

/**
 * API handler for comments
 */
async function commentHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  userRole?: Role
) {
  // GET /api/comments?reviewId=[reviewId]
  if (req.method === 'GET') {
    try {
      const { reviewId } = req.query;
      
      if (!reviewId || typeof reviewId !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Review ID is required' 
        });
      }
      
      console.log('Fetching comments for review:', reviewId);
      
      // Use Supabase's join functionality to get comments with user profiles
      const { data: comments, error } = await supabase
        .from('comments')
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
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching comments', 
          error: 'Database query failed' 
        });
      }
      
      console.log(`Successfully fetched ${comments?.length || 0} comments`);
      
      // Transform the data to the expected format
      const formattedComments = comments?.map(comment => ({
        id: comment.id,
        content: comment.content,
        reviewId: comment.review_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        user: comment.profiles ? {
          id: comment.profiles.id,
          name: comment.profiles.name || 'Unknown User',
          email: comment.profiles.email || '',
          createdAt: comment.profiles.created_at,
          role: comment.profiles.role || 'Member'
        } : {
          id: comment.user_id,
          name: 'Unknown User',
          email: '',
          createdAt: comment.created_at,
          role: 'Member'
        }
      })) || [];
      
      return res.status(200).json({
        success: true,
        data: formattedComments
      });
    } catch (error) {
      console.error('Unexpected error fetching comments:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'An unexpected error occurred'
      });
    }
  }
  
  // POST /api/comments
  if (req.method === 'POST') {
    try {
      const { content, reviewId } = req.body;
      
      if (!content || !reviewId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Content and review ID are required' 
        });
      }
      
      console.log('Adding new comment for review:', reviewId);
      
      // Validate content length
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Comment exceeds maximum length of 1000 characters'
        });
      }
      
      // Create the comment
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          content,
          review_id: reviewId,
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error creating comment', 
          error: 'Database operation failed' 
        });
      }
      
      console.log('Comment created successfully with ID:', newComment.id);
      
      // Send email notification
      try {
        const review = await getReviewById(reviewId);
        
        if (review && review.user.email) {
          // Skip sending notification if the comment author is the review owner
          if (review.userId === userId) {
            console.log('Skipping notification as comment author is review owner');
          } else {
            // Get the commenter's name - use current user data from withAuth
            const commenterName = userRole ? 'A user' : 'A user';
            
            // Generate app URL
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                          `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
            
            // Send notification using helper method
            await EmailService.sendCommentNotification(
              reviewId,
              review.title,
              review.user.email,
              review.user.name || 'User',
              content,
              commenterName,
              appUrl
            );
            
            console.log('Comment notification email sent to review author');
          }
        }
      } catch (emailError) {
        // Log but don't fail the request if email sending fails
        console.error('Error sending comment notification email:', emailError);
      }
      
      // Return the newly created comment
      return res.status(201).json({
        success: true,
        data: {
          id: newComment.id,
          content: newComment.content,
          reviewId: newComment.review_id,
          userId: newComment.user_id,
          createdAt: newComment.created_at
        }
      });
    } catch (error) {
      console.error('Unexpected error creating comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: 'An unexpected error occurred'
      });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

// Import Supabase client
import { supabase } from '../../../lib/supabase';

// Wrap with auth middleware
export default withAuth(commentHandler);