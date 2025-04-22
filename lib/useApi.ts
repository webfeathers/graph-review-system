// lib/useApi.ts
import { useState, useCallback } from 'react';
import { APIError, ErrorService, NetworkError } from './errorService';
import { SessionService } from './sessionService';

interface UseApiOptions {
  requireAuth?: boolean;
  handleAuth?: boolean;
}

/**
 * Hook for making API calls with consistent error handling
 * 
 * @param options Configuration options for the hook
 */
export function useApi(options: UseApiOptions = {}) {
  const { requireAuth = true, handleAuth = true } = options;
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Make an API call with error handling
   * 
   * @param url The URL to call
   * @param options Fetch options
   * @param customErrorHandler Optional custom error handler
   * @returns The API response data
   */
  const callApi = useCallback(async <T = any>(
    url: string,
    options: RequestInit = {},
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token if required
      if (requireAuth) {
        const session = SessionService.getSession();
        
        if (!session) {
          throw new APIError('Authentication required', 401, 'auth_required');
        }
        
        const token = session.access_token;
        
        // Add authorization header
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }

      // Add default headers if not specified
      if (!options.headers) {
        options.headers = {
          'Content-Type': 'application/json'
        };
      }

      // Make the request
      let response: Response;
      try {
        response = await fetch(url, options);
      } catch (networkError) {
        // Handle network errors (offline, DNS failure, etc.)
        throw new NetworkError('Network request failed. Please check your connection.', 'network_failure', networkError);
      }

      // Handle HTTP error responses
      if (!response.ok) {
        // If we get a 401 Unauthorized error and we're handling auth,
        // try to refresh the token and retry the request
        if (handleAuth && response.status === 401) {
          const refreshed = await SessionService.refreshSession();
          
          if (refreshed) {
            // Retry the request with the new token
            options.headers = {
              ...options.headers,
              'Authorization': `Bearer ${refreshed.access_token}`
            };
            
            // Make the request again
            response = await fetch(url, options);
            
            // If still not OK, handle as a regular error
            if (!response.ok) {
              await ErrorService.handleApiError(response);
            }
          } else {
            // If refresh failed, handle as an auth error
            throw new APIError('Session expired. Please log in again.', 401, 'session_expired');
          }
        } else {
          // For other error statuses, handle normally
          await ErrorService.handleApiError(response);
        }
      }

      // Parse the response data
      let data: T;
      
      // Check if response is empty
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        
        if (!text) {
          // Empty response, return empty object
          data = {} as T;
        } else {
          // Try to parse as JSON, fallback to text
          try {
            data = JSON.parse(text) as T;
          } catch {
            // Return text as data
            data = text as unknown as T;
          }
        }
      }

      return data;
    } catch (err) {
      // Format and handle the error
      const formattedError = err instanceof Error ? err : new Error(String(err));
      
      // Log the error
      ErrorService.logError(formattedError, 'API');
      
      // Set the error state
      setError(formattedError);
      
      // Call custom error handler if provided
      if (customErrorHandler) {
        customErrorHandler(formattedError);
      } else if (err instanceof APIError && err.status === 401 && handleAuth) {
        // If auth error and no custom handler, redirect to login
        window.location.href = '/login';
      }
      
      // Re-throw the error for the caller to handle if needed
      throw formattedError;
    } finally {
      setLoading(false);
    }
  }, [requireAuth, handleAuth]);

  /**
   * Specialized method for GET requests
   */
  const get = useCallback(<T = any>(
    url: string,
    options?: Omit<RequestInit, 'method'>,
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    return callApi<T>(url, { ...options, method: 'GET' }, customErrorHandler);
  }, [callApi]);

  /**
   * Specialized method for POST requests
   */
  const post = useCallback(<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    const body = data ? JSON.stringify(data) : undefined;
    return callApi<T>(url, { ...options, method: 'POST', body }, customErrorHandler);
  }, [callApi]);

  /**
   * Specialized method for PUT requests
   */
  const put = useCallback(<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    const body = data ? JSON.stringify(data) : undefined;
    return callApi<T>(url, { ...options, method: 'PUT', body }, customErrorHandler);
  }, [callApi]);

  /**
   * Specialized method for PATCH requests
   */
  const patch = useCallback(<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestInit, 'method' | 'body'>,
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    const body = data ? JSON.stringify(data) : undefined;
    return callApi<T>(url, { ...options, method: 'PATCH', body }, customErrorHandler);
  }, [callApi]);

  /**
   * Specialized method for DELETE requests
   */
  const del = useCallback(<T = any>(
    url: string,
    options?: Omit<RequestInit, 'method'>,
    customErrorHandler?: (error: any) => void
  ): Promise<T> => {
    return callApi<T>(url, { ...options, method: 'DELETE' }, customErrorHandler);
  }, [callApi]);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Set a custom error
   */
  const setCustomError = useCallback((errorMessage: string) => {
    setError(new Error(errorMessage));
  }, []);

  return {
    loading,
    error,
    callApi,
    get,
    post,
    put,
    patch,
    del,
    clearError,
    setCustomError,
    // Helper for getting user-friendly error message
    errorMessage: error ? ErrorService.getUserMessage(error) : null
  };
}