// components/ErrorDisplay.tsx
import React, { useState, useEffect } from 'react';
import { ErrorService } from '../lib/errorService';

interface ErrorDisplayProps {
  error: Error | string | null;
  onDismiss?: () => void;
  autoHideDuration?: number; // in milliseconds
  variant?: 'error' | 'warning' | 'info';
  className?: string;
  testId?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  autoHideDuration,
  variant = 'error',
  className = '',
  testId = 'error-display'
}) => {
  const [visible, setVisible] = useState(!!error);

  // Reset visibility when error changes
  useEffect(() => {
    setVisible(!!error);
  }, [error]);

  // Auto-hide logic
  useEffect(() => {
    if (error && autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [error, autoHideDuration, onDismiss]);

  // If no error or not visible, render nothing
  if (!error || !visible) return null;
  
  // Get the error message to display
  const errorMessage = typeof error === 'string' 
    ? error 
    : ErrorService.getUserMessage(error);

  // Style based on variant
  const variantStyles = {
    error: 'bg-red-100 text-red-700 border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    info: 'bg-blue-100 text-blue-700 border-blue-300'
  }[variant];

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) onDismiss();
  };
  
  return (
    <div 
      className={`p-4 rounded-md mb-4 border relative ${variantStyles} ${className}`}
      role="alert"
      data-testid={testId}
    >
      <div className="flex items-start">
        {/* Icon based on variant */}
        <div className="flex-shrink-0 mr-3">
          {variant === 'error' && (
            <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'info' && (
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        
        {/* Error message */}
        <div className="flex-grow">
          <p>{errorMessage}</p>
        </div>
        
        {/* Dismiss button */}
        {onDismiss && (
          <button 
            onClick={handleDismiss}
            className={`flex-shrink-0 ml-2 p-1 rounded-full hover:bg-${variant === 'error' ? 'red' : variant === 'warning' ? 'yellow' : 'blue'}-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${variant === 'error' ? 'red' : variant === 'warning' ? 'yellow' : 'blue'}-500`}
            aria-label="Dismiss error"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};