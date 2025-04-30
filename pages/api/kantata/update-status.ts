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
    
    // Map Graph Review status to acceptable values if needed
    // (You might need to adjust this based on your custom field's allowed values)
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
    
    // DIFFERENT APPROACH: Create a new custom field value directly
    // Skip the GET request that was failing
    console.log('Creating new custom field value directly...');
    
    const createPayload = {
      custom_field_value: {
        custom_field_id: fieldId,
        subject_id: kantataProjectId,
        subject_type: "workspace",
        value: graphReviewStatus
      }
    };
    
    console.log('Create payload:', JSON.stringify(createPayload));
    
    const createResponse = await fetch('https://api.mavenlink.com/api/v1/custom_field_values', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });
    
    console.log('Create response status:', createResponse.status);
    
    // Get the response text for debugging
    const responseText = await createResponse.text();
    console.log('Create response text:', responseText);
    
    let responseData;
    try {
      // Try to parse as JSON if possible
      responseData = JSON.parse(responseText);
    } catch (e) {
      // If not valid JSON, use the text
      responseData = { rawText: responseText };
    }
    
    // If creation was successful
    if (createResponse.ok) {
      return res.status(201).json({
        success: true,
        message: `Successfully created or updated custom field with Graph Review status: ${graphReviewStatus}`,
        data: responseData
      });
    }
    
    // If creation failed with a 422 (validation error), it might be because the value already exists
    // We need to find the existing ID and update it
    if (createResponse.status === 422) {
      console.log('Creation failed with 422, attempting to find and update existing value...');
      
      // Get all custom field values for this project
      const getProjectResponse = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}?include=custom_field_values`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!getProjectResponse.ok) {
        return res.status(getProjectResponse.status).json({
          success: false,
          message: 'Failed to get project data with custom field values',
          details: await getProjectResponse.text()
        });
      }
      
      const projectData = await getProjectResponse.json();
      console.log('Project data received, looking for custom field values...');
      
      // Find the custom field value for our field
      let customFieldValueId = null;
      
      // Extract custom field values from the project data
      if (projectData.workspaces && 
          projectData.workspaces[kantataProjectId] && 
          projectData.workspaces[kantataProjectId].custom_field_value_ids) {
        
        const fieldValueIds = projectData.workspaces[kantataProjectId].custom_field_value_ids;
        console.log('Custom field value IDs:', fieldValueIds);
        
        // Check each custom field value to find the one for our field
        for (const valueId of fieldValueIds) {
          if (projectData.custom_field_values && 
              projectData.custom_field_values[valueId] && 
              projectData.custom_field_values[valueId].custom_field_id === fieldId) {
            
            customFieldValueId = valueId;
            console.log('Found matching custom field value ID:', customFieldValueId);
            break;
          }
        }
      }
      
      // If we found a matching custom field value, update it
      if (customFieldValueId) {
        console.log('Updating existing custom field value:', customFieldValueId);
        
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
          return res.status(updateResponse.status).json({
            success: false,
            message: 'Failed to update custom field value',
            details: await updateResponse.text()
          });
        }
        
        const updateData = await updateResponse.json();
        
        return res.status(200).json({
          success: true,
          message: `Successfully updated existing custom field to Graph Review status: ${graphReviewStatus}`,
          data: updateData
        });
      }
      
      // If we couldn't find the custom field value, return an error
      return res.status(404).json({
        success: false,
        message: 'Could not find or create custom field value for this project',
        details: responseData
      });
    }
    
    // For other errors, return the error response
    return res.status(createResponse.status).json({
      success: false,
      message: 'Failed to create or update custom field value',
      details: responseData
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

// Wrap the handler with authentication middleware
export default withAuth(handler);