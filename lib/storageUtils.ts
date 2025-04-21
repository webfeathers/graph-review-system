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