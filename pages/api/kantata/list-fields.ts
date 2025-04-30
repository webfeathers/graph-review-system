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
    
    // Debug info
    const debugInfo = {
      tokenExists: !!KANTATA_API_TOKEN,
      tokenLength: KANTATA_API_TOKEN ? KANTATA_API_TOKEN.length : 0,
      tokenPrefix: KANTATA_API_TOKEN ? KANTATA_API_TOKEN.substring(0, 5) + '...' : null
    };
    
    if (!KANTATA_API_TOKEN) {
      console.error('Kantata API token not configured');
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured',
        debug: debugInfo
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
    
    // Debug info for response
    const responseDebugInfo = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      ...debugInfo
    };
    
    if (!response.ok) {
      let errorMessage = `API responded with status ${response.status}`;
      let errorData = null;
      
      try {
        errorData = await response.json();
        errorMessage = `Kantata API error: ${JSON.stringify(errorData)}`;
        console.error(errorMessage);
      } catch (parseError) {
        console.error('Could not parse error response:', parseError);
        
        // Try to get the text instead
        try {
          const text = await response.text();
          errorData = { rawText: text };
        } catch (textError) {
          console.error('Could not get response text:', textError);
        }
      }
      
      return res.status(response.status).json({
        success: false,
        message: errorMessage,
        error: errorData,
        debug: responseDebugInfo
      });
    }
    
    // Successfully got a response, let's try to parse it
    let data;
    try {
      data = await response.json();
      console.log('Successfully fetched Kantata custom fields');
    } catch (parseError) {
      console.error('Error parsing successful response:', parseError);
      
      // Try to get the text
      const text = await response.text();
      return res.status(500).json({
        success: false,
        message: 'Failed to parse Kantata API response',
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        rawResponse: text.substring(0, 1000), // First 1000 chars for debugging
        debug: responseDebugInfo
      });
    }
    
    return res.status(200).json({
      success: true,
      fields: data,
      debug: responseDebugInfo
    });
  } catch (error) {
    console.error('Error fetching Kantata custom fields:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}

export default withAuth(handler);