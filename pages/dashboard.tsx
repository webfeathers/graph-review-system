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
import { ErrorDisplay } from '../components/ErrorDisplay';
import { Button } from '../components/Button';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

// Interface for validation result
interface ValidationResult {
  reviewId: string;
  reviewTitle: string;
  reviewStatus: string;
  kantataProjectId: string;
  kantataStatus: string;
  isValid: boolean;
  message: string;
}

const Dashboard: NextPage = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New state for validation
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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


  const runValidation = async () => {
    try {
      setValidating(true);
      setMessage(null);
      setError(null);  // Make sure error is always set to a string or null
      setResults([]);
      
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
      
      // Safely set results - make sure validationResults exists and is an array
      if (data && Array.isArray(data.validationResults)) {
        setResults(data.validationResults);
      } else {
        console.warn('Expected validationResults array but got:', data);
        // Initialize as empty array if not present or not an array
        setResults([]);
      }
      
      // Show success message
      setMessage(data.message || 'Validation complete!');
    } catch (error) {
      console.error('Error running validation:', error);
      // Make sure we're setting a string for the error
      setError(typeof error === 'string' ? error : 
               error instanceof Error ? error.message : 
               'An unexpected error occurred');
    } finally {
      setValidating(false);
    }
  };

  // ... rest of your component ...

  {error && (
    <ErrorDisplay
      error={error} // Make sure this is always a string
      onDismiss={() => setError(null)}
      className="mb-4"
    />
  )}

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

      {/* Show Validation section for admins */}
      {isAdmin && isAdmin() && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kantata Status Validation</h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              Validate the status of all projects in Kantata to ensure they match the Graph Review status.
              This will check for projects marked as "Live" in Kantata that don't have "Approved" status in Graph Review.
            </p>
            
            <Button
              onClick={runValidation}
              variant="primary"
              isLoading={validating}
              disabled={validating}
              className="mt-2"
            >
              {validating ? 'Validating...' : 'Run Validation Now'}
            </Button>
          </div>
          
          {message && (
            <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
              {message}
            </div>
          )}
          
          {error && (
            <ErrorDisplay
              error={error}
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}
          
          {results && results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Validation Results</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kantata Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index} className={result.isValid ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2">
                          <Link href={`/reviews/${result.reviewId}`} className="text-blue-500 hover:underline">
                            {result.reviewTitle || 'Untitled Review'}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{result.reviewStatus || 'Unknown'}</td>
                        <td className="px-4 py-2"><p>Status: {typeof result.kantataStatus === 'string'
  ? result.kantataStatus
  : result.kantataStatus.message}</p></td>
                        <td className="px-4 py-2">
                          {result.isValid 
                            ? <span className="text-green-600">✓ Valid</span> 
                            : <span className="text-red-600">✗ {result.message || 'Invalid'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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