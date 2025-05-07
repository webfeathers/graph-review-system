// pages/reviews/index.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Components
import GraphReviewCard from '../../components/GraphReviewCard';
import { LoadingState } from '../../components/LoadingState';
import { withRoleProtection } from '../../components/withRoleProtection';

// Hooks and Utils
import { useAuth } from '../../components/AuthProvider';
import { getReviews } from '../../lib/supabaseUtils';
import { supabase } from '../../lib/supabase';

// Types
import { ReviewWithProfile } from '../../types/supabase';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

const ReviewsPage: NextPage = () => {
  const { user, loading: authLoading, session } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

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
            commentCount: 0
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
          commentCount: countMap[review.id] || 0
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

  const filteredReviews = filter === 'All' 
    ? reviews 
    : reviews.filter(review => review.status === filter);

  if (authLoading || loading) {
    return <LoadingState />;
  }

  // Get status color for the list view indicator
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-gray-200';
      case 'In Review':
        return 'bg-blue-200';
      case 'Needs Work':
        return 'bg-yellow-200';
      case 'Approved':
        return 'bg-[#d1f0e1]';
      default:
        return 'bg-gray-200';
    }
  };

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
    <div className="py-4 px-2 flex">
      {/* Status indicator on the left side */}
      <div className="mr-4 flex flex-col items-center">
        <div className={`w-2 h-full rounded-full ${getStatusColor(review.status)}`}></div>
      </div>
      
      {/* Review content */}
      <div className="flex-grow flex flex-col md:flex-row md:items-center">
        <div className="flex-grow mb-2 md:mb-0">
          <div className="flex items-start justify-between">
            <button 
              onClick={() => handleViewDiscussion(review.id)} 
              className="text-lg font-semibold text-blue-600 hover:underline text-left"
            >
              {review.title}
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            By {review.user.name} on {new Date(review.createdAt).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
          </div>
        </div>
        <button 
          onClick={() => handleViewDiscussion(review.id)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm self-start md:self-center"
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

      {/* Filter and View Mode Controls */}
      <div className="flex justify-between items-center mb-6">
        {/* Status Filter */}
        <div>
          <label htmlFor="statusFilter" className="mr-2 text-sm font-medium">Filter:</label>
          <select
            id="statusFilter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="All">All</option>
            <option value="Submitted">Submitted</option>
            <option value="In Review">In Review</option>
            <option value="Needs Work">Needs Work</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
        {/* View Mode Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1 rounded ${viewMode === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >Card View</button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >List View</button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        // Render based on viewMode and use filteredReviews
        viewMode === 'card' ? (
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
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <ReviewListItem
                key={review.id}
                review={review}
                commentCount={review.commentCount}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

// Wrap the component with withRoleProtection to allow access to all authenticated users
export default withRoleProtection(ReviewsPage, ['Member', 'Admin']);