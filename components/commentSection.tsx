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
    
    // Look for @ symbol before the caret position
    const textBeforeCaret = val.slice(0, caret);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space or newline between @ and caret
      const textBetween = textBeforeCaret.slice(lastAtIndex + 1);
      if (!textBetween.includes(' ') && !textBetween.includes('\n')) {
        const prefix = textBetween.toLowerCase();
        const filteredSuggestions = allUsers.filter(u => 
          u.name.toLowerCase().startsWith(prefix) || 
          u.email.toLowerCase().startsWith(prefix)
        );
        setSuggestions(filteredSuggestions);
        
        // Calculate position for the autocomplete dropdown
        const textarea = e.target;
        const rect = textarea.getBoundingClientRect();
        
        // Get the position of the @ symbol
        const textBeforeAt = textBeforeCaret.slice(0, lastAtIndex);
        const lines = textBeforeAt.split('\n');
        const lastLine = lines[lines.length - 1];
        
        // Create a temporary span to measure text
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre-wrap';
        span.style.wordWrap = 'break-word';
        span.style.width = `${textarea.clientWidth}px`;
        span.style.font = window.getComputedStyle(textarea).font;
        span.style.padding = window.getComputedStyle(textarea).padding;
        span.style.border = window.getComputedStyle(textarea).border;
        document.body.appendChild(span);
        
        // Calculate vertical position
        span.textContent = textBeforeAt;
        const beforeAtHeight = span.offsetHeight;
        
        // Calculate horizontal position
        span.textContent = lastLine;
        const lastLineWidth = span.offsetWidth;
        
        document.body.removeChild(span);
        
        // Calculate the position
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;
        
        // Position the dropdown
        const top = rect.top + beforeAtHeight - scrollTop;
        
        // Center the dropdown horizontally within the textarea
        const dropdownWidth = 300; // max-width from MentionAutocomplete
        const textareaCenter = rect.left + (rect.width / 2);
        const left = textareaCenter - (dropdownWidth / 2);
        
        // Ensure the dropdown stays within the viewport
        const viewportWidth = window.innerWidth;
        const adjustedLeft = Math.max(20, Math.min(left, viewportWidth - dropdownWidth - 20)); // 20px padding
        
        setMentionPosition({ top, left: adjustedLeft });
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
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
    
    // Prevent voting on own comments
    const comment = comments.find(c => c.id === commentId);
    if (comment?.userId === user.id) {
      toast.error("You cannot vote on your own comments.");
      return;
    }
    
    try {
      setIsVoting(commentId);
      
      // If the user has already voted this way on this comment, remove the vote
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

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete comment');
      }

      // Remove comment from local state
      setComments(prevComments => prevComments.filter(c => c.id !== commentId));
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Comments</h2>
      
      {error && (
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
          className="mb-4"
        />
      )}

      {/* Comment Form */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
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

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center">No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white shadow rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{comment.user.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        second: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                {comment.userId === user?.id && (
                  <button 
                    className="text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Delete comment"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                {renderContentWithMentions(comment.content)}
              </div>
              <div className="mt-2 flex items-center space-x-2">
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
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;