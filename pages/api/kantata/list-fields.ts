// pages/api/kantata/list-fields.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Use environment variable or hardcoded token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN || 
                            "07c8e70750fee404afa7c4c5c8ff72cb31e5b215e993357dbc7c8cbbde60dbcc"; // Replace with your token
    
    console.log('Using Kantata API token:', 
                KANTATA_API_TOKEN.substring(0, 4) + '...' + 
                KANTATA_API_TOKEN.substring(KANTATA_API_TOKEN.length - 4));
    
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
      const errorText = await response.text();
      console.error('Error from Kantata API:', errorText);
      
      return res.status(response.status).json({
        success: false,
        message: `Kantata API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }
    
    // Get the raw response data
    const data = await response.json();
    
    // Pass the entire response to the client
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