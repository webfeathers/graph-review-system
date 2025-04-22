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

const Reviews: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const fetchReviews = async () => {
      try {
        const data = await getReviews();
        setReviews(data);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user, authLoading, router]);

  const filteredReviews = filter === 'All' 
    ? reviews 
    : reviews.filter(review => review.status === filter);

  if (authLoading || loading) {
    return <LoadingState />;
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">All Graph Reviews</h1>
        
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <GraphReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reviews;