// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { EmailService } from '../../../lib/emailService';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only allow POST requests (for manual triggering) or GET (for scheduled runs)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the Kantata API token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN;
    
    if (!KANTATA_API_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured'
      });
    }
    
    // Get all reviews that have Kantata project IDs
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, title, status, kantata_project_id, user_id')
      .not('kantata_project_id', 'is', null);
      
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching reviews',
        error: reviewsError.message
      });
    }
    
    if (!reviews || reviews.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No reviews with Kantata project IDs found',
        validationResults: []
      });
    }
    
    console.log(`Found ${reviews.length} reviews with Kantata project IDs`);
    
    // Process each review
    const validationResults = await Promise.all(
      reviews.map(async (review) => {
        try {
          // Get the project status from Kantata
          console.log(`Checking Kantata project ${review.kantata_project_id} for review ${review.id}`);
          
          const response = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.error(`Error fetching Kantata project ${review.kantata_project_id}:`, response.status);
            return {
              reviewId: review.id,
              reviewTitle: review.title,
              reviewStatus: review.status,
              kantataProjectId: review.kantata_project_id,
              kantataStatus: 'Unknown',
              isValid: true, // Assume valid if we can't get status
              message: `Failed to get Kantata project: ${response.status}`
            };
          }
          
          const data = await response.json();
          
          // Get the status from the project data
          const project = data.workspaces?.[review.kantata_project_id];
          if (!project) {
            console.error(`Project ${review.kantata_project_id} not found in Kantata response`);
            return {
              reviewId: review.id,
              reviewTitle: review.title,
              reviewStatus: review.status,
              kantataProjectId: review.kantata_project_id,
              kantataStatus: 'Unknown',
              isValid: true, // Assume valid if we can't get status
              message: 'Project not found in Kantata response'
            };
          }
          
          const kantataStatus = project.status || 'Unknown';
          console.log(`Kantata project ${review.kantata_project_id} status: ${kantataStatus}`);
          
          // Check if Kantata status is 'Live' but Graph Review status isn't 'Approved'
          const isValid = 
            kantataStatus !== 'Live' || 
            review.status === 'Approved';
          
          console.log(`Validation result for review ${review.id}: ${isValid ? 'Valid' : 'Invalid'}`);
          
          // If invalid, send notification and revert status in Kantata
          if (!isValid) {
            console.log(`Reverting status for Kantata project ${review.kantata_project_id}`);
            
            // Send email notification
            await sendNotification(review, kantataStatus);
            
            // Revert status in Kantata to 'Planning'
            await revertKantataStatus(review.kantata_project_id, KANTATA_API_TOKEN);
          }
          
          return {
            reviewId: review.id,
            reviewTitle: review.title,
            reviewStatus: review.status,
            kantataProjectId: review.kantata_project_id,
            kantataStatus,
            isValid,
            message: isValid ? 'Status is valid' : 'Status mismatch - reverted and notification sent'
          };
        } catch (error) {
          console.error(`Error validating review ${review.id}:`, error);
          return {
            reviewId: review.id,
            reviewTitle: review.title,
            reviewStatus: review.status,
            kantataProjectId: review.kantata_project_id,
            kantataStatus: 'Error',
            isValid: false,
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      })
    );
    
    // Check if any projects were reverted
    const revertedProjects = validationResults.filter(result => !result.isValid);
    
    // Return validation results
    return res.status(200).json({
      success: true,
      message: revertedProjects.length > 0 
        ? `${revertedProjects.length} projects were reverted` 
        : 'All projects are valid',
      validationResults
    });
  } catch (error) {
    console.error('Error validating statuses:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating statuses',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to send notification
async function sendNotification(review: any, kantataStatus: string) {
  try {
    // Get the review owner's email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', review.user_id)
      .single();
      
    if (profileError || !profile) {
      throw new Error('Could not find review owner profile');
    }
    
    // Get admin emails
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('role', 'Admin');
      
    if (adminsError) {
      throw new Error('Could not fetch admin profiles');
    }
    
    // Compile recipient list
    const recipients = [
      profile.email,
      ...(admins || []).map(admin => admin.email)
    ].filter(Boolean);
    
    if (recipients.length === 0) {
      throw new Error('No recipients found for notification');
    }
    
    // Send email
    const emailHtml = `
      <h1>Kantata Project Status Validation Failed</h1>
      <p>A status mismatch has been detected between Kantata and Graph Review:</p>
      <ul>
        <li><strong>Review Title:</strong> ${review.title}</li>
        <li><strong>Review ID:</strong> ${review.id}</li>
        <li><strong>Review Status:</strong> ${review.status}</li>
        <li><strong>Kantata Project ID:</strong> ${review.kantata_project_id}</li>
        <li><strong>Kantata Status:</strong> ${kantataStatus}</li>
      </ul>
      <p>The Kantata project has been set to Live, but the Graph Review is not yet Approved.</p>
      <p>Kantata status has been automatically reverted to Planning.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/reviews/${review.id}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Review</a></p>
    `;
    
    await EmailService.sendEmail({
      to: recipients,
      subject: `ALERT: Status Mismatch for ${review.title}`,
      html: emailHtml
    });
    
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Helper function to revert Kantata status
async function revertKantataStatus(kantataProjectId: string, token: string) {
  try {
    // Update the project status to 'Planning'
    const response = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspace: {
          status: 'Planning'  // Revert to Planning status
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to revert Kantata status: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log('Kantata status reverted successfully');
  } catch (error) {
    console.error('Error reverting Kantata status:', error);
    throw error;
  }
}

// Export the handler with admin authentication
export default withAdminAuth(handler);