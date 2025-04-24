// components/commentSection.tsx
import React, { useState, useEffect } from 'react';
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
  const [comments, setComments] = useState<(Comment & { user: User })[]>(initialComments);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Function to fetch comments
  const fetchComments = async () => {
    try {
      // Get current token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      const response = await fetch(`/api/comments?reviewId=${reviewId}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch comments');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        // Transform the data to match the expected format
        const formattedComments = data.data.map((comment: any) => ({
          id: comment.id,
          content: comment.content,
          reviewId: comment.review_id,
          userId: comment.user_id,
          createdAt: new Date(comment.created_at),
          user: {
            id: comment.profiles.id,
            name: comment.profiles.name,
            email: comment.profiles.email,
            password: '', // not needed but required by type
            createdAt: new Date(comment.profiles.created_at)
          }
        }));
        
        setComments(formattedComments);
        return formattedComments;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      setGeneralError('Failed to load comments. Please try again.');
      return [];
    }
  };

  async function handleSubmit(values: CommentFormValues) {
    try {
      // Clear previous errors and messages
      setGeneralError(null);
      setSuccessMessage(null);
      
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to post comment');
      }
      
      const result = await response.json();
      
      // Clear the form
      form.resetForm();
      
      // Show success message
      setSuccessMessage('Comment posted successfully');
      
      // Fetch updated comments instead of refreshing the whole page
      await fetchComments();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
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
      
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-4 rounded-md mb-4 relative">
          <p>{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="absolute top-2 right-2 text-green-700 hover:text-green-900"
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}
      
      <Form onSubmit={form.handleSubmit} className="mb-6">
        <TextArea
          id="content"
          name="content"
          label="Add your comment"
          placeholder="Share your thoughts on this graph review..."
          value={form.values.content}
          onChange={form.handleChange('content')}
          onBlur={form.handleBlur('content')}
          error={form.errors.content}
          touched={form.touched.content}
          required
          rows={4}
          helpText={`Maximum ${FIELD_LIMITS.COMMENT_MAX_LENGTH} characters`}
          containerClassName="mb-4"
        />
        
        <SubmitButton
          isSubmitting={form.isSubmitting}
          label="Post Comment"
          submittingLabel="Posting..."
          disabled={form.isSubmitting || !user}
          className="w-full md:w-auto"
        />
      </Form>
      
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500">No comments yet. Be the first to start the discussion!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b pb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{comment.user.name}</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p>{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;