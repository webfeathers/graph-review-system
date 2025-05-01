// lib/supabaseUtils.ts - getCommentsByReviewId function

/**
 * Get comments for a review with optimized query
 * 
 * @param reviewId The review ID to get comments for
 * @returns Array of comments with user profile data
 */
export const getCommentsByReviewId = async (reviewId: string) => {
  try {
    // OPTIMIZED: Use a single query with join to get comments and profiles
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          created_at,
          role
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
    
    if (!comments || comments.length === 0) {
      return [];
    }
    
    // Transform to frontend format with proper type safety
    const commentsWithProfiles: CommentWithProfile[] = comments.map(comment => {
      // Extract profile from the join result with proper type checking
      const profile = comment.profiles;
      
      if (!profile) {
        // Fallback if profile not found
        return {
          id: comment.id,
          content: comment.content,
          reviewId: comment.review_id,
          userId: comment.user_id,
          createdAt: comment.created_at,
          user: {
            id: comment.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: comment.created_at,
            role: 'Member'
          }
        };
      }
      
      // Create the comment with profile
      return {
        id: comment.id,
        content: comment.content,
        reviewId: comment.review_id,
        userId: comment.user_id,
        createdAt: comment.created_at,
        user: {
          id: profile.id,
          name: profile.name || 'Unknown User',
          email: profile.email || '',
          createdAt: profile.created_at,
          role: profile.role || 'Member'
        }
      };
    });
    
    return commentsWithProfiles;
  } catch (err) {
    console.error('Error in getCommentsByReviewId:', err);
    throw err;
  }
};