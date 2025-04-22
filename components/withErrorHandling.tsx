// components/withErrorHandling.tsx
import React, { useState, useCallback } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { ErrorService } from '../lib/errorService';

interface WithErrorHandlingProps {
  errorDisplayProps?: Partial<React.ComponentProps<typeof ErrorDisplay>>;
}

/**
 * Higher-order component that adds error handling to any component
 * 
 * @param WrappedComponent The component to wrap with error handling
 * @param options Configuration options
 */
export function withErrorHandling<P extends object>(
  WrappedComponent: React.ComponentType<P & WithErrorHandlingInjectedProps>,
  options: WithErrorHandlingProps = {}
) {
  // Component to return
  return function WithErrorHandling(props: P) {
    const [error, setError] = useState<Error | null>(null);
    
    // Handler to clear the error
    const clearError = useCallback(() => {
      setError(null);
    }, []);
    
    // Handler to set a new error
    const handleError = useCallback((err: any) => {
      console.error('Error caught by withErrorHandling:', err);
      
      // Format and log the error
      const formattedError = err instanceof Error ? err : new Error(String(err));
      ErrorService.logError(formattedError, 'Component');
      
      // Set the error state
      setError(formattedError);
      
      // Return the error for further handling if needed
      return formattedError;
    }, []);
    
    // Get user-friendly error message
    const errorMessage = error ? ErrorService.getUserMessage(error) : null;
    
    return (
      <>
        {error && (
          <ErrorDisplay 
            error={error}
            onDismiss={clearError}
            {...options.errorDisplayProps}
          />
        )}
        <WrappedComponent
          {...props as P}
          error={error}
          errorMessage={errorMessage}
          handleError={handleError}
          clearError={clearError}
        />
      </>
    );
  };
}

// Props injected by the HOC
export interface WithErrorHandlingInjectedProps {
  error: Error | null;
  errorMessage: string | null;
  handleError: (error: any) => Error;
  clearError: () => void;
}

/**
 * Example usage:
 * 
 * function MyComponent({ data, error, errorMessage, handleError, clearError }) {
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (err) {
 *       handleError(err);
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleClick}>Do something risky</button>
 *     </div>
 *   );
 * }
 * 
 * export default withErrorHandling(MyComponent, {
 *   errorDisplayProps: {
 *     variant: 'warning',
 *     autoHideDuration: 5000
 *   }
 * });
 */