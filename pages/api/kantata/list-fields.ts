// pages/api/kantata/list-fields.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // Get the Kantata API token from environment variables
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN;
    
    // Check if token exists
    if (!KANTATA_API_TOKEN) {
      console.error('Kantata API token not configured in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Kantata API is not properly configured. Please contact an administrator.'
      });
    }
    
    console.log('Using Kantata API token from environment variables');
    
    // Fetch all pages of custom fields
    let allResults: any[] = [];
    let allCustomFields: any = {};
    let currentPage = 1;
    let totalPages = 1;
    let totalCount = 0;
    
    // Keep fetching until we've got all pages
    do {
      console.log(`Fetching custom fields page ${currentPage}...`);
      
      // Call the Kantata API with pagination
      const response = await fetch(`https://api.mavenlink.com/api/v1/custom_fields?page=${currentPage}&per_page=50`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Page ${currentPage} response status:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error from Kantata API:', errorText);
        
        return res.status(response.status).json({
          success: false,
          message: `Failed to fetch data from Kantata API`,
          details: 'External API error'
        });
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract pagination info
      if (currentPage === 1) {
        totalCount = data.count || 0;
        // Estimate total pages based on count and per_page
        totalPages = Math.ceil(totalCount / 50);
        console.log(`Found ${totalCount} total custom fields across ${totalPages} pages`);
      }
      
      // Merge the results
      if (data.results) {
        allResults = [...allResults, ...data.results];
      }
      
      // Merge the custom fields objects
      if (data.custom_fields) {
        allCustomFields = { ...allCustomFields, ...data.custom_fields };
      }
      
      // Move to next page
      currentPage++;
    } while (currentPage <= totalPages);
    
    // Compile the final response
    const combinedData = {
      count: totalCount,
      results: allResults,
      custom_fields: allCustomFields,
      meta: {
        total_pages: totalPages,
        total_count: totalCount
      }
    };
    
    console.log(`Successfully fetched all ${totalCount} custom fields`);
    
    return res.status(200).json({
      success: true,
      fields: combinedData
    });
  } catch (error) {
    console.error('Error fetching Kantata custom fields:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching data from Kantata'
    });
  }
}

export default withAuth(handler);