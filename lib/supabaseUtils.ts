// lib/supabaseUtils.ts
export async function getReviews(userId?: string) {
  try {
    // Basic query to get reviews without relying on relationships
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Error fetching reviews:', error);
      return []; // Return empty array instead of throwing
    }

    // If no reviews, return empty array
    if (!reviews || reviews.length === 0) {
      return [];
    }

    // Get unique user IDs from reviews
    const userIds = [...new Set(reviews.map(review => review.user_id))];
    
    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }
    
    // Create frontend format reviews with profile information
    const frontendReviews: ReviewWithProfile[] = reviews.map(review => {
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
    return []; // Return empty array on any error
  }
}