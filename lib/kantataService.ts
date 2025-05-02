// lib/kantataService.ts
/**
 * Updates the status of a Kantata project
 * @param kantataProjectId The Kantata project ID
 * @param status The new status to set (e.g. 'In Development', 'Live')
 * @param kantataApiToken The Kantata API token
 * @returns Result of the update operation
 */
export async function updateKantataStatus(
  kantataProjectId: string,
  status: string,
  kantataApiToken: string
) {
  try {
    // Map status strings to Kantata status keys
    let statusKey: number;
    switch (status) {
      case 'Live':
        statusKey = 306; // Key for "Live"
        break;
      case 'In Development':
        statusKey = 305; // Key for "In Development"
        break;
      default:
        statusKey = 305; // Default to "In Development" if status is unknown
    }
    
    // Direct API call to update project status
    const kantataUpdateUrl = `https://api.mavenlink.com/api/v1/workspaces/${kantataProjectId}`;
    
    // The status update payload
    const statusUpdatePayload = {
      workspace: {
        status_key: statusKey
      }
    };
    
    const updateResponse = await fetch(kantataUpdateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${kantataApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusUpdatePayload)
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      return {
        success: false,
        message: `Failed to update Kantata status: API error ${updateResponse.status}`,
        details: errorText
      };
    }
    
    const responseData = await updateResponse.json();
    
    return {
      success: true,
      message: `Successfully updated Kantata project status to ${status}`,
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error updating Kantata status',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}