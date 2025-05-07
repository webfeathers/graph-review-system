// components/commentSection.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Profile } from '../types';
import { Comment, CommentWithProfile, VoteType } from '../types/supabase';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../lib/supabase';
import { ErrorDisplay } from './ErrorDisplay';
import { Form, TextArea, SubmitButton } from './form/FormComponents';
import { useForm } from '../lib/useForm';
import { commentValidationSchema } from '../lib/validationSchemas';
import Link from 'next/link';
import { addComment, voteOnComment, removeVote } from '../lib/api';
import { toast } from 'react-hot-toast';
import { ThumbUpIcon, ThumbDownIcon } from '@heroicons/react/24/outline';

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
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoting, setIsVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Autocomplete state
  const [allUsers, setAllUsers] = useState<{id: string; name: string; email: string}[]>([]);
  const [suggestions, setSuggestions] = useState<{id: string; name: string; email: string}[]>([]);
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
        const newComment = await addComment(reviewId, values.content.trim(), user.id);

        // Notify mentioned users via server API by simple case-insensitive includes
        const contentLower = values.content.toLowerCase();
        const mentionedUsers = allUsers.filter(u =>
          contentLower.includes(`@${u.name.toLowerCase()}`)
        );
        if (mentionedUsers.length > 0) {
          console.log('[Mention] Posting to /api/notifications/mention with payload:', {
            mentionedUsers,
            commenterName: user.user_metadata?.name || user.email,
            reviewId,
            commentContent: newComment.content
          });
          fetch('/api/notifications/mention', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mentionedUsers: mentionedUsers.map(u => ({ email: u.email, name: u.name })),
              commenterName: user.user_metadata?.name || user.email,
              reviewId,
              commentContent: newComment.content
            })
          }).catch(err => console.error('Error sending mention notifications:', err));
        }

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
        setComments(prevComments => [commentWithProfile, ...prevComments]);
        
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
      const { data } = await supabase.from('profiles').select('id, name, email');
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
      // Sort comments by createdAt in descending order (newest first)
      const sortedComments = [...initialComments].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setComments(sortedComments);
    }
  }, [initialComments, user, session]);

  // Helper to parse and render full-name mentions as links
  const renderContentWithMentions = (text: string) => {
    if (!allUsers.length) return <span>{text}</span>;
    // Build a regex that matches any full name from allUsers
    const namesPattern = allUsers.map(u => u.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const regex = new RegExp(`@(${namesPattern})`, 'g');
    const parts = text.split(regex);
    return parts.map((part, idx) => {
      // Odd index means a matched name from the capture group
      if (idx % 2 === 1) {
        const name = part;
        const userObj = allUsers.find(u => u.name === name);
        return (
          <Link
            key={idx}
            href={`/profile/${userObj?.id}`}
            className="text-blue-600 font-semibold"
            onClick={(e) => {
              e.preventDefault();
              if (userObj?.id) {
                window.location.href = `/profile/${userObj.id}`;
              }
            }}
          >
            @{name}
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const handleVote = async (commentId: string, voteType: VoteType) => {
    if (!user || isVoting) return;
    
    try {
      setIsVoting(commentId);
      
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const currentVote = comment.userVote;
      const newVoteType = currentVote === voteType ? null : voteType;
      
      // Optimistically update the UI
      setComments(prevComments => 
        prevComments.map(c => {
          if (c.id !== commentId) return c;
          
          // Calculate new vote count
          const voteChange = currentVote === voteType ? -1 : (currentVote ? 0 : 1);
          const newVoteCount = (c.voteCount || 0) + voteChange;
          
          return {
            ...c,
            voteCount: newVoteCount,
            userVote: newVoteType,
            votes: c.votes?.map(v => 
              v.userId === user.id 
                ? { ...v, voteType: newVoteType }
                : v
            ) || []
          };
        })
      );

      // Make the API call
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ voteType: newVoteType })
      });

      if (!response.ok) {
        throw new Error('Failed to update vote');
      }

      const { data } = await response.json();
      
      // Update with the server response
      setComments(prevComments => 
        prevComments.map(c => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            voteCount: data.voteCount,
            userVote: data.userVote,
            votes: data.votes || []
          };
        })
      );
    } catch (error) {
      console.error('Error voting:', error);
      setError(error instanceof Error ? error.message : 'Failed to update vote');
      
      // Revert optimistic update on error
      setComments(prevComments => 
        prevComments.map(c => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            voteCount: c.voteCount,
            userVote: c.userVote,
            votes: c.votes
          };
        })
      );
    } finally {
      setIsVoting(null);
    }
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
                  // Replace the partial mention to avoid double '@'
                  const current = form.values.content;
                  const newContent = current.replace(/@(\w*)$/, `@${u.name} `);
                  form.setFieldValue('content', newContent);
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
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{comment.user.name}</span>
                    <span className="text-gray-500 text-sm">
                      {new Date(comment.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {renderContentWithMentions(comment.content)}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleVote(comment.id, 'up')}
                    disabled={isVoting === comment.id}
                    className={`p-1 rounded hover:bg-gray-100 ${
                      comment.userVote === 'up' ? 'text-blue-600' : 'text-gray-500'
                    }`}
                    title="Upvote"
                  >
                    <svg 
                      className="h-5 w-5" 
                      fill={comment.userVote === 'up' ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" 
                      />
                    </svg>
                  </button>
                  <span className="text-sm font-medium min-w-[1.5rem] text-center">
                    {comment.voteCount || 0}
                  </span>
                  <button
                    onClick={() => handleVote(comment.id, 'down')}
                    disabled={isVoting === comment.id}
                    className={`p-1 rounded hover:bg-gray-100 ${
                      comment.userVote === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}
                    title="Downvote"
                  >
                    <svg 
                      className="h-5 w-5" 
                      fill={comment.userVote === 'down' ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" 
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;