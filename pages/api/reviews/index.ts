import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { reviewValidationSchema } from '../../../lib/validationSchemas';
import { validateForm, FormErrors } from '../../../lib/validationUtils';
import { createReview } from '../../../lib/supabaseUtils'; // Assuming createReview handles DB interaction
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js'; // Import type

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
      
      // Validate the incoming data
      const validationErrors = validateForm(formData, reviewValidationSchema);
      
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