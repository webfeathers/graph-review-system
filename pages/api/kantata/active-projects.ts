// pages/api/kantata/active-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { createClient } from '@supabase/supabase-js';

interface KantataProject {
  id: string;
  title: string;
  status: {
    key: number;
    message: string;
    color: string;
  };
  createdAt: string;
  leadName?: string;
  leadId?: string;
  participants?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  hasGraphReview: boolean;
  graphReviewId?: string;
  graphReviewStatus?: string;
}

/**
 * API endpoint to fetch active Kantata projects
 */
async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  userRole: string
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
    // This avoids the issue with importing the supabase client
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

    // Construct the Kantata API URL with optional filters
    // Note: Adjust these parameters based on actual Kantata API documentation
    const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces?include=participants&per_page=100`;
    
    // Make request to Kantata API to get projects
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
    const kantataData = await kantataResponse.json();
    
    // Extract and process projects
    const workspaces = kantataData.workspaces || {};
    const users = kantataData.users || {};
    
    // Convert the object of projects to an array
    const projectsArray = Object.keys(workspaces).map(id => {
      const project = workspaces[id];
      
      // Get lead information if available
      let leadName = undefined;
      if (project.lead_id && users[project.lead_id]) {
        const lead = users[project.lead_id];
        leadName = `${lead.first_name} ${lead.last_name}`.trim();
      }

      // Initialize with all required properties to satisfy TypeScript
      return {
        id: id,
        title: project.title || 'Untitled Project',
        status: project.status || { message: 'Unknown', key: 0, color: '#ccc' },
        createdAt: project.created_at || '',
        leadId: project.lead_id,
        leadName,
        // Initialize with default values for properties we'll set later
        hasGraphReview: false,
        graphReviewId: undefined,
        graphReviewStatus: undefined
      };
    });
    
    // Filter for active projects created in the last 60 days
    const sixtyDaysAgoTimestamp = sixtyDaysAgo.getTime();
    const activeProjects = projectsArray.filter(project => {
      // Check creation date
      const createdAt = new Date(project.createdAt).getTime();
      const isRecent = createdAt >= sixtyDaysAgoTimestamp;
      
      // Check status - not Complete or Confirmed, or is In Development or Live
      const status = project.status?.message || '';
      const isActive = (
        !['Complete', 'Confirmed'].includes(status) ||
        ['In Development', 'Live'].includes(status)
      );
      
      return isRecent && isActive;
    });
    
    console.log(`Found ${activeProjects.length} active projects out of ${projectsArray.length} total projects`);
    
    // Query Graph Review database to see which projects have reviews
    // Get all the project IDs to check
    const projectIds = activeProjects.map(project => project.id);
    
    // If there are no projects, return empty array
    if (projectIds.length === 0) {
      return res.status(200).json({
        success: true,
        projects: []
      });
    }
    
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
      
      // Enhance projects with review information
      activeProjects.forEach(project => {
        const reviewInfo = reviewMap[project.id];
        if (reviewInfo) {
          project.hasGraphReview = true;
          project.graphReviewId = reviewInfo.id;
          project.graphReviewStatus = reviewInfo.status;
        }
        // No need for an else case as hasGraphReview is already initialized to false
      });
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