// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';
import GraphReviewCard from '../components/GraphReviewCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { getReviews } from '../lib/supabaseUtils';
import { ReviewWithProfile } from '../types/supabase';

const Dashboard: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login');
      } else {
        // User is authenticated, fetch data
        fetchUserReviews();
      }
    }
  }, [user, authLoading, router]);

  const fetchUserReviews = async () => {
    setPageLoading(true);
    try {
      console.log('Fetching reviews for user:', user?.id);
      const userReviews = await getReviews(user?.id);
      console.log('Fetched reviews:', userReviews);
      setReviews(userReviews);
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Failed to load reviews');
    } finally {
      setPageLoading(false);
    }
  };

  if (authLoading || (pageLoading && !error)) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.user_metadata?.name || user?.email}!</p>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Graph Reviews</h2>
          <button
            onClick={() => router.push('/reviews/new')}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            New Review
          </button>
        </div>

        {reviews.length === 0 ? (
          <EmptyState 
            message="You haven't submitted any graph reviews yet."
            action={
              <button
                onClick={() => router.push('/reviews/new')}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mt-4"
              >
                Create Your First Review
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <GraphReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>

      {/* Debug section - remove in production */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <p>User ID: {user?.id}</p>
          <p>Reviews count: {reviews.length}</p>
          <pre className="mt-2 p-2 bg-gray-200 rounded overflow-auto max-h-40 text-xs">
            {JSON.stringify({ user, reviews }, null, 2)}
          </pre>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;