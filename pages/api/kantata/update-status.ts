// pages/api/kantata/update-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { KantataService } from '../../../lib/kantataService';

// Initialize Kantata service with your API token
// This should be stored in your environment variables
const KANTATA_API_TOKEN = process.env.KANTATA_API_TOKEN || '';
KantataService.initialize(KANTATA_API_TOKEN);

// Map Graph Review statuses to Kantata custom field values
// You'll need to adjust these values based on your actual Kantata setup
const STATUS_MAPPING = {
  'Submitted': 'In Progress',
  'In Review': 'In Progress',
  'Needs Work': 'In Progress',
  'Approved': 'Approved'
};

// The ID of your custom field in Kantata
// You'll need to get this from your Kantata admin
const GRAPH_REVIEW_STATUS_FIELD_ID = process.env.KANTATA_STATUS_FIELD_ID || '';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the kantataProjectId and status from the request body
    const { kantataProjectId, status } = req.body;
    
    if (!kantataProjectId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kantataProjectId and status'
      });
    }
    
    // Check if status is valid
    if (!['Submitted', 'In Review', 'Needs Work', 'Approved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Map the Graph Review status to a Kantata status
    const kantataStatus = STATUS_MAPPING[status as keyof typeof STATUS_MAPPING] || 'In Progress';
    
    console.log(`Updating Kantata project ${kantataProjectId} status to: ${kantataStatus}`);
    
    // Update the custom field in Kantata
    const result = await KantataService.updateCustomField(
      kantataProjectId,
      GRAPH_REVIEW_STATUS_FIELD_ID,
      kantataStatus
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update Kantata status',
        error: result.error
      });
    }
    
    // Return success
    return res.status(200).json({
      success: true,
      message: `Successfully updated Kantata project status to ${kantataStatus}`,
      data: result.data
    });
  } catch (error) {
    console.error('Error updating Kantata status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating Kantata status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Wrap the handler with authentication middleware
export default withAuth(handler);