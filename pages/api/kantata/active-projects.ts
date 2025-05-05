// pages/api/kantata/active-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { createClient } from '@supabase/supabase-js';
import { Role } from '../../../types/supabase';

// Define the interfaces
interface KantataStatus {
  key: number;
  message: string;
  color: string;
}

interface KantataProject {
  id: string;
  title: string;
  status: KantataStatus;
  createdAt: string;
  leadName?: string;
  leadId?: string;
  hasGraphReview: boolean;
  graphReviewId?: string | null;
  graphReviewStatus?: string | null;
}

interface KantataApiResponse {
  workspaces: Record<string, any>;
  users: Record<string, any>;
}

/**
 * API endpoint to fetch active Kantata projects
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  userRole?: Role
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Initialize Supabase client directly in the serverless function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get the Kantata API token from environment variables
    const kantataApiToken = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN;
    
    if (!kantataApiToken) {
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured'
      });
    }

    // Calculate the date 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    console.log(`Fetching Kantata projects created after ${sixtyDaysAgo.toISOString()}`);

    // Construct the Kantata API URL
    const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces?include=participants&per_page=100`;
    
    // Make request to Kantata API
    const kantataResponse = await fetch(kantataApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });
    
    if (!kantataResponse.ok) {
      console.error(`Kantata API error: ${kantataResponse.status} ${kantataResponse.statusText}`);
      return res.status(kantataResponse.status).json({
        success: false,
        message: `Failed to fetch data from Kantata API: ${kantataResponse.statusText}`
      });
    }
    
    // Parse Kantata project data
    const kantataData: KantataApiResponse = await kantataResponse.json();
    
    // Extract and process projects
    const workspaces = kantataData.workspaces || {};
    const users = kantataData.users || {};
    
    // Process projects
    const projects: KantataProject[] = [];
    
    Object.keys(workspaces).forEach(id => {
      const workspace = workspaces[id];
      
      // Get lead information if available
      let leadName: string | undefined = undefined;
      if (workspace.lead_id && users[workspace.lead_id]) {
        const lead = users[workspace.lead_id];
        leadName = `${lead.first_name} ${lead.last_name}`.trim();
      }

      // Create project object
      const project: KantataProject = {
        id: id,
        title: workspace.title || 'Untitled Project',
        status: workspace.status || { message: 'Unknown', key: 0, color: '#ccc' },
        createdAt: workspace.created_at || '',
        leadId: workspace.lead_id,
        leadName,
        hasGraphReview: false,
        graphReviewId: null,
        graphReviewStatus: null
      };
      
      projects.push(project);
    });
    
    // Filter for active projects created in the last 60 days
    const sixtyDaysAgoTimestamp = sixtyDaysAgo.getTime();
    const activeProjects = projects.filter(project => {
      // Check creation date
      const createdAt = new Date(project.createdAt).getTime();
      const isRecent = createdAt >= sixtyDaysAgoTimestamp;
      
      // Check status - specifically exclude 'Complete' or 'Completed' statuses
      const status = project.status?.message || '';
      const isActive = !['Complete', 'Completed', 'Confirmed'].includes(status);
      
      return isRecent && isActive;
    });
    
    console.log(`Found ${activeProjects.length} active projects out of ${projects.length} total projects`);
    
    // If there are no active projects, return empty array
    if (activeProjects.length === 0) {
      return res.status(200).json({
        success: true,
        projects: []
      });
    }
    
    // Get all project IDs to check for reviews
    const projectIds = activeProjects.map(project => project.id);
    
    // Query for reviews that reference these Kantata project IDs
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, kantata_project_id, status')
      .in('kantata_project_id', projectIds);
      
    if (reviewsError) {
      console.error('Error fetching associated reviews:', reviewsError);
      // Continue with projects but without review info
    } else if (reviewsData) {
      // Create a map of kantata project IDs to their review data
      const reviewMap: Record<string, { id: string, status: string }> = {};
      
      reviewsData.forEach(review => {
        if (review.kantata_project_id) {
          reviewMap[review.kantata_project_id] = {
            id: review.id,
            status: review.status
          };
        }
      });
      
      // Update projects with review information
      for (const project of activeProjects) {
        const reviewInfo = reviewMap[project.id];
        if (reviewInfo) {
          project.hasGraphReview = true;
          project.graphReviewId = reviewInfo.id;
          project.graphReviewStatus = reviewInfo.status;
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      projects: activeProjects
    });
    
  } catch (error) {
    console.error('Error fetching Kantata projects:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data from Kantata',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export with admin authentication
export default withAdminAuth(handler);