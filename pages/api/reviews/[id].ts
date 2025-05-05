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
          ),
          project_lead:project_lead_id (
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
      // When checking the project lead update permissions
      if (projectLeadId !== undefined) {
        // Direct database check for admin role
        const { data: adminCheck, error: adminCheckError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
          
        const isAdmin = !adminCheckError && adminCheck && adminCheck.role === 'Admin';
        
        console.log('Admin check for project lead update:', {
          userId,
          providedUserRole: userRole,
          directDbCheck: isAdmin,
          adminCheckData: adminCheck,
          adminCheckError
        });
        
        // Only allow admin users to change project lead
        if (!isAdmin) {
          return res.status(403).json({ 
            success: false, 
            message: 'Only administrators can change the Project Lead' 
          });
        }
        
        updateData.project_lead_id = projectLeadId;
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

// PATCH handler for updates to review status and project lead
if (req.method === 'PATCH') {
  try {
    console.log('Processing PATCH request for partial update');

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
    
    // Get the update data from the request body
    const { status, projectLeadId } = req.body;
    
    console.log('PATCH request with auth info:', {
      userId,
      userRole,
      requestBody: req.body
    });
    
    // Initialize the update data object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    // Process status update if provided
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
      
      // Add status to update data
      updateData.status = status;
    }
    
    // Process project lead update if provided
    if (projectLeadId !== undefined) {
      // Check admin status
      const isAdmin = userRole === 'Admin';
      
      // Additional direct database check for admin role
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      const directAdminCheck = !adminError && adminData && adminData.role === 'Admin';
      
      console.log('Admin status check:', {
        userRole,
        isAdmin,
        directAdminCheck,
        adminData,
        adminError
      });
      
      // Only admins can change project lead
      if (!isAdmin && !directAdminCheck) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only administrators can change the Project Lead' 
        });
      }
      
      // Add project lead to update data
      updateData.project_lead_id = projectLeadId;
    }
    
    // Check if there are any updates to make
    if (Object.keys(updateData).length <= 1) { // Only has updated_at
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields to update' 
      });
    }
    
    console.log('Sending update to database:', updateData);
    
    // Update the review
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error updating review', 
        error: 'Database update failed' 
      });
    }
    
    if (!updatedReview) {
      console.error('Update succeeded but review not found in result');
      return res.status(500).json({
        success: false,
        message: 'Update succeeded but could not retrieve the updated review'
      });
    }
    
    // Send email notification if status changed
    if (status !== undefined && previousStatus !== status) {
      try {
        // Get the review owner's email and profile info
        const reviewOwner = review.profiles;
        
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
            review.title,
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
    
    // Send email notification if project lead changed
    if (projectLeadId !== undefined && projectLeadId !== review.project_lead_id) {
      // Here you could add email notification for project lead change
      console.log('Project lead updated from', review.project_lead_id, 'to', projectLeadId);
    }

    return res.status(200).json({
      success: true,
      data: updatedReview
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

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);