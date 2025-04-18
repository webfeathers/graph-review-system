// lib/validation.ts
/**
 * Validation utility functions for form inputs
 */

/**
 * Validates a review title
 * @param title The title to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateReviewTitle(title: string): string {
  if (!title.trim()) {
    return 'Title is required';
  }
  
  if (title.length > 100) {
    return 'Title must be 100 characters or less';
  }
  
  return '';
}

/**
 * Validates a review description
 * @param description The description to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateReviewDescription(description: string): string {
  if (!description.trim()) {
    return 'Description is required';
  }
  
  if (description.length > 2000) {
    return 'Description must be 2000 characters or less';
  }
  
  return '';
}

/**
 * Validates a comment
 * @param comment The comment to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateComment(comment: string): string {
  if (!comment.trim()) {
    return 'Comment cannot be empty';
  }
  
  if (comment.length > 1000) {
    return 'Comment must be 1000 characters or less';
  }
  
  return '';
}

/**
 * Validates a file upload for images
 * @param file The file to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateImageUpload(file: File | null): string {
  if (!file) {
    return ''; // File is optional
  }
  
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return 'File must be an image (JPEG, PNG, GIF, or WEBP)';
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return 'File size must be less than 5MB';
  }
  
  return '';
}

/**
 * Validates an email address
 * @param email The email to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validateEmail(email: string): string {
  if (!email.trim()) {
    return 'Email is required';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  
  return '';
}

/**
 * Validates a password
 * @param password The password to validate
 * @returns An error message if invalid, empty string if valid
 */
export function validatePassword(password: string): string {
  if (!password) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  
  return '';
}