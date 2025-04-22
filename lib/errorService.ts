// lib/errorService.ts
/**
 * Custom error types for better error classification
 */
export class AppError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'auth_error', details?: any) {
    super(message, code, details);
    this.name = 'AuthError';
  }
}

export class APIError extends AppError {
  public status: number;

  constructor(message: string, status: number, code: string = 'api_error', details?: any) {
    super(message, code, details);
    this.name = 'APIError';
    this.status = status;
  }
}

export class ValidationError extends AppError {
  public field?: string;

  constructor(message: string, field?: string, code: string = 'validation_error', details?: any) {
    super(message, code, details);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends AppError {
  constructor(message: string, code: string = 'network_error', details?: any) {
    super(message, code, details);
    this.name = 'NetworkError';
  }
}

/**
 * Error handling utilities
 */
export class ErrorService {
  /**
   * Format an error into a consistent structure
   * 
   * @param error The error to format
   * @returns A formatted error object
   */
  static formatError(error: any): { 
    message: string; 
    code: string; 
    type: string;
    details?: any;
    field?: string;
    status?: number;
  } {
    if (error instanceof AppError) {
      // Return formatted custom error
      return {
        message: error.message,
        code: error.code,
        type: error.name,
        details: error.details,
        ...(error instanceof ValidationError && { field: error.field }),
        ...(error instanceof APIError && { status: error.status })
      };
    } else if (error instanceof Error) {
      // Format standard Error object
      return {
        message: error.message,
        code: 'unknown_error',
        type: error.name,
        details: error.stack
      };
    } else if (typeof error === 'string') {
      // Handle string errors
      return {
        message: error,
        code: 'string_error',
        type: 'StringError'
      };
    } else {
      // Fallback for other error types
      return {
        message: 'An unknown error occurred',
        code: 'unknown_error',
        type: 'UnknownError',
        details: error
      };
    }
  }

  /**
   * Handle an API response error
   * 
   * @param response The fetch response object
   * @returns Promise that rejects with a formatted APIError
   */
  static async handleApiError(response: Response): Promise<never> {
    let errorData: any;

    try {
      // Try to parse the error response as JSON
      errorData = await response.json();
    } catch {
      // If it's not JSON, get the text or use a fallback message
      errorData = {
        message: await response.text() || `API error: ${response.status} ${response.statusText}`
      };
    }

    const message = errorData.message || errorData.error || `API error: ${response.status} ${response.statusText}`;
    const code = errorData.code || `api_${response.status}`;
    const details = errorData.details || errorData;

    throw new APIError(message, response.status, code, details);
  }

  /**
   * Log an error with consistent formatting
   * 
   * @param error The error to log
   * @param context Additional context for the error
   */
  static logError(error: any, context: string = 'Application'): void {
    const formattedError = this.formatError(error);
    
    console.error(
      `[${context}] ${formattedError.type}: ${formattedError.message}`,
      {
        code: formattedError.code,
        details: formattedError.details,
        ...(formattedError.field && { field: formattedError.field }),
        ...(formattedError.status && { status: formattedError.status })
      }
    );
    
    // Could also integrate with an error monitoring service here
    // e.g., Sentry, LogRocket, etc.
  }

  /**
   * Get a user-friendly error message for display
   * 
   * @param error The error to format
   * @param fallbackMessage A fallback message if error can't be formatted
   * @returns A user-friendly error message
   */
  static getUserMessage(error: any, fallbackMessage: string = 'An unexpected error occurred'): string {
    if (error instanceof ValidationError) {
      return error.message; // Validation errors are already user-friendly
    } else if (error instanceof AuthError) {
      // Auth errors should be user-friendly
      return error.message.replace(/^Error: /, '');
    } else if (error instanceof APIError) {
      if (error.status === 404) {
        return 'The requested resource could not be found.';
      } else if (error.status === 403) {
        return 'You do not have permission to perform this action.';
      } else if (error.status === 401) {
        return 'Please log in to continue.';
      } else if (error.status >= 500) {
        return 'A server error occurred. Please try again later.';
      } else {
        // For other API errors, use the message if it's user-friendly, or a generic message
        return error.message || fallbackMessage;
      }
    } else if (error instanceof NetworkError) {
      return 'Network error. Please check your internet connection and try again.';
    } else if (error instanceof Error) {
      // For regular errors, use a generic message
      return fallbackMessage;
    } else if (typeof error === 'string') {
      // For string errors, use the string if it seems user-friendly
      return error.length < 100 ? error : fallbackMessage;
    }
    
    return fallbackMessage;
  }
}