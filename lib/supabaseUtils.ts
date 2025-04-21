// lib/supabaseUtils.ts - Updated getReviews function
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Create admin client to bypass RLS when needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = typeof window === 'undefined' ? 
  createClient(supabaseUrl, supabaseServiceKey) : null;

// Reviews
export async function getReviews(userId?: string) {
  try {
    // Use admin client on server-side to bypass RLS
    const client = typeof window === 'undefined' && supabaseAdmin ? 
      supabaseAdmin : supabase;
    
    console.log('Fetching reviews', userId ? `for user ID: ${userId}` : 'for all users');
    
    // Basic query to get reviews without relying on relationships
    let query = client.from('reviews').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    // Order by creation date, newest first
    query = query.order('created_at', { ascending: false });

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      throw error; // Let the caller handle this error
    }

    // If no reviews, return empty array
    if (!reviews || reviews.length === 0) {
      console.log('No reviews found');
      return [];
    }

    console.log(`Found ${reviews.length} reviews`);

    // Get unique user IDs from reviews
    const userIds = [...new Set(reviews.map(review => review.user_id))];
    
    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Continue anyway, we'll use fallback data
    }
    
    // Create frontend format reviews with profile information
    const frontendReviews = reviews.map(review => {
      // Find matching profile, or use fallback
      const profile = profiles?.find(p => p.id === review.user_id);
      
      // Convert review to frontend format
      const frontendReview = {
        id: review.id,
        title: review.title,
        description: review.description,
        graphImageUrl: review.graph_image_url,
        status: review.status,
        userId: review.user_id,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      };
      
      if (profile) {
        // Use the found profile
        return {
          ...frontendReview,
          user: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdAt: profile.created_at
          }
        };
      } else {
        // Fallback for missing profile
        return {
          ...frontendReview,
          user: {
            id: review.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: review.created_at
          }
        };
      }
    });
    
    return frontendReviews;
  } catch (err) {
    console.error('Unexpected error in getReviews:', err);
    throw err; // Let the caller handle this error
  }
}

// Export the rest of the functions from the original file
// ... rest of the original supabaseUtils.ts code ...