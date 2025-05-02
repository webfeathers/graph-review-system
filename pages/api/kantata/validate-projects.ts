// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
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
  teamLead?: string;
  teamLeadEmail?: string;
  statusChanged?: boolean;
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
          
          // Extract the status from the response
          const kantataProject = kantataData.workspaces?.[review.kantata_project_id] || {};
          const kantataStatus = kantataProject.status || { message: 'Unknown' };
          const kantataStatusMessage = kantataStatus.message || 'Unknown';
          
          // Get team lead info (for notifications if needed)
          let teamLead = 'Unknown';
          let teamLeadEmail = '';
          
          try {
            // Get participant info from Kantata to identify the team lead
            const participantsResponse = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}/participants`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${kantataApiToken}`,
                'Accept': 'application/json'
              }
            });
            
            if (participantsResponse.ok) {
              const participantsData = await participantsResponse.json();
              
              // Find the team lead (role 7 is typically the Team Lead in Kantata)
              const participants = participantsData.participants || {};
              const participantIds = participantsData.results || [];
              
              for (const participantId of participantIds) {
                const participant = participants[participantId];
                if (participant && participant.role_id === 7) {
                  // Found the team lead, get their user information
                  const userId = participant.user_id;
                  if (userId) {
                    const userResponse = await fetch(`https://api.mavenlink.com/api/v1/users/${userId}`, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${kantataApiToken}`,
                        'Accept': 'application/json'
                      }
                    });
                    
                    if (userResponse.ok) {
                      const userData = await userResponse.json();
                      const user = userData.users?.[userId];
                      if (user) {
                        teamLead = user.full_name || `User ${userId}`;
                        teamLeadEmail = user.email_address || '';
                      }
                    }
                  }
                  break;
                }
              }
            }
          } catch (participantError) {
            console.error('Error fetching participant info:', participantError);
          }
          
          // Check if the statuses are consistent
          let isValid = true;
          let message = 'Status is consistent';
          let statusChanged = false;
          
          // If Kantata project is Live but Graph Review is not Approved, this is invalid
          if (kantataStatusMessage === 'Live' && review.status !== 'Approved') {
            isValid = false;
            message = 'Invalid: Kantata project is Live but Graph Review is not Approved';
            
            // AUTOMATIC REMEDIATION: Update Kantata status to "In Development"
            try {
              console.log(`Attempting to update Kantata project ${review.kantata_project_id} status to "In Development"`);
              
              // Find the status ID for "In Development"
              const statusesResponse = await fetch('https://api.mavenlink.com/api/v1/workspace_statuses', {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${kantataApiToken}`,
                  'Accept': 'application/json'
                }
              });
              
              if (statusesResponse.ok) {
                const statusesData = await statusesResponse.json();
                const statuses = statusesData.workspace_statuses || {};
                let inDevelopmentStatusId = null;
                
                // Find the "In Development" status
                for (const statusId in statuses) {
                  if (statuses[statusId].name === 'In Development') {
                    inDevelopmentStatusId = statusId;
                    break;
                  }
                }
                
                if (inDevelopmentStatusId) {
                  // Update the project status
                  const updateResponse = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`, {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${kantataApiToken}`,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                      workspace: {
                        status_id: inDevelopmentStatusId
                      }
                    })
                  });
                  
                  if (updateResponse.ok) {
                    statusChanged = true;
                    message += ' - Status automatically changed to "In Development"';
                    
                    // Add a comment to the project
                    await fetch(`https://api.mavenlink.com/api/v1/posts`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${kantataApiToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify({
                        post: {
                          message: `AUTOMATED NOTIFICATION: This project was set back to "In Development" because the Graph Review (${review.title}) is not in Approved status. Please complete the graph review process before setting the project to Live.`,
                          subject_id: review.kantata_project_id,
                          subject_type: 'Workspace'
                        }
                      })
                    });
                    
                    // Send email notification to Team Lead if we have their email
                    if (teamLeadEmail) {
                      await EmailService.sendEmail({
                        to: teamLeadEmail,
                        subject: `[IMPORTANT] Kantata Project Status Change - ${kantataProject.title || 'Project ' + review.kantata_project_id}`,
                        html: `
                          <h2>Kantata Project Status Change Notification</h2>
                          <p>Hello ${teamLead},</p>
                          <p>This is an automated notification to inform you that the Kantata project "${kantataProject.title || 'Project ' + review.kantata_project_id}" has been changed from "Live" to "In Development" status.</p>
                          <p><strong>Reason:</strong> The associated Graph Review "${review.title}" is not in Approved status (current status: ${review.status}).</p>
                          <p>Please complete the Graph Review approval process before setting the project to Live. You can access the Graph Review here: ${process.env.NEXT_PUBLIC_APP_URL || req.headers.origin}/reviews/${review.id}</p>
                          <p>This is an automated message from the Graph Review System.</p>
                        `
                      });
                    }
                  }
                }
              }
            } catch (remediationError) {
              console.error('Error during automatic remediation:', remediationError);
              message += ' - Failed to automatically update status: ' + (remediationError instanceof Error ? remediationError.message : 'Unknown error');
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
            message,
            teamLead,
            teamLeadEmail,
            statusChanged
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
    const statusChangedCount = validationResults.filter(r => r.statusChanged).length;
    
    let summaryMessage = `${validCount} valid, ${invalidCount} invalid out of ${totalChecked} projects checked.`;
    if (statusChangedCount > 0) {
      summaryMessage += ` ${statusChangedCount} Kantata projects automatically changed from Live to In Development.`;
    }
    
    return res.status(200).json({
      message: summaryMessage,
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