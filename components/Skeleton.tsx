// components/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
  circle?: boolean;
}

/**
 * Skeleton loading component for content placeholders
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  rounded = false,
  circle = false,
}) => {
  const baseClasses = 'animate-pulse bg-gray-200';
  const roundedClasses = rounded ? 'rounded-md' : '';
  const circleClasses = circle ? 'rounded-full' : '';
  
  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height ? (typeof height === 'number' ? `${height}px` : height) : '16px',
  };
  
  return (
    <div 
      className={`${baseClasses} ${roundedClasses} ${circleClasses} ${className}`}
      style={style}
    />
  );
};