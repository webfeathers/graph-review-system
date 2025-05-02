// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { updateKantataStatus } from '../../../lib/kantataService';
import { EmailService } from '../../../lib/emailService';

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
    const kantataApiToken = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN;
    
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }
    
    // Log token existence for debugging (don't log the actual token!)
    console.log('Kantata API token exists:', !!kantataApiToken);

    // Get all reviews with Kantata project IDs
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, title, status, kantata_project_id');
    
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
          const isValid = review.status === 'Approved';
          validationResults.push({
            reviewId: review.id,
            reviewTitle: review.title,
            reviewStatus: review.status,
            kantataProjectId: 'N/A',
            kantataStatus: 'No Kantata Project',
            isValid,
            message: isValid 
              ? 'Graph Review is approved (no Kantata project yet)' 
              : 'Graph Review is not approved and has no Kantata project'
          });
          continue;
        }
        
        console.log(`Checking Kantata status for project ID: ${review.kantata_project_id}`);
        
        // Construct the Kantata API URL
        const kantataApiUrl = `https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`;
        
        // Make request to Kantata API to get project status
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
          const kantataStatus = kantataProject.status || { message: 'Unknown' };
          const kantataStatusMessage = kantataStatus.message || 'Unknown';
          
          let isValid = true;
          let message = 'Status is consistent';
          
          // Strict rule: Live Kantata project requires Approved Graph Review
          if (kantataStatusMessage === 'Live' && review.status !== 'Approved') {
            isValid = false;
            message = 'Invalid: Kantata project is Live but Graph Review is not Approved';
            
            // Auto-correct the Kantata project status
            try {
              if (!kantataApiToken) {
                message += '. Failed to auto-correct: Kantata API token not configured';
              } else {
                // Update the Kantata project status
                const updateResult = await updateKantataStatus(
                  review.kantata_project_id,
                  'In Development',
                  kantataApiToken
                );
                
                if (updateResult.success) {
                  message += '. Auto-corrected: Kantata status reset to In Development';
                  kantataStatus.message = 'In Development';
                  
                  // Send notification emails to the Kantata Project Owner and Graph Review submitter
                  try {
                    // 1. Get the Graph Review submitter information
                    const { data: reviewAuthor, error: authorError } = await supabase
                      .from('profiles')
                      .select('name, email')
                      .eq('id', review.user_id || review.userId) // Try both property names
                      .single();
                      
                    if (authorError) {
                      console.error('Error getting review author info:', authorError);
                    }
                    
                    // 2. Get the Kantata Project Owner information (this requires an additional API call)
                    const kantataProjectUrl = `https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}?include=participants`;
                    const projectResponse = await fetch(kantataProjectUrl, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${kantataApiToken}`,
                        'Accept': 'application/json'
                      }
                    });
                    
                    let projectOwnerEmail = null;
                    let projectOwnerName = 'Project Owner';
                    
                    if (projectResponse.ok) {
                      const projectData = await projectResponse.json();
                      
                      // Find the lead/owner from participants
                      // Note: This part might need adjustment based on Kantata's actual API structure
                      if (projectData.workspaces && 
                          projectData.workspaces[review.kantata_project_id] && 
                          projectData.workspaces[review.kantata_project_id].lead_id &&
                          projectData.users) {
                        
                        const leadId = projectData.workspaces[review.kantata_project_id].lead_id;
                        const lead = projectData.users[leadId];
                        
                        if (lead) {
                          projectOwnerEmail = lead.email_address;
                          projectOwnerName = `${lead.first_name} ${lead.last_name}`.trim();
                        }
                      }
                    } else {
                      console.error('Error fetching Kantata project details:', await projectResponse.text());
                    }
                    
                    // 3. Send email notifications
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://graph-review-system-3a7t.vercel.app';
                    const reviewUrl = `${appUrl}/reviews/${review.id}`;
                    const kantataProjectUrl = `https://leandata.mavenlink.com/workspaces/${review.kantata_project_id}`;
                    
                    // Send email to the Graph Review submitter
                    if (reviewAuthor && reviewAuthor.email) {
                      await EmailService.sendEmail({
                        to: reviewAuthor.email,
                        subject: `Graph Review Status Alert: Kantata Project Status Reset`,
                        html: `
                          <h1>Graph Review Status Alert</h1>
                          <p>Hello ${reviewAuthor.name || 'there'},</p>
                          <p>The Kantata project linked to your graph review "${review.title}" has been automatically reset from "Live" to "In Development" status.</p>
                          <p><strong>Reason:</strong> Kantata projects should not be marked as "Live" until the associated Graph Review is approved.</p>
                          <p><strong>Action Required:</strong> Please complete the Graph Review approval process before changing the Kantata project status to "Live".</p>
                          <div style="margin: 20px 0;">
                            <a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">View Graph Review</a>
                            <a href="${kantataProjectUrl}" style="background-color: #42529e; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Kantata Project</a>
                          </div>
                          <p>Thank you,<br>LeanData Graph Review System</p>
                        `
                      });
                    }
                    
                    // Send email to the Kantata Project Owner (if different from the submitter)
                    if (projectOwnerEmail && 
                        (!reviewAuthor || reviewAuthor.email !== projectOwnerEmail)) {
                      await EmailService.sendEmail({
                        to: projectOwnerEmail,
                        subject: `Graph Review Status Alert: Kantata Project Status Reset`,
                        html: `
                          <h1>Graph Review Status Alert</h1>
                          <p>Hello ${projectOwnerName},</p>
                          <p>The Kantata project "${projectData?.workspaces?.[review.kantata_project_id]?.title || review.kantata_project_id}" that you own has been automatically reset from "Live" to "In Development" status.</p>
                          <p><strong>Reason:</strong> Kantata projects should not be marked as "Live" until the associated Graph Review is approved.</p>
                          <p><strong>Action Required:</strong> Please ensure the associated Graph Review is approved before changing the Kantata project status to "Live".</p>
                          <div style="margin: 20px 0;">
                            <a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">View Graph Review</a>
                            <a href="${kantataProjectUrl}" style="background-color: #42529e; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Kantata Project</a>
                          </div>
                          <p>Thank you,<br>LeanData Graph Review System</p>
                        `
                      });
                    }
                    
                    message += '. Notifications sent to the graph review submitter' + (projectOwnerEmail && projectOwnerEmail !== reviewAuthor?.email ? ' and project owner' : '');
                    
                  } catch (notificationError) {
                    console.error('Error sending notifications:', notificationError);
                    message += '. Status updated but failed to send notifications';
                  }
                } else {
                  message += `. Failed to auto-correct: ${updateResult.message}`;
                }
              }
            } catch (correctionError) {
              message += `. Failed to auto-correct: ${correctionError instanceof Error ? correctionError.message : 'Unknown error'}`;
            }
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
    } // End of for loop
    
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