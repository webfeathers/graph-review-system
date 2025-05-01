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

// Define types for the database objects
interface DbComment {
  id: string;
  content: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

interface DbProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: string;
}

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
      
      // First, get all comments for the review
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });
        
      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching comments', 
          error: 'Database query failed' 
        });
      }
      
      if (!comments || comments.length === 0) {
        return res.status(200).json({
          success: true,
          data: []
        });
      }
      
      // Now fetch the associated user profiles
      const userIds = comments.map((comment: DbComment) => comment.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching user profiles', 
          error: 'Database query failed' 
        });
      }
      
      // Create a map of user profiles for quick lookup
      const profileMap = (profiles || []).reduce((map: Record<string, DbProfile>, profile: DbProfile) => {
        map[profile.id] = profile;
        return map;
      }, {});
      
      // Transform the data to the expected format
      const formattedComments = comments.map((comment: DbComment) => {
        const profile = profileMap[comment.user_id] || {
          id: comment.user_id,
          name: 'Unknown User',
          email: '',
          created_at: comment.created_at,
          role: 'Member'
        };
        
        return {
          id: comment.id,
          content: comment.content,
          reviewId: comment.review_id,
          userId: comment.user_id,
          createdAt: comment.created_at,
          user: {
            id: profile.id,
            name: profile.name || 'Unknown User',
            email: profile.email || '',
            createdAt: profile.created_at,
            role: profile.role || 'Member'
          }
        };
      });
      
      console.log(`Successfully fetched ${formattedComments.length} comments`);
      
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
        .select();

      if (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error creating comment', 
          error: 'Database operation failed' 
        });
      }
      
      if (!newComment || newComment.length === 0) {
        console.error('No comment data returned after insert');
        return res.status(500).json({
          success: false,
          message: 'Error creating comment: No data returned'
        });
      }
      
      const comment = newComment[0] as DbComment;
      console.log('Comment created successfully with ID:', comment.id);
      
      // Get the user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Continue with limited user info
      }
      
      // Send email notification
      try {
        const review = await getReviewById(reviewId);
        
        if (review && review.user.email) {
          // Skip sending notification if the comment author is the review owner
          if (review.userId === userId) {
            console.log('Skipping notification as comment author is review owner');
          } else {
            // Get the commenter's name
            const commenterName = profile ? (profile.name || 'A user') : 'A user';
            
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
            id: userId,
            name: 'User',
            email: '',
            createdAt: new Date().toISOString(),
            role: 'Member'
          }
        }
      });
    } catch (error) {
      console.error('Unexpected error creating comment:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
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