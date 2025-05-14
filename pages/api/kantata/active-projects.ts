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
    let allUsers: Record<string, any> = {};
    const pageSize = 100;
    for (let page = 1; ; page++) {
      const url = `https://api.mavenlink.com/api/v1/workspaces?page=${page}&per_page=${pageSize}&include=lead,creator,participants`;
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
      const pageUsers = pageData.users || {};
      if (Object.keys(pageWorkspaces).length === 0) {
        break;
      }
      Object.assign(allWorkspaces, pageWorkspaces);
      Object.assign(allUsers, pageUsers);
    }

    // Filter to exclude Completed and Archived projects
    const workspaces = Object.fromEntries(
      Object.entries(allWorkspaces).filter(([id, ws]: [string, any]) => {
        const status = ws.status?.message;
        const title = ws.title?.toLowerCase() || '';
        // Exclude specific project IDs and statuses
        const excludedIds = ['36811925', '36811995', '43209426', '39003075', '41968697', '41968694', '41968699', '42238540', '41968701', '41971070', '41984633', '41968700', '43207649'];
        return !excludedIds.includes(id) && 
               status !== 'Archived' && 
               status !== 'Completed' &&
               status !== 'Rejected' &&
               !title.includes('prem support') &&
               !title.includes('premium support') &&
               !title.includes('premium services') &&
               !title.includes('csm');
      })
    );

    // Get all reviews to check which ones have Graph Reviews
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('id, title, status, kantata_project_id');
      
    if (reviewsError) {
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }

    // Create a map of Kantata project IDs to review data
    const reviewMap = new Map();
    reviews?.forEach(review => {
      if (review.kantata_project_id) {
        reviewMap.set(review.kantata_project_id, review);
      }
    });

    // Transform the workspaces data
    const transformedWorkspaces = await Promise.all(Object.values(workspaces).map(async (workspace: any) => {
      const projectLead = allUsers[workspace.primary_maven_id];
      const review = reviewMap.get(workspace.id);
      
      // Look up project lead in our database by email
      let projectLeadId = null;
      if (projectLead?.email_address) {
        const { data: leadData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', projectLead.email_address)
          .single();
        if (leadData) {
          projectLeadId = leadData.id;
        }
      }

      return {
        id: workspace.id,
        title: workspace.title,
        kantataStatus: workspace.status,
        hasReview: !!review,
        reviewId: review?.id,
        reviewStatus: review?.status,
        lastUpdated: workspace.updated_at,
        createdAt: workspace.created_at,
        startDate: workspace.start_date,
        projectLead: projectLead ? {
          id: projectLeadId,
          name: projectLead.full_name,
          email: projectLead.email_address,
          headline: projectLead.headline
        } : null,
        description: workspace.description,
        status: workspace.status?.message,
        participants: workspace.participants || [],
        creator: workspace.creator ? {
          id: workspace.creator.id,
          name: workspace.creator.full_name,
          email: workspace.creator.email_address
        } : null
      };
    }));

    const apiResponse = {
      message: `Found ${transformedWorkspaces.length} projects`,
      projects: transformedWorkspaces
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