// pages/api/kantata/update-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the kantataProjectId and status from the request body
    const { kantataProjectId, status } = req.body;
    
    // Log request details for debugging
    console.log('Update status request:', {
      kantataProjectId,
      status,
      body: req.body
    });
    
    if (!kantataProjectId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kantataProjectId and status'
      });
    }
    
    // This is the key change - we're using the Graph Review status directly,
    // not transforming it to a Kantata status
    const graphReviewStatus = status;
    
    // Use environment variable or hardcoded token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN || 
                            "07c8e70750fee404afa7c4c5c8ff72cb31e5b215e993357dbc7c8cbbde60dbcc";
    
    // Use environment variable for field ID
    const fieldId = process.env.NEXT_PUBLIC_KANTATA_STATUS_FIELD_ID;
    
    console.log('Using Kantata field ID:', fieldId);
    
    if (!fieldId) {
      return res.status(400).json({
        success: false,
        message: 'Missing custom field ID in environment variables'
      });
    }
    
    // Try to get the custom field value ID first
    console.log('Getting current custom field value...');
    
    const getResponse = await fetch(`https://api.mavenlink.com/api/v1/custom_field_values?custom_field_id=${fieldId}&subject_id=${kantataProjectId}&subject_type=workspace`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.error('Error getting custom field value:', errorText);
      
      // If not found, try to create a new value
      if (getResponse.status === 404) {
        return await createCustomFieldValue(KANTATA_API_TOKEN, fieldId, kantataProjectId, graphReviewStatus, res);
      }
      
      return res.status(getResponse.status).json({
        success: false,
        message: 'Failed to find existing custom field value',
        details: errorText
      });
    }
    
    const getResponseData = await getResponse.json();
    console.log('Get custom field values response:', getResponseData);
    
    // Check if we found any existing values
    if (!getResponseData.results || getResponseData.results.length === 0) {
      // Create a new custom field value
      return await createCustomFieldValue(KANTATA_API_TOKEN, fieldId, kantataProjectId, graphReviewStatus, res);
    }
    
    // Get the ID of the first result
    const customFieldValueId = getResponseData.results[0].id;
    console.log('Found custom field value ID:', customFieldValueId);
    
    // Update the existing value
    const updatePayload = {
      custom_field_value: {
        value: graphReviewStatus
      }
    };
    
    const updateResponse = await fetch(`https://api.mavenlink.com/api/v1/custom_field_values/${customFieldValueId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Error updating custom field value:', errorText);
      
      return res.status(updateResponse.status).json({
        success: false,
        message: 'Failed to update custom field value',
        details: errorText
      });
    }
    
    const updateData = await updateResponse.json();
    
    return res.status(200).json({
      success: true,
      message: `Successfully updated Kantata custom field to Graph Review status: ${graphReviewStatus}`,
      data: updateData
    });
  } catch (error) {
    console.error('Error updating Kantata status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating Kantata status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to create a new custom field value
async function createCustomFieldValue(
  token: string,
  fieldId: string,
  projectId: string,
  status: string,
  res: NextApiResponse
) {
  console.log('Creating new custom field value...');
  
  const createPayload = {
    custom_field_value: {
      custom_field_id: fieldId,
      subject_id: projectId,
      subject_type: "workspace",
      value: status
    }
  };
  
  const createResponse = await fetch('https://api.mavenlink.com/api/v1/custom_field_values', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });
  
  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Error creating custom field value:', errorText);
    
    return res.status(createResponse.status).json({
      success: false,
      message: 'Failed to create custom field value',
      details: errorText
    });
  }
  
  const createData = await createResponse.json();
  
  return res.status(201).json({
    success: true,
    message: `Successfully created custom field with Graph Review status: ${status}`,
    data: createData
  });
}

// Wrap the handler with authentication middleware
export default withAuth(handler);