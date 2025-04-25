// pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../../../lib/emailService';
import { getReviewById } from '../../../lib/supabaseUtils';

// Create a Supabase admin client that can bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Regular client for user authentication
const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from request
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No valid authorization header provided');
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized - No valid authorization header provided' 
    });
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify the token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Invalid token' 
      });
    }

    // GET /api/comments?reviewId=[reviewId]
    if (req.method === 'GET') {
      const { reviewId } = req.query;
      
      if (!reviewId || typeof reviewId !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Review ID is required' 
        });
      }
      
      console.log('Fetching comments for review:', reviewId);
      
      // Use admin client to bypass RLS
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('review_id', reviewId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching comments', 
          error: error.message 
        });
      }
      
      console.log(`Successfully fetched ${data.length} comments`);
      
      return res.status(200).json({
        success: true,
        data
      });
    }
    
    // POST /api/comments
    if (req.method === 'POST') {
      const { content, reviewId } = req.body;
      
      if (!content || !reviewId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Content and review ID are required' 
        });
      }
      
      console.log('Adding new comment for review:', reviewId);
      
      // Ensure user profile exists before creating comment
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, role')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile) {
        console.error('User profile not found, attempting to create it');
        
        // Create profile if it doesn't exist using admin client
        const { error: createProfileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            created_at: new Date().toISOString()
          });
          
        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to create user profile',
            error: createProfileError.message
          });
        }
      }
      
      // Create the comment using admin client to bypass RLS
      const { data: newComment, error } = await supabaseAdmin
        .from('comments')
        .insert({
          content,
          review_id: reviewId,
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error creating comment', 
          error: error.message 
        });
      }
      
      console.log('Comment created successfully with ID:', newComment.id);
      
      // Send email notification
      try {
        const review = await getReviewById(reviewId);
        
        if (review && review.user.email) {
          // Skip sending notification if the comment author is the review owner
          if (review.userId === user.id) {
            console.log('Skipping notification as comment author is review owner');
          } else {
            // Get the commenter's name
            const commenterName = profile?.name || 
                                  user.user_metadata?.name || 
                                  user.email?.split('@')[0] || 
                                  'A user';
            
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
      
      return res.status(201).json({
        success: true,
        data: newComment
      });
    }
    
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  } catch (error: any) {
    console.error('Unexpected error in comments API:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}