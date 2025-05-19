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
    // Call the validation function
    const validationResult = await validateKantataProject(kantataProjectId);

    if (validationResult.isValid) {
      return res.status(200).json({
        success: true,
        message: validationResult.message,
        data: validationResult.projectData // Pass back any relevant data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: validationResult.message
      });
    }
  } catch (error) {
    console.error('Error validating Kantata project:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

// Wrap with authentication - only logged-in users should be able to trigger this
export default withAuth(handler); 