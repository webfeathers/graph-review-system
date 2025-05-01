// pages/api/admin/sync-profiles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { ProfileService } from '../../../lib/profileService';
import { supabase } from '../../../lib/supabase';

type SyncResponseData = {
  success: boolean;
  message: string;
  error?: any;
  totalUsers?: number;
  existingProfiles?: number;
  missingProfiles?: number;
  createdProfiles?: number;
  failedCreations?: number;
};

/**
 * Admin API endpoint to trigger profile synchronization
 * This should be secured in production with proper admin authentication
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<SyncResponseData>) {
  // In a real application, we would add robust admin authentication here
  // For now, we'll use a simple API key check for demonstration purposes
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.ADMIN_API_KEY;
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Run the profile synchronization
    const result = await syncUserProfiles();
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Profile synchronization failed',
        error: result.error
      });
    }
    
    // Return the result with a success message
    return res.status(200).json({
      message: 'Profile synchronization completed successfully',
      ...result  // This already contains success: true
    });
  } catch (error: any) {
    console.error('Unexpected error during profile sync:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during profile synchronization',
      error: error.message
    });
  }
}