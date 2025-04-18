// components/CommentSkeleton.tsx
import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for a comment during loading
 */
export const CommentSkeleton: React.FC = () => {
  return (
    <div className="border-b pb-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <Skeleton width={32} height={32} circle className="mr-2" />
          <Skeleton width={120} height={16} />
        </div>
        <Skeleton width={80} height={14} />
      </div>
      
      <Skeleton width="100%" height={16} className="mb-1" />
      <Skeleton width="90%" height={16} className="mb-1" />
      <Skeleton width="40%" height={16} />
    </div>
  );
};