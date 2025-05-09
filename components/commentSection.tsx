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
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import MentionAutocomplete from './MentionAutocomplete';

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
  // Add state for mention position
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

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
            commentId: newComment.id,
            commentContent: newComment.content
          });
          fetch('/api/notifications/mention', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mentionedUsers: mentionedUsers.map(u => ({ email: u.email, name: u.name })),
              commenterName: user.user_metadata?.name || user.email,
              reviewId,
              commentId: newComment.id,
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
      const filteredSuggestions = allUsers.filter(u => 
        u.name.toLowerCase().startsWith(prefix) || 
        u.email.toLowerCase().startsWith(prefix)
      );
      setSuggestions(filteredSuggestions);
      
      // Calculate position for the autocomplete dropdown
      const textarea = e.target;
      const rect = textarea.getBoundingClientRect();
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const lines = val.slice(0, caret).split('\n').length;
      const top = rect.top + (lines * lineHeight);
      const left = rect.left + (caret * 8); // Approximate character width
      
      setMentionPosition({ top, left });
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
    if (!user) return;
    
    try {
      setIsVoting(commentId);
      
      // If the user has already voted this way on this comment, remove the vote
      const comment = comments.find(c => c.id === commentId);
      if (comment?.userVote === voteType) {
        await removeVote(commentId, user.id);
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === commentId 
              ? { 
                  ...c, 
                  voteCount: (c.voteCount || 0) - 1,
                  userVote: undefined,
                  votes: c.votes?.filter(v => v.userId !== user.id)
                }
              : c
          )
        );
        return;
      }
      
      // Otherwise, add or update the vote
      await voteOnComment(commentId, user.id, voteType);
      setComments(prevComments => 
        prevComments.map(c => 
          c.id === commentId 
            ? { 
                ...c, 
                voteCount: (c.voteCount || 0) + (c.userVote ? 0 : 1),
                userVote: voteType,
                votes: [
                  ...(c.votes || []).filter(v => v.userId !== user.id),
                  {
                    id: `${commentId}-${user.id}`,
                    commentId,
                    userId: user.id,
                    voteType,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  }
                ]
              }
            : c
        )
      );
    } catch (error) {
      console.error('Error voting on comment:', error);
      toast.error('Failed to vote on comment');
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

      {/* Comment Form */}
      <div className="bg-white p-6">
        <Form onSubmit={form.handleSubmit}>
          <TextArea
            id="content"
            name="content"
            label="Add a comment"
            placeholder="Type your comment here... Use @ to mention someone"
            value={form.values.content}
            onChange={handleContentChange}
            onBlur={form.handleBlur('content')}
            error={form.errors.content}
            touched={form.touched.content}
            rows={4}
            disabled={isSubmitting}
          />
          
          {/* Replace the old suggestions list with the new MentionAutocomplete */}
          {showSuggestions && suggestions.length > 0 && (
            <MentionAutocomplete
              suggestions={suggestions}
              onSelect={(user) => {
                const current = form.values.content;
                const newContent = current.replace(/@(\w*)$/, `@${user.name} `);
                form.setFieldValue('content', newContent);
                setShowSuggestions(false);
              }}
              onClose={() => setShowSuggestions(false)}
              position={mentionPosition}
            />
          )}
          
          <div className="mt-4 flex justify-end">
            <SubmitButton
              label="Post Comment"
              submittingLabel="Posting..."
              isSubmitting={isSubmitting}
              disabled={isSubmitting || !form.values.content.trim()}
            />
          </div>
        </Form>
      </div>

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
                    className={`p-1 rounded-full ${
                      comment.userVote === 'up' ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
                    }`}
                    title="Upvote"
                  >
                    <HandThumbUpIcon className="h-5 w-5" />
                  </button>
                  <span className="text-sm text-gray-500">{comment.voteCount || 0}</span>
                  <button
                    onClick={() => handleVote(comment.id, 'down')}
                    className={`p-1 rounded-full ${
                      comment.userVote === 'down' ? 'text-red-600' : 'text-gray-400 hover:text-red-600'
                    }`}
                    title="Downvote"
                  >
                    <HandThumbDownIcon className="h-5 w-5" />
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