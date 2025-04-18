// components/ReviewCardSkeleton.tsx
import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Skeleton for a review card during loading
 */
export const ReviewCardSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <Skeleton width="60%" height={24} />
        <Skeleton width={80} height={28} rounded />
      </div>
      
      <Skeleton width="100%" height={20} className="mb-2" />
      <Skeleton width="90%" height={20} className="mb-2" />
      <Skeleton width="40%" height={20} className="mb-4" />
      
      <Skeleton width="100%" height={160} className="mb-4" rounded />
      
      <div className="flex justify-between items-center">
        <Skeleton width={120} height={16} />
        <Skeleton width={100} height={16} />
      </div>
    </div>
  );
};