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
  graphReviewUrl?: string;
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
    
    console.log(`Validating status for Kantata project: ${projectId}`);
    
    // Query for review with matching Kantata project ID
    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, title, status, user_id')
      .eq('kantata_project_id', projectId)
      .single();
      
    if (error) {
      console.error('Error fetching review:', error);
      return res.status(404).json({
        success: false,
        isApproved: false,
        message: 'No matching review found for this Kantata project'
      });
    }
    
    if (!review) {
      return res.status(404).json({
        success: false,
        isApproved: false,
        message: 'No matching review found for this Kantata project'
      });
    }
    
    // Check if the review is approved
    const isApproved = review.status === 'Approved';
    
    // Construct the URL to the review
    const graphReviewUrl = `https://graph-review-system-3a7t.vercel.app/reviews/${review.id}`;
    
    return res.status(200).json({
      success: true,
      isApproved,
      message: isApproved 
        ? `Graph review "${review.title}" is approved, status change to Live is allowed` 
        : `Graph review "${review.title}" has status "${review.status}", must be Approved to change to Live`,
      reviewId: review.id,
      reviewStatus: review.status,
      graphReviewUrl
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