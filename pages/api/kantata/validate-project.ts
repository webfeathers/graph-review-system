import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';
import { validateKantataProject } from '../../../lib/supabaseUtils';

// Response type for validation
type ValidationResponse = {
  success: boolean;
  message: string;
  data?: any; // Could include project details if needed
  error?: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ValidationResponse>,
  userId: string // Provided by withAuth
  // supabaseClient: SupabaseClient - Not needed here
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method Not Allowed',
      error: 'Only POST requests are accepted'
    });
  }

  const { kantataProjectId } = req.body;

  if (!kantataProjectId || typeof kantataProjectId !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Bad Request',
      error: 'kantataProjectId (string) is required in the request body.'
    });
  }

  try {
    console.log(`User ${userId} validating Kantata Project ID: ${kantataProjectId}`);
    // Call the validation function (which uses the server-side token)
    const validationResult = await validateKantataProject(kantataProjectId);

    if (validationResult.isValid) {
      return res.status(200).json({
        success: true,
        message: validationResult.message,
        data: validationResult.projectData // Pass back any relevant data
      });
    } else {
      // Project ID is invalid (not found, or already exists in a review)
      return res.status(409).json({ // 409 Conflict might be appropriate for existing review
        success: false,
        message: validationResult.message,
        data: validationResult.existingReview // Include existing review info if applicable
      });
    }

  } catch (error) {
    console.error('Error in /api/kantata/validate-project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during validation.';
    // Avoid exposing detailed errors like "Kantata API token not configured"
    const clientMessage = errorMessage.includes('Kantata API token not configured')
      ? 'Server configuration error.'
      : 'Failed to validate Kantata project.';
      
    return res.status(500).json({ 
      success: false, 
      message: clientMessage,
      error: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
    });
  }
}

// Wrap with authentication - only logged-in users should be able to trigger this
export default withAuth(handler); 