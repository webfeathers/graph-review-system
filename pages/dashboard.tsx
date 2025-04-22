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

const Dashboard: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    // Fetch only the user's reviews
    const fetchReviews = async () => {
      try {
        const data = await getReviews(user.id);
        setReviews(data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
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
      </div>

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

        {reviews.length === 0 ? (
          <EmptyState
            message="You haven't submitted any graph reviews yet."
            action={
              <Link
                href="/reviews/new"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 inline-block mt-2"
              >
                Submit Your First Review
              </Link>
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
    </Layout>
  );
};

export default Dashboard;