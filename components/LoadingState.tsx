// components/LoadingState.tsx
import React from 'react';

/**
 * Props for the LoadingState component
 */
interface LoadingStateProps {
  /** Optional message to display below the loading spinner */
  message?: string;
}

/**
 * A simple loading indicator component that displays a spinning animation
 * with an optional message.
 * 
 * @example
 * // Basic usage
 * <LoadingState />
 * 
 * @example
 * // With custom message
 * <LoadingState message="Fetching data..." />
 * 
 * @example
 * // In a loading context
 * {isLoading ? (
 *   <LoadingState message="Processing your request..." />
 * ) : (
 *   <YourComponent />
 * )}
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
};
