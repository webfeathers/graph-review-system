// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { EmailService } from '../../../lib/emailService';
import { FIELD_LIMITS } from '../../../constants';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  kantataUpdate?: {
    success: boolean;
    message: string;
    error?: string;
  } | null;
};

/**
 * Handler for review API operations
 */
async function reviewHandler(
  req: NextApiRequest, 
  res: NextApiResponse<ResponseData>,
  userId: string,
  userRole?: string
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Review ID is required' 
    });
  }

  console.log(`Processing ${req.method} request for review ID: ${id} by user ${userId}`);

  // GET /api/reviews/[id]
  if (req.method === 'GET') {
    try {
      console.log('Fetching review with ID:', id);
      
      // Use a single query with join to get the review and profile
      const { data: review, error } = await supabase
        .from('reviews')
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
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching review:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: 'Database query failed' 
        });
      }
      
      if (!review) {
        console.log('Review not found with ID:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Review not found' 
        });
      }
      
      console.log('Successfully retrieved review');
      
      return res.status(200).json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Unexpected error in GET review:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: 'An unexpected error occurred'
      });
    }
  }
  
  // PUT /api/reviews/[id] - for full review updates
  if (req.method === 'PUT') {
    try {
      console.log('Processing PUT request for full review update');
      
      // Check if the review exists and get the owner
      const { data: review, error: initialFetchError } = await supabase
        .from('reviews')
        .select('user_id, status')
        .eq('id', id)
        .single();
      
      if (initialFetchError) {
        console.error('Error fetching review for update:', initialFetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: 'Database query failed' 
        });
      }
      
      if (!review) {
        console.log('Review not found with ID:', id);
        return res.status(404).json({ 
          success: false, 
          message: 'Review not found' 
        });
      }
      
      // Check authorization - only author or admin can edit
      const isAuthor = review.user_id === userId;
      const isAdmin = userRole === 'Admin';
      
      if (!isAuthor && !isAdmin) {
        console.log('Authorization failed: User is not the author or an admin');
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to edit this review' 
        });
      }
      
      // Extract fields to update from request body
      const { 
        title, 
        description,
        graphImageUrl,
        accountName,
        orgId,
        kantataProjectId,
        segment,
        remoteAccess,
        graphName,
        useCase,
        customerFolder,
        handoffLink
      } = req.body;
      
      // Validate required fields
      if (!title || !description) {
        console.log('Validation failed: Missing required fields');
        return res.status(400).json({ 
          success: false, 
          message: 'Title and description are required' 
        });
      }
      
      // Validate field lengths
      if (title.length > FIELD_LIMITS.TITLE_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Title must be no more than ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`
        });
      }
      
      if (description.length > FIELD_LIMITS.DESCRIPTION_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Description must be no more than ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`
        });
      }
      
      console.log('Received update data:', { 
        title, 
        description, 
        hasGraphImage: !!graphImageUrl,
        accountName,
        orgId,
        kantataProjectId,
        segment,
        remoteAccess,
        graphName,
        useCase,
        customerFolder,
        handoffLink
      });
      
      // Prepare update data with snake_case field names for Supabase
      const updateData = {
        title,
        description,
        graph_image_url: graphImageUrl,
        account_name: accountName,
        org_id: orgId,
        kantata_project_id: kantataProjectId,
        segment,
        remote_access: remoteAccess,
        graph_name: graphName,
        use_case: useCase,
        customer_folder: customerFolder,
        handoff_link: handoffLink,
        updated_at: new Date().toISOString()
      };
      
      console.log('Sending update to database with data');
      
      // Update the review - OPTIMIZED: Single update and fetch operation
      const { data: updateResult, error: updateError } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating review:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update review', 
          error: 'Database update failed' 
        });
      }
      
      console.log('Review updated successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: updateResult
      });
    } catch (error) {
      console.error('Unexpected error in PUT review:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: 'An unexpected error occurred'
      });
    }
  }
  
  // PATCH /api/reviews/[id] - for status updates
    if (req.method === 'PATCH') {
      try {
        console.log('Processing PATCH request for status update');

        // First, fetch the review to check ownership and get previous status
        const { data: review, error: reviewFetchError } = await supabase
          .from('reviews')
          .select('*')
          .eq('id', id)
          .single();

        if (reviewFetchError) {
          console.error('Error fetching review for update:', reviewFetchError);
          return res.status(500).json({ 
            success: false, 
            message: 'Error fetching review', 
            error: 'Database query failed' 
          });
        }

        if (!review) {
          console.log('Review not found with ID:', id);
          return res.status(404).json({ 
            success: false, 
            message: 'Review not found' 
          });
        }

        // Store previous status for notification
        const previousStatus = review.status;

        // Get the status from the request body
        const { status } = req.body;

        // Validate status value
        if (!status || !['Submitted', 'In Review', 'Needs Work', 'Approved'].includes(status)) {
          console.log('Invalid status value provided:', status);
          return res.status(400).json({ 
            success: false, 
            message: 'Invalid status value' 
          });
        }

        // Only allow admin users to set status to 'Approved'
        if (status === 'Approved' && userRole !== 'Admin') {
          console.log('Authorization failed: Admin privileges required for approval');
          return res.status(403).json({ 
            success: false, 
            message: 'Only administrators can approve reviews' 
          });
        }
        
        console.log(`Updating review status to: ${status}`);
        
        // Try direct update through Supabase without using service role
        const { data: updatedReview, error: updateError } = await supabase
          .from('reviews')
          .update({ status })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating review status:', updateError);
          
          // Log detailed error information
          console.error('Error details:', JSON.stringify({
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            message: updateError.message
          }, null, 2));
          
          // Try fallback method using API
          console.log('Trying fallback update method...');

          // Get token for API request
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          
          if (!token) {
            return res.status(500).json({
              success: false,
              message: 'Update failed and could not authenticate for fallback method',
              error: updateError.message
            });
          }
          
          // Call the admin API as a fallback
          const response = await fetch(`/api/admin/update-review-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              reviewId: id,
              status
            })
          });
          
          if (!response.ok) {
            const responseData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
              success: false,
              message: 'All update methods failed',
              error: responseData.message || response.statusText,
              originalError: updateError.message
            });
          }
          
          const responseData = await response.json();
          
          return res.status(200).json({
            success: true,
            message: 'Status updated using fallback method',
            data: responseData.data,
            fallbackUsed: true
          });
        }
        
        if (!updatedReview) {
          console.error('Status update succeeded but review not found in result');
          return res.status(500).json({
            success: false,
            message: 'Update succeeded but could not retrieve the updated review'
          });
        }

        console.log('Review status updated successfully');

        return res.status(200).json({
          success: true,
          data: updatedReview
        });
      } catch (error) {
        console.error('Unexpected error in PATCH review:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    }

      console.log('Review status updated successfully');

      return res.status(200).json({
        success: true,
        data: updatedReview,
        kantataUpdate: kantataUpdateResult
      });
    } catch (error) {
      console.error('Unexpected error in PATCH review:', error);
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

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);