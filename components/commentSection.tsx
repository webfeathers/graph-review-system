// components/commentSection.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Comment, CommentWithProfile, Profile } from '../types';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { ErrorDisplay } from './ErrorDisplay';
import { Form, TextArea, SubmitButton } from './form/FormComponents';
import { useForm } from '../lib/useForm';
import { commentValidationSchema } from '../lib/validationSchemas';
import { createComment } from '../lib/supabaseUtils';

interface CommentSectionProps {
  comments: CommentWithProfile[];
  reviewId: string;
  onCommentAdded?: (comment: CommentWithProfile) => void;
}

interface CommentFormValues {
  content: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments: initialComments, 
  reviewId,
  onCommentAdded 
}) => {
  const { user, loading: authLoading, session } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Autocomplete state
  const [allUsers, setAllUsers] = useState<{id: string; name: string}[]>([]);
  const [suggestions, setSuggestions] = useState<{id: string; name: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Initialize form with proper types
  const form = useForm<CommentFormValues>({
    initialValues: {
      content: ''
    },
    validationSchema: commentValidationSchema,
    onSubmit: async (values, helpers) => {
      if (!user || !session || isSubmitting || authLoading) return;

      setIsSubmitting(true);
      setError(null);

      try {
        const newComment = await createComment({
          content: values.content.trim(),
          reviewId,
          userId: user.id
        });

        // Create a complete CommentWithProfile object
        const commentWithProfile: CommentWithProfile = {
          ...newComment,
          user: {
            id: user.id,
            name: user.user_metadata?.name || 'Unknown',
            email: user.email || '',
            role: user.user_metadata?.role || 'Member',
            createdAt: user.created_at || new Date().toISOString()
          }
        };

        // Update local state
        setComments(prevComments => [...prevComments, commentWithProfile]);
        
        // Notify parent component
        if (onCommentAdded) {
          onCommentAdded(commentWithProfile);
        }

        // Reset form
        helpers.resetForm();
      } catch (err) {
        console.error('Error posting comment:', err);
        setError(err instanceof Error ? err.message : 'Failed to post comment');
      } finally {
        setIsSubmitting(false);
      }
    }
  });

  // Load user list for mention suggestions
  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, name');
      setAllUsers(data || []);
    };
    loadUsers();
  }, []);

  // Handle input change to trigger mention suggestions
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    form.handleChange('content')(e);
    const val = e.target.value;
    const caret = e.target.selectionStart || 0;
    const match = /@(\w*)$/.exec(val.slice(0, caret));
    if (match) {
      const prefix = match[1].toLowerCase();
      setSuggestions(allUsers.filter(u => u.name.toLowerCase().startsWith(prefix)));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Update local state when props change, but only if we have a valid session
  useEffect(() => {
    if (user && session) {
      setComments(initialComments);
    }
  }, [initialComments, user, session]);

  // Helper to parse mentions in comment text
  const renderContentWithMentions = (text: string) => {
    // Split text on mentions like @username
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const username = part.substring(1);
        return (
          <span key={idx} className="text-blue-600 font-semibold">
            @{username}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return <div className="animate-pulse">Loading comments...</div>;
  }

  // If not authenticated, show login prompt
  if (!user || !session) {
    return (
      <div className="text-center py-4">
        <p>Please log in to view and post comments.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Comments</h2>
      
      {error && (
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
          className="mb-4"
        />
      )}

      <Form onSubmit={form.handleSubmit}>
        <TextArea
          id="content"
          name="content"
          label="Add a comment"
          placeholder="Type your comment here..."
          value={form.values.content}
          onChange={handleContentChange}
          onBlur={form.handleBlur('content')}
          error={form.errors.content}
          touched={form.touched.content}
          rows={4}
          disabled={isSubmitting}
        />
        
        {/* Autocomplete suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="border border-gray-300 bg-white absolute z-10 w-full max-h-40 overflow-auto">
            {suggestions.map(u => (
              <li
                key={u.id}
                className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                onMouseDown={() => {
                  // Append mention at end
                  form.setFieldValue('content', form.values.content + ` @${u.name} `);
                  setShowSuggestions(false);
                }}
              >
                {u.name}
              </li>
            ))}
          </ul>
        )}
        
        <div className="mt-4">
          <SubmitButton
            label="Post Comment"
            submittingLabel="Posting..."
            isSubmitting={isSubmitting}
            disabled={isSubmitting || !form.values.content.trim()}
          />
        </div>
      </Form>

      <div className="mt-8 space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-semibold">{comment.user.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                {renderContentWithMentions(comment.content)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;