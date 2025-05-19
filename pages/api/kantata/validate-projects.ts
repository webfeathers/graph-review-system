// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../../lib/emailService';
import { supabase } from '../../../lib/supabase';
import { APP_URL } from '../../../lib/env';

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

// Cache for Kantata workspace data
const workspaceCache = new Map<string, { data: WorkspaceDataResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Batch size for parallel processing
const BATCH_SIZE = 5;

async function fetchWorkspaceData(projectId: string, kantataApiToken: string): Promise<WorkspaceDataResponse> {
  const cached = workspaceCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces/${projectId}`;
  const response = await fetch(kantataApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${kantataApiToken}`,
      'Accept': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Kantata API error: ${response.status}`);
  }

  const data = await response.json() as WorkspaceDataResponse;
  workspaceCache.set(projectId, { data, timestamp: Date.now() });
  return data;
}

async function processReviewBatch(
  reviews: any[],
  kantataApiToken: string,
  supabaseClient: SupabaseClient
): Promise<ValidationResult[]> {
  return Promise.all(reviews.map(async (review) => {
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

    if (!review.kantata_project_id) {
      result.message = 'No Kantata project ID associated';
      return result;
    }

    try {
      const projectData = await fetchWorkspaceData(review.kantata_project_id, kantataApiToken);
      const workspace = projectData.workspaces?.[review.kantata_project_id];

      if (!workspace) {
        result.message = 'Invalid project data from Kantata';
        return result;
      }

      result.kantataStatus = workspace.status || { message: 'Unknown', key: 0, color: '#ccc' };
      const isLive = workspace.status?.message === 'Live';
      const isApproved = review.status === 'Approved';

      if (isLive && !isApproved) {
        result.isValid = false;
        result.message = 'Project is Live in Kantata but review is not Approved';
        
        // Send email notification for mismatch
        if (review.project_lead_id) {
          const { data: projectLead } = await supabaseClient
            .from('profiles')
            .select('email, name')
            .eq('id', review.project_lead_id)
            .single();
            
          if (projectLead?.email) {
            await EmailService.sendValidationMismatchNotification(
              review.id,
              review.title,
              projectLead.email,
              projectLead.name || 'Project Lead',
              workspace.status.message,
              review.status,
              APP_URL
            );
          }
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

    return result;
  }));
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId?: string,
  supabaseClient?: SupabaseClient,
  userRole?: Role
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check if this is a cron request
  const isCronRequest = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  
  // If not a cron request, require admin auth
  if (!isCronRequest) {
    if (!userId || !supabaseClient || userRole !== 'Admin') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  }

  try {
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }

    const { data: reviews, error: reviewsError } = await (supabaseClient || supabase)
      .from('reviews')
      .select('*')
      .neq('status', 'Archived');
      
    if (reviewsError) {
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }
    
    if (!reviews?.length) {
      return res.status(200).json({ 
        message: 'No reviews found.',
        validationResults: []
      });
    }

    // Process reviews in batches
    const validationResults: ValidationResult[] = [];
    for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
      const batch = reviews.slice(i, i + BATCH_SIZE);
      const batchResults = await processReviewBatch(batch, kantataApiToken, supabaseClient || supabase);
      validationResults.push(...batchResults);
    }

    // For cron requests, return a simpler response
    if (isCronRequest) {
      return res.status(200).json({
        message: `Successfully validated ${validationResults.length} reviews.`
      });
    }

    // For manual requests, return detailed results
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

// Only wrap with withAdminAuth if it's not a cron request
export default function handlerWrapper(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return handler(req, res);
  }
  return withAdminAuth(handler)(req, res);
}