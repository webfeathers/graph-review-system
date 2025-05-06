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
  details?: any; // Add this line to include the details property
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
      
      // Start with a simple query without joins to verify basic access
      const { data: basicReview, error: basicError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();
        
      if (basicError) {
        console.error('Error fetching basic review data:', basicError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review - basic query failed', 
          error: basicError.message || 'Database query failed'
          // Removed the details property to match the ResponseData type
        });
      }
      
      // If basic query succeeds, try fetching the user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', basicReview.user_id)
        .single();
        
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // We can still return the basic review without profile
      }
      
      // If project_lead_id exists, try fetching the project lead profile
      let projectLead = null;
      if (basicReview.project_lead_id) {
        const { data: leadProfile, error: leadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', basicReview.project_lead_id)
          .single();
          
        if (leadError) {
          console.error('Error fetching project lead profile:', leadError);
        } else {
          projectLead = leadProfile;
        }
      }
      
      // Manually construct the response with the data we have
      const reviewData = {
        ...basicReview,
        profiles: userProfile || null,
        project_lead: projectLead
      };
      
      return res.status(200).json({
        success: true,
        data: reviewData
      });
      
    } catch (error) {
      console.error('Unexpected error in GET review:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
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
        .select('user_id, status, project_lead_id')
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
        handoffLink,
        projectLeadId // New field for project lead
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
      
      // Check authorization for project lead change
      if (projectLeadId !== undefined && 
          projectLeadId !== review.project_lead_id && 
          !isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can change the Project Lead' 
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
        handoffLink,
        projectLeadId
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
        project_lead_id: projectLeadId, // New field
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
  
  // PATCH /api/reviews/[id] - for status updates and project lead changes
  if (req.method === 'PATCH') {
    try {
      console.log('Processing PATCH request for status update or project lead change');

      // First, fetch the review to check ownership and get previous status
      const { data: review, error: reviewFetchError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            email,
            created_at
          )
        `)
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

      // Get the data from the request body
      const { status, projectLeadId } = req.body;
      
      console.log('PATCH request data:', { userId, userRole, status, projectLeadId });

      // Initialize an object to store the fields to update
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      // Handle status update
      if (status !== undefined) {
        // Validate status value
        if (!['Submitted', 'In Review', 'Needs Work', 'Approved'].includes(status)) {
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
        
        // Add status to the update data
        updateData.status = status;
      }

      // Handle project lead update
      if (projectLeadId !== undefined) {
        // Verify admin status
        const isRoleAdmin = userRole === 'Admin';
        
        // Direct database check for admin role as a fallback
        const { data: adminCheck, error: adminCheckError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
          
        const isDirectAdmin = !adminCheckError && adminCheck && adminCheck.role === 'Admin';
        
        console.log('Admin check for project lead update:', {
          userId,
          providedUserRole: userRole,
          isRoleAdmin,
          isDirectAdmin,
          adminCheckData: adminCheck,
          adminCheckError
        });
        
        // Only allow admin users to change project lead
        if (!isRoleAdmin && !isDirectAdmin) {
          return res.status(403).json({ 
            success: false, 
            message: 'Only administrators can change the Project Lead' 
          });
        }
        
        // User is admin, so update the project lead
        updateData.project_lead_id = projectLeadId;
      }
      
      // If no fields to update (only updated_at), return error
      if (Object.keys(updateData).length <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'No valid fields to update' 
        });
      }
      
      console.log('Updating review with data:', updateData);

      // First verify the review exists
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (checkError || !existingReview) {
        console.error('Error checking review existence:', checkError);
        return res.status(404).json({ 
          success: false, 
          message: 'Review not found',
          error: checkError?.message || 'Review does not exist'
        });
      }

      // Then perform the update without returning
      const { error: updateError } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating review:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating review', 
          error: updateError.message || 'Database update failed' 
        });
      }

      // After successful update, fetch the updated review
      const { data: updatedReview, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !updatedReview) {
        console.error('Error fetching updated review:', fetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching updated review', 
          error: fetchError?.message || 'Could not fetch updated review'
        });
      }

      // Fetch user profile
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', updatedReview.user_id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
      }

      // Fetch project lead profile if it exists
      let projectLeadProfile = null;
      if (updatedReview.project_lead_id) {
        const { data: leadProfile, error: leadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', updatedReview.project_lead_id)
          .single();
          
        if (leadError) {
          console.error('Error fetching project lead profile:', leadError);
        } else if (leadProfile) {
          projectLeadProfile = leadProfile;
        }
      }

      // Construct the complete review object
      const completeReview = {
        ...updatedReview,
        user: userProfile || null,
        project_lead: projectLeadProfile
      };

      // Send email notification if status changed
      if (status !== undefined && previousStatus !== status) {
        try {
          // Get the review owner's email and profile info
          const reviewOwner = userProfile;
          
          // Skip notification if no owner email or missing info
          if (reviewOwner && reviewOwner.email) {
            // Generate app URL
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
              `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

            // Get the name of the person who changed the status
            let changerName = 'A User';
            
            // Don't try to fetch user profile here - we might already have role from withAuth
            if (userRole === 'Admin') {
              changerName = 'An Administrator';
            }

            // Send notification using helper method
            await EmailService.sendStatusChangeNotification(
              id,
              updatedReview.title,
              reviewOwner.email,
              reviewOwner.name || 'User',
              previousStatus,
              status,
              changerName,
              appUrl
            );

            console.log('Status change notification email sent to review author');
          }
        } catch (emailError) {
          // Log but don't fail the request if email sending fails
          console.error('Error sending status change notification email:', emailError);
        }
      }

      console.log('Review updated successfully');

      return res.status(200).json({
        success: true,
        data: completeReview
      });
    } catch (error) {
      console.error('Unexpected error in PATCH review:', error);
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

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);