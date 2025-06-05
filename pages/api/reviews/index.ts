import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { reviewValidationSchema } from '../../../lib/validationSchemas';
import { validateForm, FormErrors } from '../../../lib/validationUtils';
import { createReview } from '../../../lib/supabaseUtils'; // Assuming createReview handles DB interaction
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js'; // Import type
import { sendSlackNotification } from '../../../lib/slack';

// Define response data type (can be shared or defined here)
type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  errors?: FormErrors<any>; // For validation errors
};

async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<ResponseData>,
  userId: string, // Provided by withAuth
  supabaseClient: SupabaseClient, // <<< Accept the scoped client
  userRole?: Role // Provided by withAuth if roles are checked
) {
  // <<< Log the received client object >>>
  console.log('[POST /api/reviews] Received supabaseClient:', typeof supabaseClient, Object.keys(supabaseClient || {}));
  
  // Handle POST request for creating a new review
  if (req.method === 'POST') {
    try {
      console.log('Processing POST /api/reviews request');
      
      const formData = req.body;
      // Determine review type
      const isTemplate = formData.reviewType === 'template';
      // Dynamically build validation schema
      const schema = isTemplate
        ? {
            title: reviewValidationSchema.title,
            description: reviewValidationSchema.description,
            graphName: reviewValidationSchema.graphName,
            projectLeadId: reviewValidationSchema.projectLeadId,
            status: reviewValidationSchema.status,
            // Add any other template-specific fields if needed
          }
        : reviewValidationSchema; // full schema for customer reviews
      // Validate the incoming data
      const validationErrors = validateForm(formData, schema);
      
      // If validation fails, return errors
      if (Object.keys(validationErrors).length > 0) {
        console.log('Server-side validation failed:', validationErrors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }
      
      console.log('Server-side validation passed');
      
      // Prepare data for creation (add userId, default status, etc.)
      const reviewDataToCreate = {
        ...formData,
        userId: userId, // Add the authenticated user ID
        status: 'Draft' // Set initial status
      };
      
      // Call createReview, passing the SCOPED client
      const newReview = await createReview(reviewDataToCreate, supabaseClient);
      
      console.log('Review created successfully:', newReview.id);
      
      // Fetch the user's real name for the Slack notification
      let userName = userId;
      try {
        const { data: userProfile, error: userProfileError } = await supabaseClient
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single();
        if (userProfile && userProfile.name) {
          userName = userProfile.name;
        }
      } catch (profileErr) {
        console.error('Failed to fetch user profile for Slack notification:', profileErr);
      }
      // Send Slack notification
      try {
        const reviewUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/reviews/${newReview.id}`;
        await sendSlackNotification(`A new graph review was created by ${userName}: <${reviewUrl}|${newReview.title || 'Untitled Review'}>`);
      } catch (slackError) {
        console.error('Failed to send Slack notification:', slackError);
      }
      
      return res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: newReview
      });
      
    } catch (error) {
      console.error('Error creating review:', error); // Log detailed error server-side
      
      // Determine message based on environment
      const isProduction = process.env.NODE_ENV === 'production';
      const errorMessage = isProduction 
        ? 'An internal server error occurred while creating the review.'
        : (error instanceof Error ? error.message : 'An unexpected error occurred');
        
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create review', // Keep a general message
        error: errorMessage // Send generic or detailed error based on env
      });
    }
  }
  
  // Handle GET request for listing reviews (optional, could be separate)
  // if (req.method === 'GET') { ... }

  // Handle unsupported methods
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

// Export the handler wrapped with authentication
export default withAuth(handler); 