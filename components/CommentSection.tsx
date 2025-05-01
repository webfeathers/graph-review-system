// components/commentSection.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Comment } from '../models/Comment';
import { User } from '../models/User';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';
import { ErrorDisplay } from './ErrorDisplay';
import { Form, TextArea, SubmitButton } from './form/FormComponents';
import { useForm } from '../lib/useForm';
import { createValidator, required, maxLength } from '../lib/validationUtils';
import { FIELD_LIMITS } from '../constants';

interface CommentSectionProps {
  comments: (Comment & { user: User })[];
  reviewId: string;
}

interface CommentFormValues {
  content: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments: initialComments, reviewId }) => {
  const { user, session } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  // Sort comments to show newest first
  const comments = [...initialComments].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Define validation schema
  const validationSchema = {
    content: createValidator(
      required('Comment cannot be empty'),
      maxLength(FIELD_LIMITS.COMMENT_MAX_LENGTH, `Comment must be no more than ${FIELD_LIMITS.COMMENT_MAX_LENGTH} characters`)
    )
  };

  // Initialize form
  const form = useForm<CommentFormValues>({
    initialValues: {
      content: ''
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: handleSubmit
  });

  async function handleSubmit(values: CommentFormValues) {
    try {
      // Clear previous errors
      setGeneralError(null);
      
      if (!user) {
        setGeneralError('User not authenticated');
        return;
      }
      
      // Get current token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Simple spinner indicator that we're posting
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.textContent = 'Posting...';
        submitButton.setAttribute('disabled', 'true');
      }
      
      console.log('Submitting comment:', { 
        content: values.content.substring(0, 20) + '...', 
        reviewId 
      });
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          content: values.content, 
          reviewId 
        }),
      });
      
      // Get the response text for better debugging
      const responseText = await response.text();
      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      
      // Try to parse as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error(`Server responded with: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(responseData.message || `Error: ${response.status} ${response.statusText}`);
      }
      
      // Clear the form
      form.resetForm();
      
      // Simply refresh the page to show the new comment
      router.reload();
    } catch (error) {
      console.error('Error posting comment:', error);
      
      if (error instanceof Error) {
        setGeneralError(error.message || 'Failed to post comment');
      } else {
        setGeneralError('An unexpected error occurred');
      }
      
      form.setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Discussion</h3>
      
      {generalError && (
        <ErrorDisplay 
          error={generalError} 
          onDismiss={() => setGeneralError(null)} 
          variant="error"
          className="mb-4"
        />
      )}
      
      <Form onSubmit={form.handleSubmit} className="mb-6">
        <TextArea
          id="content"
          name="content"
          label="Add your comment"
          placeholder="Share your thoughts on this graph review..."
          value={form.values.content}
          onChange={form.handleChange('content')}
          onBlur={form.handleB