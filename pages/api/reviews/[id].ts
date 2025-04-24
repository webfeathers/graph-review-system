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
// Right before making the fetch request
console.log(`About to send PUT request to: /api/reviews/${review.id}`);

// Modify your fetch call to log the entire request
try {
  console.log('Sending update request with token:', token.substring(0, 10) + '...');
  
  const response = await fetch(`/api/reviews/${review.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title,
      description,
      graphImageUrl: uploadedImageUrl,
      accountName,
      orgId,
      segment,
      remoteAccess,
      graphName,
      useCase,
      customerFolder,
      handoffLink
    })
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries([...response.headers]));
} catch (err) {
  console.error('Fetch error:', err);
}
  // GET /api/reviews/[id]
  if (req.method === 'GET') {
    try {
      console.log('Fetching review with ID:', id);
      
      const { data: review, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .maybeSingle(); // Use maybeSingle instead of single
      
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
  
  // PATCH /api/reviews/[id] - for status updates
  if (req.method === 'PATCH') {
    try {
      console.log('Processing PATCH request for status update');
      
      // First, fetch the review to check ownership
      const { data: review, error: reviewFetchError } = await supabase
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
      
      // Check if the user is the author of the review
      if (review.user_id !== userId) {
        console.log('Authorization failed: User is not the review author');
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden - You can only update your own reviews' 
        });
      }
      
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
        const { data: profileData, error: profileError } = await supabase
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
      
      const { error: updateError } = await supabase
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
      const { data: updatedReview, error: statusFetchError } = await supabase
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
        accountName
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
      
      console.log('Sending update to database');
      
      // Update review in the database - separate update from select
      const { error: updateError } = await supabase
        .from('reviews')
        .update(updateData)
        .eq('id', id);
        
      if (updateError) {
        console.error('Error updating review:', updateError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to update review', 
          error: updateError.message 
        });
      }
      
      console.log('Update operation succeeded, now fetching the updated review');
      
      // Fetch the updated review separately
      const { data: updatedReview, error: finalFetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (finalFetchError) {
        console.error('Error fetching updated review:', finalFetchError);
        return res.status(500).json({ 
          success: false, 
          message: 'Update succeeded but could not fetch updated review', 
          error: finalFetchError.message 
        });
      }
      
      if (!updatedReview) {
        console.error('Update succeeded but review not found in subsequent fetch');
        return res.status(500).json({
          success: false,
          message: 'Update succeeded but could not retrieve the updated review'
        });
      }
      
      console.log('Review updated successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview
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
  
  // Handle unsupported methods
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

// Wrap the handler with authentication middleware
export default withAuth(reviewHandler);