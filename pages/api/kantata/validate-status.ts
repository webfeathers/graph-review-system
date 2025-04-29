// pages/api/kantata/validate-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { withAuth } from '../../../lib/apiHelpers';

type ResponseData = {
  success: boolean;
  isApproved: boolean;
  message: string;
  reviewId?: string;
  reviewStatus?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  userId: string
) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      isApproved: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the Kantata project ID from query params
    const { projectId } = req.query;
    
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        isApproved: false,
        message: 'Kantata project ID is required'
      });
    }
    
    // Query for review with matching Kantata project ID
    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, status')
      .eq('kantataProjectId', projectId)
      .single();
      
    if (error || !review) {
      return res.status(404).json({
        success: false,
        isApproved: false,
        message: 'No matching review found for this Kantata project'
      });
    }
    
    // Check if the review is approved
    const isApproved = review.status === 'Approved';
    
    return res.status(200).json({
      success: true,
      isApproved,
      message: isApproved 
        ? 'Review is approved, status change to Live is allowed' 
        : `Review status is ${review.status}, must be Approved to change to Live`,
      reviewId: review.id,
      reviewStatus: review.status
    });
    
  } catch (error) {
    console.error('Error validating review status:', error);
    return res.status(500).json({
      success: false,
      isApproved: false,
      message: 'Internal server error checking review status'
    });
  }
}

// Export with authentication middleware
export default withAuth(handler);