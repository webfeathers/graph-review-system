// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';
import { getReviews } from '../lib/supabaseUtils';
import { Review, ReviewWithProfile } from '../types/supabase';
import GraphReviewCard from '../components/GraphReviewCard';

const Dashboard: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [userReviews, setUserReviews] = useState<ReviewWithProfile[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login');
      } else {
        // User is authenticated, fetch their reviews
        setPageLoading(false);
        fetchUserReviews();
      }
    }
  }, [user, loading, router]);

  const fetchUserReviews = async () => {
    setReviewsLoading(true);
    try {
      // Make sure we're passing the user ID to get only their reviews
      console.log('Fetching reviews for user ID:', user?.id);
      const reviews = await getReviews(user?.id);
      console.log('Fetched reviews:', reviews);
      setUserReviews(reviews);
    } catch (err) {
      console.error('Error fetching user reviews:', err);
      setError('Failed to load your reviews. Please try again later.');
    } finally {
      setReviewsLoading(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 ml-3">Loading...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.user_metadata?.name || user?.email}!</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
            {error}
          </div>
        )}

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Graph Reviews</h2>
            <Link
              href="/reviews/new"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              New Review
            </Link>
          </div>

          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-gray-600 ml-3">Loading your reviews...</p>
            </div>
          ) : userReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userReviews.map((review) => (
                <GraphReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">You haven't submitted any graph reviews yet.</p>
              <Link
                href="/reviews/new"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Create Your First Review
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity Section - Can be expanded later */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-gray-500 text-center">
              Activity tracking will be available soon!
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;