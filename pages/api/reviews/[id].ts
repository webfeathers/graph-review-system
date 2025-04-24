// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withAuth } from '../../../lib/apiHelpers';

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

  // PUT /api/reviews/[id] - for full review updates
  if (req.method === 'PUT') {
    try {
      console.log('Processing PUT request for full review update');
      
      // Check if the review exists
      const { data: review, error: initialFetchError } = await supabase
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
        const { data: userProfile, error: profileError } = await supabase
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
      
      // Update review in the database
      const { data: updateResult, error: updateError } = await supabase
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
        const { data: fetchedReview, error: fetchError } = await supabase
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
  
  // Handle other methods here...
  // GET, PATCH, etc.
  
  // Handle unsupported methods
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);