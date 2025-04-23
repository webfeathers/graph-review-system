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

  // GET /api/reviews/[id]
  if (req.method === 'GET') {
    try {
      const { data: review, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching review:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Error fetching review', 
          error: error.message 
        });
      }
      
      if (!review) {
        return res.status(404).json({ 
          success: false, 
          message: 'Review not found' 
        });
      }
      
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
  
  // PATCH /api/reviews/[id]
  if (req.method === 'PATCH') {
    try {
      // First, fetch the review to check ownership
      const { data: review, error: fetchError } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError || !review) {
        console.error('Error fetching review for update:', fetchError);
        return res.status(404).json({ 
          success: false, 
          message: 'Review not found' 
        });
      }
      
      // Check if the user is the author of the review
      if (review.user_id !== userId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden - You can only update your own reviews' 
        });
      }
      
      const { status } = req.body;
      
      // Validate status value
      if (status && !['Submitted', 'In Review', 'Needs Work', 'Approved'].includes(status)) {
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
          return res.status(403).json({ 
            success: false, 
            message: 'Only administrators can approve reviews' 
          });
        }
      }
      
      // Update the review
      const updateData: any = {};
      if (status) {
        updateData.status = status;
      }
      updateData.updated_at = new Date().toISOString();
      
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
          error: updateError.message 
        });
      }
      
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
  // PUT /api/reviews/[id]
if (req.method === 'PUT') {
  try {
    // Check if the review exists
    const { data: review, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !review) {
      console.error('Error fetching review:', fetchError);
      return res.status(404).json({ 
        success: false, 
        message: 'Review not found' 
      });
    }
    
    // Check authorization - only author or admin can edit
    const isAuthor = review.user_id === userId;
    
    // If not the author, check if admin
    if (!isAuthor) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (profileError || !userProfile || userProfile.role !== 'Admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to edit this review' 
        });
      }
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
      return res.status(400).json({ 
        success: false, 
        message: 'Title and description are required' 
      });
    }
    
    // Prepare update data
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
    
    // Update review in the database
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
        message: 'Failed to update review', 
        error: updateError.message 
      });
    }
    
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