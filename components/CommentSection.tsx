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

const CommentSection: React.FC<CommentSectionProps> = ({ comments, reviewId }) => {
  const { user, session } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);

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
      
      // Clear the form
      form.resetForm();
      
      // Simply refresh the page to show the new comment
      // This is more reliable than trying to fetch comments separately
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