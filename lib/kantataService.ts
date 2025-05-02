// lib/kantataService.ts
/**
 * Service for interacting with the Kantata API
 */

/**
 * Updates a custom field value for a Kantata project
 * @param kantataProjectId The Kantata project ID
 * @param status The new status to set
 * @param kantataApiToken The Kantata API token
 * @returns Result of the update operation
 */
export async function updateKantataStatus(
  kantataProjectId: string,
  status: string,
  kantataApiToken: string
) {
  try {
    // Use the field ID from environment
    const fieldId = process.env.NEXT_PUBLIC_KANTATA_STATUS_FIELD_ID;
    
    if (!fieldId) {
      return {
        success: false,
        message: 'Missing custom field ID in environment variables'
      };
    }
    
    // Create payload for direct creation or update
    const createPayload = {
      custom_field_value: {
        custom_field_id: fieldId,
        subject_id: kantataProjectId,
        subject_type: "workspace",
        value: status
      }
    };
    
    console.log('Create payload:', JSON.stringify(createPayload));
    
    // Try to create the custom field value directly
    const createResponse = await fetch('https://api.mavenlink.com/api/v1/custom_field_values', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
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
      return {
        success: true,
        message: `Successfully created or updated custom field with status: ${status}`,
        data: responseData
      };
    }
    
    // If creation failed with a 422 (validation error), it might be because the value already exists
    // We need to find the existing ID and update it
    if (createResponse.status === 422) {
      console.log('Creation failed with 422, attempting to find and update existing value...');
      
      // Get all custom field values for this project
      const getProjectResponse = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}?include=custom_field_values`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${kantataApiToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!getProjectResponse.ok) {
        return {
          success: false,
          message: 'Failed to get project data with custom field values',
          details: await getProjectResponse.text()
        };
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
            value: status
          }
        };
        
        const updateResponse = await fetch(`https://api.mavenlink.com/api/v1/custom_field_values/${customFieldValueId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${kantataApiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        });
        
        if (!updateResponse.ok) {
          return {
            success: false,
            message: 'Failed to update custom field value',
            details: await updateResponse.text()
          };
        }
        
        const updateData = await updateResponse.json();
        
        return {
          success: true,
          message: `Successfully updated existing custom field to status: ${status}`,
          data: updateData
        };
      }
      
      // If we couldn't find the custom field value, return an error
      return {
        success: false,
        message: 'Could not find or create custom field value for this project',
        details: responseData
      };
    }
    
    // For other errors, return the error response
    return {
      success: false,
      message: 'Failed to create or update custom field value',
      details: responseData
    };
  } catch (error) {
    console.error('Error updating Kantata status:', error);
    return {
      success: false,
      message: 'Error updating Kantata status',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Updates the actual status of a Kantata project (not just a custom field)
 * @param kantataProjectId The Kantata project ID
 * @param status The new status to set (e.g., "In Development")
 * @param kantataApiToken The Kantata API token
 * @returns Result of the update operation
 */
export async function updateKantataProjectStatus(
  kantataProjectId: string,
  status: string,
  kantataApiToken: string
) {
  try {
    console.log(`Updating Kantata project status for ${kantataProjectId} to ${status}`);
    
    // The payload for updating project status
    const updatePayload = {
      workspace: {
        status: status
      }
    };
    
    console.log('Update payload:', JSON.stringify(updatePayload));
    
    // Update the workspace (project) status
    const updateResponse = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    console.log('Update response status:', updateResponse.status);
    
    // Get the response text for debugging
    const responseText = await updateResponse.text();
    console.log('Update response text:', responseText);
    
    if (!updateResponse.ok) {
      return {
        success: false,
        message: `Failed to update project status: ${updateResponse.status} ${updateResponse.statusText}`,
        details: responseText
      };
    }
    
    try {
      const responseData = JSON.parse(responseText);
      return {
        success: true,
        message: `Successfully updated project status to ${status}`,
        data: responseData
      };
    } catch (e) {
      return {
        success: true,
        message: `Successfully updated project status to ${status}`,
        data: { rawText: responseText }
      };
    }
  } catch (error) {
    console.error('Error updating Kantata project status:', error);
    return {
      success: false,
      message: 'Error updating Kantata project status',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}