// pages/reviews/index.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import GraphReviewCard from '../../components/GraphReviewCard';
import { useAuth } from '../../components/AuthProvider';
import { getReviews } from '../../lib/supabaseUtils';
import { ReviewWithProfile } from '../../types/supabase';
import { LoadingState } from '../../components/LoadingState';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import StatusBadge from '../../components/StatusBadge';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

const Reviews: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchReviewsWithCommentCounts = async () => {
      try {
        // Fetch all reviews
        const reviewsData = await getReviews();
        
        // For each review, fetch comment count
        const reviewsWithCounts = await Promise.all(
          reviewsData.map(async (review) => {
            // Query to count comments for this review
            const { count, error } = await supabase
              .from('comments')
              .select('id', { count: 'exact', head: true })
              .eq('review_id', review.id);
              
            return {
              ...review,
              commentCount: count || 0
            };
          })
        );
        
        setReviews(reviewsWithCounts);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewsWithCommentCounts();
  }, [user, authLoading, router]);

  const filteredReviews = filter === 'All' 
    ? reviews 
    : reviews.filter(review => review.status === filter);

  if (authLoading || loading) {
    return <LoadingState />;
  }

  // List view component for a single review
  const ReviewListItem = ({ review, commentCount }: { review: ReviewWithProfile, commentCount: number }) => (
    <div className="border-b py-4 flex flex-col md:flex-row md:items-center">
      <div className="flex-grow mb-2 md:mb-0">
        <div className="flex items-start justify-between">
          <Link href={`/reviews/${review.id}`} className="text-lg font-semibold text-blue-600 hover:underline">
            {review.title}
          </Link>
          <StatusBadge status={review.status} />
        </div>
        <div className="text-sm text-gray-500 mt-1">
          By {review.user.name} on {new Date(review.createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
        </div>
      </div>
      <Link 
        href={`/reviews/${review.id}`} 
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm self-start md:self-center"
      >
        View Discussion
      </Link>
    </div>
  );

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All Graph Reviews</h1>
          <div className="flex items-center space-x-3">
            {/* View toggle buttons */}
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'card'
                    ? 'bg-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                aria-label="Card View"
                title="Card View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                aria-label="List View"
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* New Review button */}
            <Link
              href="/reviews/new"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              New Review
            </Link>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {['All', 'Submitted', 'In Review', 'Needs Work', 'Approved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded ${
                filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No reviews found with the selected status.</p>
          </div>
        ) : viewMode === 'card' ? (
          // Card view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <GraphReviewCard 
                key={review.id} 
                review={review} 
                commentCount={review.commentCount}
              />
            ))}
          </div>
        ) : (
          // List view
          <div className="bg-white rounded-lg shadow divide-y">
            {filteredReviews.map((review) => (
              <ReviewListItem 
                key={review.id} 
                review={review} 
                commentCount={review.commentCount}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reviews;