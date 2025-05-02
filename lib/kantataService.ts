// lib/kantataService.ts
/**
 * Service for interacting with the Kantata API
 */

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