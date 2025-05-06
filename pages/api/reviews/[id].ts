// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { EmailService } from '../../../lib/emailService';
import { FIELD_LIMITS } from '../../../constants';
import { SupabaseClient } from '@supabase/supabase-js';
import { Role } from '../../../types';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  review?: any;
  error?: string;
};

/**
 * Handler for review API operations
 */
async function reviewHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Review ID is required' 
    });
  }

  console.log(`Processing ${req.method} request for review ID: ${id} by user ${userId}`);

  try {
    // Get the review
    const { data: review, error: reviewError } = await supabaseClient
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (reviewError) {
      console.error('Error fetching review:', reviewError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch review'
      });
    }

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return res.status(200).json({
          success: true,
          data: review
        });

      case 'DELETE':
        // Only allow admins or the review creator to delete
        if (userRole !== 'Admin' && userId !== review.created_by) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this review'
          });
        }

        const { error: deleteError } = await supabaseClient
          .from('reviews')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting review:', deleteError);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete review'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Review deleted successfully'
        });

      case 'PUT': {
        // Check if the review exists and get the owner
        const { data: initialFetch, error: initialFetchError } = await supabaseClient
          .from('reviews')
          .select('user_id, status, project_lead_id')
          .eq('id', id)
          .single();
        
        if (initialFetchError) {
          console.error('Error fetching review for update:', initialFetchError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch review for update' 
          });
        }
        
        if (!initialFetch) {
          console.log('Review not found with ID:', id);
          return res.status(404).json({ 
            success: false, 
            message: 'Review not found' 
          });
        }
        
        // Check authorization - only author or admin can edit
        const isAuthor = initialFetch.user_id === userId;
        const isAdmin = userRole === 'Admin';
        
        if (!isAuthor && !isAdmin) {
          console.log('Authorization failed: User is not the author or an admin');
          return res.status(403).json({ 
            success: false, 
            message: 'You do not have permission to edit this review' 
          });
        }
        
        // Extract and validate fields from request body
        const {
          title,
          description,
          graph_image_url,
          account_name,
          org_id,
          kantata_project_id,
          segment,
          remote_access,
          graph_name,
          use_case,
          customer_folder,
          handoff_link,
          project_lead_id: putProjectLeadId
        } = req.body;
        
        // Check authorization for project lead change
        if (putProjectLeadId !== undefined &&
          putProjectLeadId !== initialFetch.project_lead_id &&
          !isAdmin) {
          return res.status(403).json({ 
            success: false, 
            message: 'Only admins can change the project lead' 
          });
        }
        
        console.log('Received update data:', { 
          title, 
          description, 
          hasGraphImage: !!graph_image_url,
          accountName: account_name,
          orgId: org_id,
          kantataProjectId: kantata_project_id,
          segment,
          remoteAccess: remote_access,
          graphName: graph_name,
          useCase: use_case,
          customerFolder: customer_folder,
          handoffLink: handoff_link,
          projectLeadId: putProjectLeadId
        });
        
        // Prepare update data
        const putUpdateData = {
          title,
          description,
          graph_image_url,
          account_name,
          org_id,
          kantata_project_id,
          segment,
          remote_access,
          graph_name,
          use_case,
          customer_folder,
          handoff_link,
          project_lead_id: putProjectLeadId,
          updated_at: new Date().toISOString()
        };
        
        console.log('Sending update to database with data');
        
        // Update the review
        const { data: updateResult, error: putUpdateError } = await supabaseClient
          .from('reviews')
          .update(putUpdateData)
          .eq('id', id)
          .select()
          .single();

        if (putUpdateError) {
          console.error('Error updating review:', putUpdateError);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to update review' 
          });
        }
        
        console.log('Review updated successfully');
        
        return res.status(200).json({
          success: true,
          message: 'Review updated successfully',
          data: updateResult
        });
      }

      case 'PATCH': {
        console.log('Processing PATCH request for status update or project lead change');

        // First, fetch the review to check ownership and get previous status
        const { data: reviewData, error: reviewFetchError } = await supabaseClient
          .from('reviews')
          .select(`
            *,
            profiles:user_id (
              email,
              full_name
            )
          `)
          .eq('id', id)
          .single();

        if (reviewFetchError) {
          console.error('Error fetching review for patch:', reviewFetchError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch review for update'
          });
        }

        if (!reviewData) {
          console.log('Review not found with ID:', id);
          return res.status(404).json({
            success: false,
            message: 'Review not found'
          });
        }

        // Store previous status for notification
        const previousStatus = reviewData.status;

        // Get the data from the request body
        const { status, project_lead_id: patchProjectLeadId } = req.body;
        
        console.log('PATCH request data:', { userId, userRole, status, projectLeadId: patchProjectLeadId });

        // Validate status if provided
        if (status) {
          // Only admins can approve reviews
          if (status === 'Approved' && userRole !== 'Admin') {
            // Direct database check for admin role as a fallback
            const { data: adminCheck, error: adminCheckError } = await supabaseClient
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .single();

            if (adminCheckError || !adminCheck || adminCheck.role !== 'Admin') {
              return res.status(403).json({
                success: false,
                message: 'Only admins can approve reviews'
              });
            }
          }
        }

        // First verify the review exists
        const { data: existingReview, error: checkError } = await supabaseClient
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

        // Prepare update data for PATCH
        const patchUpdateData = {
          ...(status && { status }),
          ...(patchProjectLeadId !== undefined && { project_lead_id: patchProjectLeadId }),
          updated_at: new Date().toISOString()
        };

        // Then perform the update without returning
        const { error: patchUpdateError } = await supabaseClient
          .from('reviews')
          .update(patchUpdateData)
          .eq('id', id);

        if (patchUpdateError) {
          console.error('Error updating review:', patchUpdateError);
          return res.status(500).json({
            success: false,
            message: 'Failed to update review'
          });
        }

        // After successful update, fetch the updated review
        const { data: updatedReview, error: fetchError } = await supabaseClient
          .from('reviews')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError || !updatedReview) {
          console.error('Error fetching updated review:', fetchError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch updated review'
          });
        }

        // Fetch user profile
        const { data: userProfile, error: userError } = await supabaseClient
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
          const { data: leadProfile, error: leadError } = await supabaseClient
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
          profiles: userProfile || null,
          project_lead: projectLeadProfile
        };
        
        // Send email notification if status changed
        if (status && status !== previousStatus) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`;
            await EmailService.sendStatusChangeNotification(
              id,
              completeReview.title,
              completeReview.profiles?.email,
              completeReview.profiles?.full_name,
              previousStatus,
              status,
              userProfile?.full_name || 'System',
              appUrl
            );
          } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
            // Continue with the response even if email fails
          }
        }

        console.log('Review updated successfully');

        return res.status(200).json({
          success: true,
          message: 'Review updated successfully',
          data: completeReview
        });
      }

      default:
        return res.status(405).json({ 
          success: false, 
          message: 'Method not allowed' 
        });
    }
  } catch (error) {
    console.error('Error in review handler:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred'
    });
  }
}

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);