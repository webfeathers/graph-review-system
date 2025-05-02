// lib/kantataService.ts
/**
 * Service for interacting with the Kantata API
 */

/**
 * Updates the actual status of a Kantata project (not just a custom field)
 * @param kantataProjectId The Kantata project ID
 * @param status The new status to set (e.g., "planning", "working", "completed")
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
    
    // Convert string status to the appropriate status ID
    // These values might need adjustment based on your Kantata instance
    const statusMap: Record<string, number> = {
      'Planning': 1,
      'Working': 2,
      'In Development': 3,
      'Completed': 4,
      'Live': 5,
      // Add other mappings as needed
    };
    
    // Get the status ID or use a default (2 = Working)
    const statusId = statusMap[status] || 2;
    
    // The payload for updating project status
    const updatePayload = {
      workspace: {
        status_key: statusId // Use status_key instead of status
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
        message: `Successfully updated project status to ${status} (ID: ${statusId})`,
        data: responseData
      };
    } catch (e) {
      return {
        success: true,
        message: `Successfully updated project status to ${status} (ID: ${statusId})`,
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

/**
 * Helper function to get all available workspace statuses
 * @param kantataApiToken The Kantata API token
 * @returns Available statuses or error
 */
export async function getKantataStatuses(kantataApiToken: string) {
  try {
    const response = await fetch('https://api.mavenlink.com/api/v1/workspace_statuses', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      return {
        success: false,
        message: `Failed to get statuses: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      data: data
    };
  } catch (error) {
    console.error('Error fetching workspace statuses:', error);
    return {
      success: false,
      message: 'Error fetching workspace statuses',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}