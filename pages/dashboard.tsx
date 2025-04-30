// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';
import { getReviews } from '../lib/supabaseUtils';
import { ReviewWithProfile } from '../types/supabase';
import GraphReviewCard from '../components/GraphReviewCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

const Dashboard: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
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

const runValidation = async () => {
  try {
    setValidating(true);
    
    // Get auth token
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    // Call your API endpoint
    const response = await fetch('/api/kantata/validate-projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to validate projects');
    }
    
    const data = await response.json();
    setResults(data.validationResults);
    
    // Show success message
    setMessage(`Validation complete! ${data.message}`);
  } catch (error) {
    setError(error instanceof Error ? error.message : 'An unexpected error occurred');
  } finally {
    setValidating(false);
  }
};

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
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.user_metadata?.name || user.email}!</p>
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
    </Layout>
  );
};

export default Dashboard;