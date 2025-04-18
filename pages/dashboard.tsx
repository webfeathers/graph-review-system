// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import GraphReviewCard from '../components/GraphReviewCard';
import { useAuth } from '../components/AuthProvider';
import { getReviews } from '../lib/supabaseUtils';
import { Review } from '../types/supabase';

const Dashboard: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // If not authenticated, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchUserReviews = async () => {
      try {
        const userReviews = await getReviews(user.id);
        setReviews(userReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserReviews();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.user_metadata?.name || user?.email}!</p>
      </div>

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
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">You haven't submitted any graph reviews yet.</p>
            <button
              onClick={() => router.push('/reviews/new')}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              Create Your First Review
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((review) => (
              <GraphReviewCard 
                key={review.id} 
                review={{
                  id: review.id,
                  title: review.title,
                  description: review.description,
                  graph_image_url: review.graph_image_url, // Changed from graphImageUrl
                  status: review.status,
                  userId: review.user_id || review.userId, // Handle both naming conventions
                  createdAt: review.created_at || review.createdAt,
                  updatedAt: review.updated_at || review.updatedAt
                }} 
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;