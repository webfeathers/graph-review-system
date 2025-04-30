// lib/kantataService.ts
interface KantataAuth {
  token: string;
  workspaceId: string;
}

export class KantataService {
  private static baseUrl = 'https://api.mavenlink.com/api/v1';
  private static token: string;
  
  /**
   * Initialize the Kantata API service with credentials
   */
  static initialize(token: string): void {
    this.token = token;
  }
  
  /**
   * Update a custom field value in Kantata
   * 
   * @param projectId The Kantata project ID
   * @param customFieldId The ID of the custom field to update
   * @param value The new value to set
   * @returns Success status and response data
   */
  static async updateCustomField(
    projectId: string, 
    customFieldId: string, 
    value: string | number | boolean
  ): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (!this.token) {
        throw new Error('Kantata API not initialized. Call initialize() first.');
      }
      
      // Create the API endpoint
      const url = `${this.baseUrl}/custom_field_values/${customFieldId}`;
      
      // Prepare the request body
      const body = {
        custom_field_value: {
          subject_id: projectId,
          subject_type: 'workspace',
          value: value
        }
      };
      
      // Make the API request
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      });
      
      // Check for errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Kantata API error: ${errorData.message || response.statusText}`);
      }
      
      // Parse and return the response
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error updating Kantata custom field:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get the current status of a project in Kantata
   * 
   * @param projectId The Kantata project ID
   * @returns Project data including custom fields
   */
  static async getProjectStatus(
    projectId: string
  ): Promise<{ success: boolean; status?: string; data?: any; error?: any }> {
    try {
      if (!this.token) {
        throw new Error('Kantata API not initialized. Call initialize() first.');
      }
      
      // Create the API endpoint
      const url = `${this.baseUrl}/workspaces/${projectId}?include=custom_field_values`;
      
      // Make the API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      // Check for errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Kantata API error: ${errorData.message || response.statusText}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      // Extract the status from custom fields
      let status = 'Unknown';
      if (data.workspaces && data.workspaces[projectId]) {
        // This is a placeholder - you'll need to find the actual status field
        // based on your Kantata setup
        status = data.workspaces[projectId].status || 'Unknown';
      }
      
      return { success: true, status, data };
    } catch (error) {
      console.error('Error getting Kantata project status:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}