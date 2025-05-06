// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Interface for validation result
interface ValidationResult {
  reviewId: string;
  reviewTitle: string;
  reviewStatus: string;
  kantataProjectId: string;
  kantataStatus: string | {
    color: string;
    key: number;
    message: string;
  };
  isValid: boolean;
  message: string;
  statusUpdated?: boolean;
}

// Interface for workspace status
interface WorkspaceStatus {
  id: number;
  name: string;
  key: number;
  color: string;
  message: string;
}

// Interface for workspace data response
interface WorkspaceDataResponse {
  workspaces: {
    [key: string]: {
      id: number;
      title: string;
      status: WorkspaceStatus;
      workspace_statuses: {
        [key: string]: WorkspaceStatus;
      };
    };
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the Kantata API token from environment variables
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }
    
    // Log token existence for debugging (don't log the actual token!)
    console.log('Kantata API token exists:', !!kantataApiToken);

    // Get all reviews
    console.log('Fetching all reviews...');
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('*');
      
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }
    
    if (!reviews || reviews.length === 0) {
      console.log('No reviews found');
      return res.status(200).json({ 
        message: 'No reviews found.',
        validationResults: []
      });
    }

    // Process each review and validate against Kantata
    const validationResults: ValidationResult[] = [];
    
    for (const review of reviews) {
      const result: ValidationResult = {
        reviewId: review.id,
        reviewTitle: review.title,
        reviewStatus: review.status,
        kantataProjectId: review.kantata_project_id || 'N/A',
        kantataStatus: { message: 'Unknown', key: 0, color: '#ccc' },
        isValid: false,
        message: 'Not validated',
        statusUpdated: false
      };

      // Skip validation if no Kantata project ID
      if (!review.kantata_project_id) {
        result.message = 'No Kantata project ID associated';
        validationResults.push(result);
        continue;
      }

      try {
        // Call Kantata API to get project status
        const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`;
        const kantataResponse = await fetch(kantataApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${kantataApiToken}`,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!kantataResponse.ok) {
          if (kantataResponse.status === 404) {
            result.message = 'Project not found in Kantata';
            result.kantataStatus = { message: 'Not Found', key: -1, color: '#ff0000' };
          } else {
            result.message = `Kantata API error: ${kantataResponse.status}`;
            result.kantataStatus = { message: 'Error', key: -2, color: '#ff0000' };
          }
          validationResults.push(result);
          continue;
        }

        const projectData = await kantataResponse.json() as WorkspaceDataResponse;
        const workspace = projectData.workspaces?.[review.kantata_project_id];

        if (!workspace) {
          result.message = 'Invalid project data from Kantata';
          validationResults.push(result);
          continue;
        }

        // Update result with Kantata status
        result.kantataStatus = workspace.status || { message: 'Unknown', key: 0, color: '#ccc' };

        // Check if the review status and Kantata status are compatible
        const isLive = workspace.status?.message === 'Live';
        const isApproved = review.status === 'Approved';

        if (isLive && !isApproved) {
          result.isValid = false;
          result.message = 'Project is Live in Kantata but review is not Approved';
          
          // Update Kantata status to "In Development"
          try {
            const updateResponse = await fetch(kantataApiUrl, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${kantataApiToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                workspace: {
                  status_key: 305  // Known key for "In Development" status
                }
              })
            });

            if (updateResponse.ok) {
              result.statusUpdated = true;
              result.message += ' - Status updated to In Development';
              result.kantataStatus = { message: 'In Development', key: 305, color: 'green' };
            } else {
              const errorText = await updateResponse.text();
              console.error('Failed to update Kantata status:', errorText);
              result.message += ' - Failed to update status';
            }
          } catch (updateError) {
            console.error('Error updating Kantata status:', updateError);
            result.message += ' - Error updating status';
          }
        } else if (!isLive && isApproved) {
          result.isValid = false;
          result.message = 'Review is Approved but project is not Live in Kantata';
        } else {
          result.isValid = true;
          result.message = 'Status is consistent between Graph Review and Kantata';
        }

      } catch (error) {
        console.error(`Error validating project ${review.kantata_project_id}:`, error);
        result.message = error instanceof Error ? error.message : 'Validation failed';
        result.kantataStatus = { message: 'Error', key: -3, color: '#ff0000' };
      }

      validationResults.push(result);
    }

    return res.status(200).json({
      message: `Validated ${validationResults.length} reviews.`,
      validationResults
    });
    
  } catch (error) {
    console.error('Error in validate-projects API:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      validationResults: []
    });
  }
}

// Export with admin authentication
export default withAdminAuth(handler);