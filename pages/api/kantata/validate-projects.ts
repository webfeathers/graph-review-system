// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

// Interface for validation result
interface ValidationResult {
  reviewId: string;
  reviewTitle: string;
  reviewStatus: string;
  kantataProjectId: string;
  //kantataStatus: string;

  kantataStatus: string | { color: string; key: number; message: string };
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
    
    // Check if user is admin (case-insensitive check)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
      
    const userRole = profileData?.role || '';
    const isAdmin = userRole.toLowerCase() === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }

    // Get the Kantata API token from environment variables
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }
    
    // Log token existence for debugging (don't log the actual token!)
    console.log('Kantata API token exists:', !!kantataApiToken);

    // Get all reviews with Kantata project IDs
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, title, status, kantata_project_id')
      .not('kantata_project_id', 'is', null);
      
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }
    
    if (!reviews || reviews.length === 0) {
      return res.status(200).json({ 
        message: 'No reviews with Kantata project IDs found.',
        validationResults: []
      });
    }
    
    console.log(`Found ${reviews.length} reviews with Kantata project IDs`);
    
    // Prepare to store validation results
    const validationResults: ValidationResult[] = [];
    
    // For each review, check its status in Kantata
    for (const review of reviews) {
      try {
        // Make sure we have a Kantata project ID
        if (!review.kantata_project_id) {
          continue; // Skip this review
        }
        
        console.log(`Checking Kantata status for project ID: ${review.kantata_project_id}`);
        
        // Construct the Kantata API URL
        const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`;
        
        // Make request to Kantata API to get project status
        // Note: Added timeout and more specific error handling
        try {
          const kantataResponse = await fetch(kantataApiUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${kantataApiToken}`,
              'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          
          if (!kantataResponse.ok) {
            // Handle API errors
            console.error(`Kantata API error for project ${review.kantata_project_id}:`, 
              kantataResponse.status, kantataResponse.statusText);
              
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
                message: `API error: ${kantataResponse.status} ${kantataResponse.statusText}`
              });
            }
            continue;
          }
          
          // Parse Kantata project data
          const kantataData = await kantataResponse.json();
          console.log(`Received Kantata data for project ${review.kantata_project_id}`);
          
          // Extract the status from the response (adjust this based on actual API response structure)
          const kantataProject = kantataData.workspaces?.[review.kantata_project_id] || {};
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
          
        } catch (fetchError) {
          console.error('Error fetching from Kantata API:', fetchError);
          
          validationResults.push({
            reviewId: review.id,
            reviewTitle: review.title,
            reviewStatus: review.status,
            kantataProjectId: review.kantata_project_id,
            kantataStatus: 'Error',
            isValid: false,
            message: fetchError instanceof Error 
              ? fetchError.message 
              : 'Failed to connect to Kantata API'
          });
        }
        
      } catch (reviewError) {
        // Handle errors for individual project validation
        console.error('Error processing review:', reviewError);
        
        validationResults.push({
          reviewId: review.id,
          reviewTitle: review.title,
          reviewStatus: review.status,
          kantataProjectId: review.kantata_project_id || 'N/A',
          kantataStatus: 'Error',
          isValid: false,
          message: reviewError instanceof Error ? reviewError.message : 'Unknown error'
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
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      validationResults: []
    });
  }
}