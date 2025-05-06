// pages/api/kantata/active-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { createClient } from '@supabase/supabase-js';
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

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
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  // Only allow GET method
  if (req.method !== 'GET') {
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

    // Get all reviews to get unique Kantata project IDs
    console.log('Fetching all reviews...');
    const { data: allReviews, error: allReviewsError } = await supabaseClient
      .from('reviews')
      .select('*');

    if (allReviewsError) {
      console.error('Error fetching all reviews:', allReviewsError);
      throw new Error(`Error fetching all reviews: ${allReviewsError.message}`);
    }

    // Calculate the date 60 days ago
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    // Get active projects from Kantata
    const kantataResponse = await fetch('https://api.mavenlink.com/api/v1/workspaces.json', {
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!kantataResponse.ok) {
      throw new Error(`Failed to fetch Kantata projects: ${kantataResponse.status}`);
    }

    const kantataData = await kantataResponse.json();
    const projects = kantataData.workspaces || {};

    // Filter for active projects
    const activeProjects = Object.entries(projects)
      .filter(([_, project]: [string, any]) => {
        const updatedAt = new Date(project.updated_at);
        return updatedAt >= sixtyDaysAgo;
      })
      .map(([id, project]: [string, any]) => ({
        id,
        title: project.title,
        status: project.status || { message: 'Unknown', key: 0, color: '#ccc' },
        updatedAt: project.updated_at,
        leadName: project.primary_maven_name || 'No Lead Assigned',
        leadId: project.primary_maven_id
      }));

    console.log(`Found ${activeProjects.length} active projects`);
    
    // Query for reviews that reference these Kantata project IDs
    const { data: reviewsData, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('id, kantata_project_id, status')
      .in('kantata_project_id', activeProjects.map(p => p.id));

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }

    // Create a map of Kantata project IDs to review data
    const reviewMap = new Map(
      (reviewsData || []).map(review => [review.kantata_project_id, review])
    );

    // Add review information to active projects
    const projectsWithReviews = activeProjects.map(project => ({
      ...project,
      hasGraphReview: reviewMap.has(project.id),
      graphReviewId: reviewMap.get(project.id)?.id || null,
      graphReviewStatus: reviewMap.get(project.id)?.status || null
    }));

    return res.status(200).json({
      success: true,
      message: `Found ${projectsWithReviews.length} active projects`,
      projects: projectsWithReviews
    });
    
  } catch (error) {
    console.error('Error in active-projects API:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      projects: []
    });
  }
}

// Export with admin authentication
export default withAdminAuth(handler);