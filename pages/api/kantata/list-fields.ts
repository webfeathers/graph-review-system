// pages/api/kantata/list-fields.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only allow GET requests 
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the OAuth token from your environment variables
    const KANTATA_API_TOKEN = process.env.KANTATA_API_TOKEN;
    
    if (!KANTATA_API_TOKEN) {
      console.error('Kantata API token not configured');
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured'
      });
    }
    
    console.log('Fetching Kantata custom fields...');
    
    // Call the Kantata API to get custom fields
    const response = await fetch('https://api.mavenlink.com/api/v1/custom_fields', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Kantata API response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `API responded with status ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = `Kantata API error: ${JSON.stringify(errorData)}`;
        console.error(errorMessage);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
      }
      
      return res.status(response.status).json({
        success: false,
        message: errorMessage
      });
    }
    
    const data = await response.json();
    console.log('Successfully fetched Kantata custom fields');
    
    return res.status(200).json({
      success: true,
      fields: data
    });
  } catch (error) {
    console.error('Error fetching Kantata custom fields:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAuth(handler);