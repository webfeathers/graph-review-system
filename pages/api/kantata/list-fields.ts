// pages/api/kantata/list-fields.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Get the OAuth token from your environment variables
    const KANTATA_API_TOKEN = process.env.KANTATA_API_TOKEN;
    
    if (!KANTATA_API_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured'
      });
    }
    
    // Call the Kantata API to get custom fields
    const response = await fetch('https://api.mavenlink.com/api/v1/custom_fields', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Kantata API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
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