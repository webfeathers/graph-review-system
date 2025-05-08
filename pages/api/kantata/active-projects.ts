// pages/api/kantata/active-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Cache for active projects
const activeProjectsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }

    // Check cache first
    const cacheKey = `active-projects-${userId}`;
    const cached = activeProjectsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    // Fetch all workspaces from Kantata with pagination
    let allWorkspaces: Record<string, any> = {};
    const pageSize = 100;
    for (let page = 1; ; page++) {
      const url = `https://api.mavenlink.com/api/v1/workspaces?page=${page}&per_page=${pageSize}`;
      console.log(`Fetching page ${page} from ${url}`);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${kantataApiToken}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        console.error(`Kantata API error: ${response.status} for URL ${url}`);
        throw new Error(`Kantata API error: ${response.status}`);
      }
      const pageData = await response.json();
      const pageWorkspaces = pageData.workspaces || {};
      if (Object.keys(pageWorkspaces).length === 0) {
        break;
      }
      Object.assign(allWorkspaces, pageWorkspaces);
    }

    // Filter to exclude Completed and Archived projects
    const workspaces = Object.fromEntries(
      Object.entries(allWorkspaces).filter(([id, ws]: [string, any]) => {
        const status = ws.status?.message;
        // Exclude specific project IDs and statuses
        const excludedIds = ['36811925', '36811995', '43209426'];
        return !excludedIds.includes(id) && status !== 'Archived' && status !== 'Completed';
      })
    );

    // Get all reviews to check which ones have Graph Reviews
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('id, title, status, kantata_project_id');
      
    if (reviewsError) {
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }

    console.log('Found reviews with Kantata project IDs:', reviews?.filter(r => r.kantata_project_id).map(r => ({
      id: r.id,
      kantata_project_id: r.kantata_project_id
    })));

    // Create a map of Kantata project IDs to review data
    const reviewMap = new Map();
    reviews?.forEach(review => {
      if (review.kantata_project_id) {
        console.log('Adding review to map:', {
          kantata_project_id: review.kantata_project_id,
          review_id: review.id
        });
        reviewMap.set(review.kantata_project_id, review);
      }
    });

    // Transform the workspaces data
    const projects = Object.entries(workspaces).map(([id, workspace]: [string, any]) => {
      const review = reviewMap.get(id);
      console.log('Checking workspace:', {
        workspace_id: id,
        has_review: !!review,
        review_id: review?.id
      });
      return {
        id: review?.id || id,
        title: workspace.title,
        kantataProjectId: id,
        kantataStatus: workspace.status,
        lastUpdated: workspace.updated_at,
        hasGraphReview: !!review,
        graphReviewStatus: review?.status,
        graphReviewId: review?.id
      };
    });

    console.log('Final projects with review status:', projects.map(p => ({
      id: p.id,
      kantata_project_id: p.kantataProjectId,
      has_graph_review: p.hasGraphReview
    })));

    const apiResponse = {
      message: `Found ${projects.length} projects`,
      projects
    };

    // Cache the results
    activeProjectsCache.set(cacheKey, { data: apiResponse, timestamp: Date.now() });

    return res.status(200).json(apiResponse);
    
  } catch (error) {
    console.error('Error in active-projects API:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      projects: []
    });
  }
}

export default withAdminAuth(handler);