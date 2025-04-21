// lib/storageUtils.ts
import { supabase } from './supabase';
import { StorageBucket, MAX_FILE_SIZES, ALLOWED_IMAGE_TYPES } from '../constants';

/**
 * Validates a file before upload
 * @param file The file to validate
 * @param options Validation options
 * @returns Error message if invalid, empty string if valid
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): string {
  const { 
    maxSize = MAX_FILE_SIZES.IMAGE,
    allowedTypes = ALLOWED_IMAGE_TYPES
  } = options;
  
  // Check file size
  if (file.size > maxSize) {
    return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
  }// lib/supabaseUtils.ts
import { supabase } from './supabase';
import { 
  Review, Comment, Profile, ReviewWithProfile, CommentWithProfile,
  DbReview, DbComment, DbProfile,
  dbToFrontendReview, dbToFrontendComment, dbToFrontendProfile,
  dbToFrontendReviewWithProfile, dbToFrontendCommentWithProfile
} from '../types/supabase';

// Reviews
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
    // Using Array.from instead of spread operator for ES5 compatibility
    const reviewUserIds = reviews.map(review => review.user_id);
    const userIdsSet = new Set(reviewUserIds);
    const userIds = Array.from(userIdsSet);
    
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

export async function getReviewById(id: string) {
  try {
    // Fetch the review
    const { data: review, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching review:', error);
      throw error;
    }

    if (!review) {
      throw new Error('Review not found');
    }

    // Fetch the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', review.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // Convert to frontend format
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

    // Create review with profile
    return {
      ...frontendReview,
      user: profile 
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            createdAt: profile.created_at
          }
        : {
            id: review.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: review.created_at
          }
    };
  } catch (err) {
    console.error('Error in getReviewById:', err);
    throw err;
  }
}

export async function createReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbReviewData: any = {
    title: reviewData.title,
    description: reviewData.description,
    graph_image_url: reviewData.graphImageUrl,
    status: reviewData.status,
    user_id: reviewData.userId
  };

  const { data, error } = await supabase
    .from('reviews')
    .insert(dbReviewData)
    .select()
    .single();

  if (error) {
    console.error('Error creating review:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    graphImageUrl: data.graph_image_url,
    status: data.status,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateReviewStatus(id: string, status: Review['status'], userId: string) {
  // First check if the user is the owner of the review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existingReview || existingReview.user_id !== userId) {
    throw new Error('Unauthorized to update this review');
  }

  const { data, error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating review status:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    graphImageUrl: data.graph_image_url,
    status: data.status,
    userId: data.user_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Comments
export async function getCommentsByReviewId(reviewId: string) {
  try {
    // Fetch comments without using relationships
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get unique user IDs - using Array.from for ES5 compatibility
    const commentUserIds = comments.map(comment => comment.user_id);
    const userIdsSet = new Set(commentUserIds);
    const userIds = Array.from(userIdsSet);
    
    // Fetch profiles separately
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
      
    if (profilesError) {
      console.error('Error fetching profiles for comments:', profilesError);
    }
    
    // Transform to frontend format
    const frontendComments: CommentWithProfile[] = comments.map(comment => {
      // Find matching profile, or use fallback
      const profile = profiles?.find(p => p.id === comment.user_id);
      
      // Convert comment to frontend format
      const frontendComment = {
        id: comment.id,
        content: comment.content,
        reviewId: comment.review_id,
        userId: comment.user_id,
        createdAt: comment.created_at
      };
      
      if (profile) {
        // Use the found profile
        return {
          ...frontendComment,
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
          ...frontendComment,
          user: {
            id: comment.user_id,
            name: 'Unknown User',
            email: '',
            createdAt: comment.created_at
          }
        };
      }
    });
    
    return frontendComments;
  } catch (err) {
    console.error('Error in getCommentsByReviewId:', err);
    throw err;
  }
}

export async function createComment(commentData: Omit<Comment, 'id' | 'createdAt'>) {
  // Convert the camelCase to snake_case for the database
  const dbCommentData: any = {
    content: commentData.content,
    review_id: commentData.reviewId,
    user_id: commentData.userId
  };
  
  const { data, error } = await supabase
    .from('comments')
    .insert(dbCommentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw error;
  }

  return {
    id: data.id,
    content: data.content,
    reviewId: data.review_id,
    userId: data.user_id,
    createdAt: data.created_at
  };
}

// Profiles
export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    createdAt: data.created_at
  };
}

export async function updateProfile(profileData: Partial<Profile> & { id: string }) {
  // Convert camelCase to snake_case for the database
  const dbProfileData: any = {
    id: profileData.id,
    name: profileData.name,
    email: profileData.email
  };
  
  // Remove undefined fields
  Object.keys(dbProfileData).forEach(key => 
    dbProfileData[key] === undefined && delete dbProfileData[key]
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(dbProfileData)
    .eq('id', profileData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    createdAt: data.created_at
  };
}
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return `File type not supported. Allowed types: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
  }
  
  return '';
}

/**
 * Uploads a file to a Supabase storage bucket
 * @param file The file to upload
 * @param bucket The bucket name
 * @param options Upload options
 * @returns URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  bucket: StorageBucket,
  options: {
    path?: string;
    makePublic?: boolean;
  } = {}
): Promise<string> {
  const { path = '', makePublic = true } = options;
  
  // Create a unique file name
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = path 
    ? `${path}/${timestamp}_${safeFileName}`
    : `${timestamp}_${safeFileName}`;
    
  // Check if the bucket exists
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      throw new Error(`Failed to check storage buckets: ${bucketError.message}`);
    }
    
    const bucketExists = buckets.some(b => b.name === bucket);
    
    if (!bucketExists) {
      throw new Error(`Storage bucket "${bucket}" not found. Please create it in your Supabase dashboard.`);
    }
  } catch (error) {
    console.error('Bucket verification error:', error);
    throw error;
  }
  
  // Upload the file
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    if (!data || !data.path) {
      throw new Error('Upload succeeded but file path is missing');
    }
    
    // Get the URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

/**
 * Deletes a file from a Supabase storage bucket
 * @param url The URL of the file to delete
 * @param bucket The bucket name
 * @returns Success status
 */
export async function deleteFile(url: string, bucket: StorageBucket): Promise<boolean> {
  try {
    // Extract the file path from the URL
    const baseUrl = supabase.storage.from(bucket).getPublicUrl('').data.publicUrl;
    const filePath = url.replace(baseUrl, '');
    
    if (!filePath) {
      throw new Error('Could not determine file path from URL');
    }
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
      
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('File deletion error:', error);
    return false;
  }
}