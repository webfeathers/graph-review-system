// components/GraphReviewCard.tsx

import React from 'react';
import Link from 'next/link';
import { ReviewWithProfile } from '../types/supabase';
import StatusBadge from './StatusBadge';

interface GraphReviewCardProps {
  review: ReviewWithProfile;
  commentCount?: number;
}

const GraphReviewCard: React.FC<GraphReviewCardProps> = ({ review, commentCount = 0 }) => {
  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-semibold">{review.title}</h3>
        <StatusBadge status={review.status} />
      </div>
      
      <p className="text-gray-600 mb-4">{review.description.length > 100 
        ? `${review.description.substring(0, 100)}...` 
        : review.description}</p>
      
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
        <div>
          <div>Created by {review.user.name} on {new Date(review.createdAt).toLocaleDateString()}</div>
          {review.projectLead && (
            <div className="mt-1">
              Project Lead: {review.projectLead.name}
            </div>
          )}
          
          {/* Comment count badge */}
          <div className="mt-1 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>
        
        <Link href={`/reviews/${review.id}`} className="text-blue-500 hover:underline">
          View Discussion
        </Link>
      </div>
    </div>
  );
};

export default GraphReviewCard;