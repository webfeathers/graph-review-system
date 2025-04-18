// components/ErrorDisplay.tsx
import React from 'react';

interface ErrorDisplayProps {
  error: string;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onDismiss }) => {
  if (!error) return null;
  
  return (
    <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4 relative">
      <p>{error}</p>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="absolute top-2 right-2 text-red-700 hover:text-red-900"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
};