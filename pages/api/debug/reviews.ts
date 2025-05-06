import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { Role } from '../../../types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface Review {
  id: string;
  title: string;
  kantata_project_id: string | null;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) {
  try {
    // Get all reviews
    console.log('Testing database connection...');
    
    // First, let's just get ONE review to test the connection
    const { data: testReview, error: testError } = await supabaseClient
      .from('reviews')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('Database connection error:', testError);
      throw new Error(`Database connection error: ${testError.message}`);
    }
    
    console.log('Database connection successful. Test review:', testReview);
    
    // Now get all reviews with more detailed logging
    console.log('Fetching all reviews...');
    const { data: reviews, error: reviewsError, count } = await supabaseClient
      .from('reviews')
      .select('*', { count: 'exact' });
      
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error(`Error fetching reviews: ${reviewsError.message}`);
    }
    
    console.log('Query completed. Count:', count);
    console.log('Raw reviews data:', reviews);
    
    if (!reviews || reviews.length === 0) {
      console.log('No reviews found');
      return res.status(200).json({ 
        message: 'No reviews found.',
        reviews: []
      });
    }
    
    console.log(`Found ${reviews.length} reviews:`, reviews.map((r: Review) => ({
      id: r.id,
      title: r.title,
      kantataId: r.kantata_project_id
    })));
    
    return res.status(200).json({
      message: `Found ${reviews.length} reviews.`,
      reviews: reviews.map((r: Review) => ({
        id: r.id,
        title: r.title,
        kantataId: r.kantata_project_id
      }))
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

export default withAdminAuth(handler); 