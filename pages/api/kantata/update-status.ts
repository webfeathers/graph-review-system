// pages/api/kantata/update-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { updateKantataStatus } from '../../../lib/kantataService';

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
    
    // Log request details for debugging
    console.log('Update status request:', {
      kantataProjectId,
      status,
      body: req.body
    });
    
    if (!kantataProjectId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kantataProjectId and status'
      });
    }
    
    // Use environment variable for API token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN || "";
    
    console.log('Using Kantata API token:', KANTATA_API_TOKEN ? 'Token exists' : 'Token missing');
    
    if (!KANTATA_API_TOKEN) {
      return res.status(400).json({
        success: false,
        message: 'Missing Kantata API token in environment variables'
      });
    }
    
    // Call the update function from the shared service
    const result = await updateKantataStatus(kantataProjectId, status, KANTATA_API_TOKEN);
    
    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        details: result.details
      });
    }
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