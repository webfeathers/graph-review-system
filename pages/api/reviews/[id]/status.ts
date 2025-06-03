import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/serverAuth';
import { withAuth } from '@/lib/apiHelpers';
import { Role } from '@/types/supabase';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: any,
  userRole?: Role
) {
  const { id } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('Status update request:', {
      id,
      userId,
      userRole,
      body: req.body
    });

    // Check if user is admin or author
    const { data: review, error: reviewError } = await supabaseClient
      .from('reviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (reviewError) {
      console.error('Error fetching review:', reviewError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch review',
        error: reviewError.message
      });
    }

    if (!review) {
      console.error('Review not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    const isAuthor = review.user_id === userId;
    const isAdmin = userRole === 'Admin';

    console.log('Permission check:', {
      isAuthor,
      isAdmin,
      reviewUserId: review.user_id,
      currentUserId: userId
    });

    // Check if user has permission to update to the requested status
    if (!isAdmin) {
      // Non-admin users can only update to Draft or Submitted
      if (req.body.newStatus !== 'Draft' && req.body.newStatus !== 'Submitted') {
        console.error('Permission denied: Non-admin user cannot set status to', req.body.newStatus);
        return res.status(403).json({
          success: false,
          message: 'You can only set the status to Draft or Submitted'
        });
      }
      
      // Only authors can update the status
      if (!isAuthor) {
        console.error('Permission denied: Non-author user cannot update status');
        return res.status(403).json({
          success: false,
          message: 'Only the review author can update the status'
        });
      }
    }

    const { newStatus } = req.body;

    if (!newStatus) {
      console.error('Missing newStatus in request body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'New status is required'
      });
    }

    // Validate that the status is one of the allowed values
    const validStatuses = ['Draft', 'Submitted', 'In Review', 'Needs Work', 'Approved', 'Archived'] as const;
    if (!validStatuses.includes(newStatus as any)) {
      console.error('Invalid status value:', newStatus);
      return res.status(400).json({
        success: false,
        message: `Invalid status value. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Get current review data to check status and required fields
    const { data: currentReview, error: currentReviewError } = await supabaseClient
      .from('reviews')
      .select('status, description, graph_name, account_name, org_id')
      .eq('id', id)
      .single();

    if (currentReviewError) {
      console.error('Error fetching current review:', currentReviewError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch current review data'
      });
    }

    // Only admins can approve or archive reviews
    if ((newStatus === 'Approved' || newStatus === 'Archived') && !isAdmin) {
      console.error('Non-admin attempting to change review status:', {
        userId,
        userRole,
        newStatus
      });
      return res.status(403).json({
        success: false,
        message: 'Only administrators can approve or archive reviews'
      });
    }

    console.log('Attempting status update:', {
      id,
      newStatus,
      userId,
      userRole
    });

    // Update the status using admin client
    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating status:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update status',
        error: updateError.message
      });
    }

    // Create activity record for the status update
    const { error: activityError } = await supabaseAdmin
      .from('activities')
      .insert({
        type: 'review_status_changed',
        action: 'updated status',
        description: `Review status changed from ${currentReview.status} to ${newStatus}`,
        user_id: userId,
        review_id: id,
        link: `/reviews/${id}`,
        metadata: {
          old_status: currentReview.status,
          new_status: newStatus
        }
      });

    if (activityError) {
      console.error('Error creating activity record:', activityError);
      // Don't throw error here, as the status was updated successfully
    }

    console.log('Status updated successfully, fetching updated review');

    // Fetch the updated review with all related data
    const { data, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        user:profiles!fk_reviews_user(id, name, email, created_at, role),
        projectLead:profiles!fk_project_lead(id, name, email, created_at, role),
        comments (
          id,
          content,
          created_at,
          user_id,
          user:profiles!fk_comments_user(id, name, email, created_at, role)
        ),
        templateFileVersions:template_file_versions (
          id,
          fileUrl:file_url,
          uploadedAt:uploaded_at,
          uploadedBy:uploaded_by,
          uploader:profiles!uploaded_by(id, name, email)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated review:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch updated review',
        error: fetchError.message
      });
    }

    console.log('Successfully fetched updated review:', {
      id: data.id,
      status: data.status
    });

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[StatusUpdateAPI] Error:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
      error: error instanceof Error ? error.stack : error
    });
  }
}

export default withAuth(handler); 