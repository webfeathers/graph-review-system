// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withAuth } from '../../../lib/apiHelpers';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '../../../lib/emailService';
import { getReviewById } from '../../../lib/supabaseUtils';

// Create a Supabase admin client with service role for bypassing RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function reviewHandler(
  req: NextApiRequest, 
  res: NextApiResponse,
  userId: string
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
      
      // Use admin client to bypass RLS
      const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
      if (error) {
        console.error('Error fetching review:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: error.message 
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
    } catch (error: any) {
      console.error('Unexpected error in GET review:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // PUT /api/reviews/[id] - for full review updates
  if (req.method === 'PUT') {
    try {
      console.log('Processing PUT request for full review update');
      
      // Check if the review exists
      const { data: review, error: initialFetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
      if (initialFetchError) {
        console.error('Error fetching review for update:', initialFetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: initialFetchError.message 
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
      
      // If not the author, check if admin
      if (!isAuthor) {
        console.log('User is not the author, checking admin status');
        const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

        if (profileError) {
          console.error('Error checking user role:', profileError);
          return res.status(500).json({ 
            success: false, 
            message: 'Error checking user permissions', 
            error: profileError.message 
          });
        }
        
        if (!userProfile || userProfile.role !== 'Admin') {
          console.log('Authorization failed: User is not the author or an admin');
          return res.status(403).json({ 
            success: false, 
            message: 'You do not have permission to edit this review' 
          });
        }
        
        console.log('User is admin, proceeding with update');
      } else {
        console.log('User is the author, proceeding with update');
      }
      
      // Extract fields to update from request body
      const { 
        title, 
        description,
        graphImageUrl,
        accountName,
        orgId,
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
      
      console.log('Received update data:', { 
        title, 
        description, 
        hasGraphImage: !!graphImageUrl,
        accountName,
        orgId,
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
        segment,
        remote_access: remoteAccess,
        graph_name: graphName,
        use_case: useCase,
        customer_folder: customerFolder,
        handoff_link: handoffLink,
        updated_at: new Date().toISOString()
      };
      
      console.log('Sending update to database with data:', JSON.stringify(updateData));
      
      // IMPORTANT: Use the admin client to bypass RLS policies
      const { data: updateResult, error: updateError } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select();

      if (updateError) {
        console.error('Error updating review:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update review', 
          error: updateError.message 
        });
      }
      
      console.log('Update operation result:', JSON.stringify(updateResult));
      
      if (!updateResult || updateResult.length === 0) {
        console.error('Update operation succeeded but returned no data');
        // Try to get the updated data
        const { data: fetchedReview, error: fetchError } = await supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('id', id)
        .maybeSingle();

        if (fetchError || !fetchedReview) {
          console.error('Failed to fetch the updated review:', fetchError);
          return res.status(500).json({ 
            success: false, 
            message: 'Update may have failed, unable to verify changes', 
            error: fetchError?.message 
          });
        }
        
        console.log('Verified update with separate fetch:', JSON.stringify(fetchedReview));
        
        return res.status(200).json({
          success: true,
          message: 'Review updated successfully (verified with separate fetch)',
          data: fetchedReview
        });
      }
      
      console.log('Review updated successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: updateResult[0]
      });
    } catch (error: any) {
      console.error('Unexpected error in PUT review:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  
  // PATCH /api/reviews/[id] - for status updates
  if (req.method === 'PATCH') {
    try {
      console.log('Processing PATCH request for status update');

    // First, fetch the review to check ownership and get previous status
      const { data: review, error: reviewFetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();

      if (reviewFetchError) {
        console.error('Error fetching review for update:', reviewFetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: reviewFetchError.message 
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
      if (status === 'Approved') {
      // Check if the user is an admin
        const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
        if (profileError || !profileData || profileData.role !== 'Admin') {
          console.log('Authorization failed: Admin privileges required for approval');
          return res.status(403).json({ 
            success: false, 
            message: 'Only administrators can approve reviews' 
          });
        }
      }
      
      console.log(`Updating review status to: ${status}`);
      
      // Update the review - separate update from select
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };
      
      // Use admin client to bypass RLS
      const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', id);

      if (updateError) {
        console.error('Error updating review status:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Error updating review', 
          error: updateError.message 
        });
      }
      
      console.log('Status update operation succeeded, now fetching the updated review');
      
      // Fetch the updated review separately
      const { data: updatedReview, error: statusFetchError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', id)
      .maybeSingle();

      if (statusFetchError) {
        console.error('Error fetching updated review:', statusFetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Update succeeded but could not fetch updated review', 
          error: statusFetchError.message 
        });
      }
      
      if (!updatedReview) {
        console.error('Status update succeeded but review not found in subsequent fetch');
        return res.status(500).json({
          success: false,
          message: 'Update succeeded but could not retrieve the updated review'
        });
      }
      
      // Send email notification if status changed
      if (previousStatus !== status) {
        try {
          // Get the user who changed the status
          const { data: statusChanger, error: userError } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email, role')
          .eq('id', userId)
          .single();

          if (userError) {
            console.error('Error fetching user profile:', userError);
          }
          
          // Get the review owner's email by fetching the user associated with the review
          const { data: reviewOwner, error: ownerError } = await supabaseAdmin
          .from('profiles')
          .select('id, name, email')
          .eq('id', review.user_id)
          .single();

          if (ownerError) {
            console.error('Error fetching review owner profile:', ownerError);
          }
          
          // Skip notification if the status changer is the review owner
          if (reviewOwner && reviewOwner.email && reviewOwner.id !== userId) {
            // Generate app URL
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
          `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

            // Get the name of the person who changed the status
          const changerName = statusChanger?.name || 'A user';

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

    console.log('Review status updated successfully');

    return res.status(200).json({
      success: true,
      data: updatedReview
    });
  } catch (error: any) {
    console.error('Unexpected error in PATCH review:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
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