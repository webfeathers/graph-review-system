// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

// Interface for validation result
interface ValidationResult {
  reviewId: string;
  reviewTitle: string;
  reviewStatus: string;
  kantataProjectId: string;
  kantataStatus: string;
  isValid: boolean;
  message: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData?.user) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    // Check if user is admin (you should implement this check based on your auth model)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    const isAdmin = profileData?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }

    // Get the Kantata API token from environment variables
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }
    
    // Get all reviews that need validation
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, title, status, kantata_project_id');
      
    if (reviewsError) {
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }
    
    // Prepare to store validation results
    const validationResults: ValidationResult[] = [];
    
    // For each review, check its status in Kantata
    for (const review of reviews) {
      try {
        // Skip reviews without a Kantata project ID
        if (!review.kantata_project_id) {
          validationResults.push({
            reviewId: review.id,
            reviewTitle: review.title,
            reviewStatus: review.status,
            kantataProjectId: 'N/A',
            kantataStatus: 'N/A',
            isValid: true, // We consider this valid since there's no Kantata project to compare against
            message: 'No Kantata project ID associated'
          });
          continue;
        }
        
        // Make request to Kantata API to get project status
        const kantataResponse = await fetch(
          `https://api.kantata.com/v1/projects/${review.kantata_project_id}`,
          {
            headers: {
              'Authorization': `Bearer ${kantataApiToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!kantataResponse.ok) {
          // Handle API errors
          if (kantataResponse.status === 404) {
            validationResults.push({
              reviewId: review.id,
              reviewTitle: review.title,
              reviewStatus: review.status,
              kantataProjectId: review.kantata_project_id,
              kantataStatus: 'Not Found',
              isValid: false,
              message: 'Project not found in Kantata'
            });
          } else {
            validationResults.push({
              reviewId: review.id,
              reviewTitle: review.title,
              reviewStatus: review.status,
              kantataProjectId: review.kantata_project_id,
              kantataStatus: 'Error',
              isValid: false,
              message: `API error: ${kantataResponse.status}`
            });
          }
          continue;
        }
        
        // Parse Kantata project data
        const kantataProject = await kantataResponse.json();
        const kantataStatus = kantataProject.status || 'Unknown';
        
        // Validation logic
        let isValid = true;
        let message = 'Status is consistent';
        
        // Check for inconsistency: Project is Live in Kantata but not Approved in Graph Review
        if (kantataStatus === 'Live' && review.status !== 'Approved') {
          isValid = false;
          message = 'Project is Live in Kantata but not Approved in Graph Review';
        }
        
        // Add result to array
        validationResults.push({
          reviewId: review.id,
          reviewTitle: review.title,
          reviewStatus: review.status,
          kantataProjectId: review.kantata_project_id,
          kantataStatus,
          isValid,
          message
        });
        
      } catch (error) {
        // Handle errors for individual project validation
        validationResults.push({
          reviewId: review.id,
          reviewTitle: review.title,
          reviewStatus: review.status,
          kantataProjectId: review.kantata_project_id || 'N/A',
          kantataStatus: 'Error',
          isValid: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Calculate summary statistics
    const totalChecked = validationResults.length;
    const validCount = validationResults.filter(r => r.isValid).length;
    const invalidCount = totalChecked - validCount;
    
    return res.status(200).json({
      message: `${validCount} valid, ${invalidCount} invalid out of ${totalChecked} projects checked.`,
      validationResults
    });
    
  } catch (error) {
    console.error('Error in validate-projects API:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}