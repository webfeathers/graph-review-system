// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Components and Hooks
import { 
  GraphReviewCard, 
  LoadingState, 
  EmptyState,
  useAuth 
} from '../components';

// API
import { getReviews } from '../lib/api';
import { supabase } from '../lib/supabase';

// Types
import { ReviewWithProfile } from '../types/supabase';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

const Dashboard: NextPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    // Fetch only the user's reviews with comment counts
    const fetchReviewsWithCommentCounts = async () => {
      try {
        // Get the user's reviews
        const reviewsData = await getReviews(user.id);
        
        // Filter out reviews with 'Approved' status
        const activeReviews = reviewsData.filter(review => review.status !== 'Approved');
        
        // For each review, fetch comment count
        const reviewsWithCounts = await Promise.all(
          activeReviews.map(async (review) => {
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

  if (authLoading || loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!user) return null;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.name || user.user_metadata?.name || user.email}!</p>
        {profile && (
          <p className="text-gray-600 mt-2">
            You have {profile.reviewCount ?? 0} reviews and {profile.commentCount ?? 0} comments, totaling {profile.points ?? 0} points.
          </p>
        )}
        {profile?.badges && profile.badges.length > 0 && (
          <div className="mt-2 flex space-x-2">
            {profile.badges.map((badge) => (
              <span key={badge} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                {badge}
              </span>
            ))}
          </div>
        )}
        <p>This app should replace the 
          <Link
            href="https://docs.google.com/presentation/d/1nkoiTak8G3vkOt8UcYYOai5S7dYxnEjziYf0bK4RFgw/edit#slide=id.g13a8af19432_0_229"
            target="_blank"
            className="text-blue-500 hover:underline p-1"
          >
            process
          </Link>
           and the  
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSfKnIiFZe7BTBbE_qZU0RKjbMMZsbVQPOpjCcZfZc9-Ca_82Q/formResponse"
            target="_blank"
            className="text-blue-500 hover:underline p-1"
          >
            Google form
          </Link>.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Active Graph Reviews</h2>
          <Link
            href="/reviews/new"
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            New Review
          </Link>
        </div>

        {reviews.length === 0 ? (
          <EmptyState
            message="You don't have any active graph reviews. Approved reviews are not shown here."
            action={
              <Link
                href="/reviews/new"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 inline-block mt-2"
              >
                Submit a New Review
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <GraphReviewCard 
                key={review.id} 
                review={review} 
                commentCount={review.commentCount}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Optional: Add a section to see approved reviews */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">View All Reviews</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Need to see your approved reviews or reviews from other users? 
          Visit the reviews page to see all reviews in the system.
        </p>
        
        <Link
          href="/reviews"
          className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 inline-block"
        >
          View All Reviews
        </Link>
      </div>
    </>
  );
};

export default Dashboard;