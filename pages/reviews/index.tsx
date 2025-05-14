// pages/reviews/index.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Components
import GraphReviewCard from '../../components/GraphReviewCard';
import { LoadingState } from '../../components/LoadingState';
import { withRoleProtection } from '../../components/withRoleProtection';
import StatusBadge from '../../components/StatusBadge';

// Hooks and Utils
import { useAuth } from '../../components/AuthProvider';
import { getReviews } from '../../lib/supabaseUtils';
import { supabase } from '../../lib/supabase';

// Types
import { ReviewWithProfile } from '../../types/supabase';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
  archived: boolean;
}

const ReviewsPage: NextPage = () => {
  const { user, loading: authLoading, session } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    if (authLoading) return;

    if (!user || !session) {
      router.push('/login');
      return;
    }

    const fetchReviewsWithCommentCounts = async () => {
      try {
        setLoading(true);
        
        // Fetch all reviews
        const reviewsData = await getReviews();
        
        if (reviewsData.length === 0) {
          setReviews([]);
          setLoading(false);
          return;
        }
        
        // Get all review IDs
        const reviewIds = reviewsData.map(review => review.id);
        
        // Initialize count map with zeros
        const countMap: Record<string, number> = {};
        reviewIds.forEach(id => {
          countMap[id] = 0;
        });
        
        // OPTIMIZED: Fetch all comments for these reviews in a single query
        const { data: comments, error: countError } = await supabase
          .from('comments')
          .select('review_id')
          .in('review_id', reviewIds);
          
        if (countError) {
          console.error('Error fetching comment counts:', countError);
          // Continue with zero comment counts
          setReviews(reviewsData.map(review => ({
            ...review,
            commentCount: 0,
            archived: false
          })));
          setLoading(false);
          return;
        }
        
        // Count comments in JavaScript
        if (comments && comments.length > 0) {
          comments.forEach(comment => {
            countMap[comment.review_id] = (countMap[comment.review_id] || 0) + 1;
          });
        }
        
        // Add comment counts to reviews
        const reviewsWithCounts = reviewsData.map(review => ({
          ...review,
          commentCount: countMap[review.id] || 0,
          archived: false
        }));
        
        setReviews(reviewsWithCounts);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewsWithCommentCounts();
  }, [user, session, authLoading, router]);

  const filteredReviews = reviews
    .filter(review => {
      // Filter by status
      if (filter !== 'All' && review.status !== filter) {
        return false;
      }
      return true;
    });

  if (authLoading || loading) {
    return <LoadingState />;
  }

  // Add navigation handler
  const handleViewDiscussion = async (reviewId: string) => {
    console.log('View Discussion clicked for review:', reviewId);
    try {
      await router.push(`/reviews/${reviewId}`);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback to window.location if router.push fails
      window.location.href = `/reviews/${reviewId}`;
    }
  };

  // List view component for a single review
  const ReviewListItem = ({ review, commentCount }: { review: ReviewWithProfile, commentCount: number }) => (
    <div className="py-4 px-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <div className="flex items-center space-x-3 mb-2">
            <StatusBadge status={review.status} />
            <button 
              onClick={() => handleViewDiscussion(review.id)} 
              className="text-lg font-semibold text-blue-600 hover:underline text-left"
            >
              {review.title}
            </button>
          </div>
          
          <div className="text-sm text-gray-600 mb-2">
            {review.description.length > 150 
              ? `${review.description.substring(0, 150)}...` 
              : review.description}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <Link href={`/profile/${review.user.id}`} className="hover:text-blue-600">
                {review.user.name}
              </Link>
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(review.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
            </div>
            
            {review.projectLead && (
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Lead: </span>
                <Link href={`/profile/${review.projectLead.id}`} className="ml-1 hover:text-blue-600">
                  {review.projectLead.name}
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => handleViewDiscussion(review.id)}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm whitespace-nowrap"
        >
          View Discussion
        </button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Reviews</h1>
        <Link
          href="/reviews/new"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          New Review
        </Link>
      </div>

      {/* Filter Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium mr-2">Filter:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('All')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'All' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('Draft')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'Draft' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setFilter('Submitted')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'Submitted' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Submitted
            </button>
            <button
              onClick={() => setFilter('In Review')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'In Review' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              In Review
            </button>
            <button
              onClick={() => setFilter('Needs Work')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'Needs Work' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Needs Work
            </button>
            <button
              onClick={() => setFilter('Approved')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'Approved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('Archived')}
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                filter === 'Archived' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="bg-white rounded-lg shadow">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reviews found
            </div>
          ) : (
            filteredReviews.map((review) => (
              <ReviewListItem
                key={review.id}
                review={review}
                commentCount={review.commentCount}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Wrap the component with withRoleProtection to allow access to all authenticated users
export default withRoleProtection(ReviewsPage, ['Member', 'Admin']);