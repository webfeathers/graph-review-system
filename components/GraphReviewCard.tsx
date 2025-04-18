// components/GraphReviewCard.tsx
import React from 'react';
import Link from 'next/link';
import { Review } from '../types/supabase';
import StatusBadge from './StatusBadge';

interface GraphReviewCardProps {
  review: Review;
}

const GraphReviewCard: React.FC<GraphReviewCardProps> = ({ review }) => {
  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold">{review.title}</h3>
        <StatusBadge status={review.status} />
      </div>
      
      <p className="text-gray-600 mb-4">{review.description}</p>
      
      {review.graphImageUrl && (
        <div className="mb-4">
          <img 
            src={review.graphImageUrl} 
            alt="Graph visualization" 
            className="w-full h-40 object-cover rounded"
          />
        </div>
      )}
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Created: {new Date(review.created_at).toLocaleDateString()}</span>
        <Link href={`/reviews/${review.id}`} className="text-blue-500 hover:underline">
          View Discussion
        </Link>
      </div>
    </div>
  );
};

export default GraphReviewCard;