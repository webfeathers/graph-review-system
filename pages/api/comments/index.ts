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
    
    // Create the comment directly with supabase
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
        error: error.message 
      });
    }
    
    if (!newComment || newComment.length === 0) {
      console.error('No comment data returned after insert');
      return res.status(500).json({
        success: false,
        message: 'Error creating comment: No data returned'
      });
    }
    
    const comment = newComment[0];
    console.log('Comment created successfully with ID:', comment.id);
    
    // Get the user profile for the response
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Continue anyway with limited user info
    }
    
    // Return the newly created comment with user info
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

// Import Supabase client
import { supabase } from '../../../lib/supabase';

// Wrap with auth middleware
export default withAuth(commentHandler);