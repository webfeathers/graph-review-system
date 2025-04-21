// components/GraphReviewCard.tsx
import React from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';
import { ReviewWithProfile } from '../types/supabase';

interface GraphReviewCardProps {
  review: ReviewWithProfile;
}

const GraphReviewCard: React.FC<GraphReviewCardProps> = ({ review }) => {
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return original string if there's an error
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold">{review.title}</h3>
        <StatusBadge status={review.status} />
      </div>
      
      <p className="text-gray-600 mb-4">
        {review.description.length > 100
          ? `${review.description.substring(0, 100)}...`
          : review.description}
      </p>
      
      {review.graphImageUrl && (
        <div className="mb-4">
          <img 
            src={review.graphImageUrl} 
            alt="Graph visualization" 
            className="w-full h-40 object-cover rounded"
            onError={(e) => {
              console.error('Image failed to load:', review.graphImageUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Created: {formatDate(review.createdAt)}</span>
        <Link href={`/reviews/${review.id}`} className="text-blue-500 hover:underline">
          View Discussion
        </Link>
      </div>
    </div>
  );
};

export default GraphReviewCard;