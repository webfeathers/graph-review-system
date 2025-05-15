// components/commentSection.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { addComment, voteOnComment, removeVote, getCommentsByReviewId } from '../lib/api';
import { toast } from 'react-hot-toast';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import MentionAutocomplete from './MentionAutocomplete';

interface User {
  id: string;
  name: string;
  email: string;
}

interface CommentSectionProps {
  reviewId: string;
  onCommentAdded?: (newComment: CommentWithProfile) => void;
}

interface CommentFormValues {
  content: string;
}

interface CommentItemProps {
  comment: CommentWithProfile;
  isReply?: boolean;
  onReplyAdded: (parentId: string, reply: CommentWithProfile) => void;
  onVote: (commentId: string, voteType: VoteType) => void;
  onDelete: (commentId: string) => void;
  reviewId: string;
  user: any;
}

// Move mention handling to a custom hook
function useMentionHandling(textareaRef: React.RefObject<HTMLTextAreaElement>, onContentChange: (newValue: string) => void) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Load user list for mention suggestions
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('id, name, email');
        if (error) throw error;
        setAllUsers(data || []);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectUser(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const caret = e.target.selectionStart || 0;
    
    const textBeforeCaret = val.slice(0, caret);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textBetween = textBeforeCaret.slice(lastAtIndex + 1);
      const prefix = textBetween.toLowerCase();
      const filteredSuggestions = allUsers.filter(u => 
        u.name.toLowerCase().includes(prefix) || 
        u.email.toLowerCase().includes(prefix)
      );
      
      if (filteredSuggestions.length > 0) {
        setSuggestions(filteredSuggestions);
        setSelectedIndex(0);
        
        const textarea = e.target;
        const rect = textarea.getBoundingClientRect();
        
        // Get the coordinates of the cursor
        const coordinates = getCaretCoordinates(textarea, lastAtIndex);
        
        // Calculate the position
        const top = rect.top + coordinates.top - textarea.scrollTop;
        const left = rect.left + coordinates.left;
        
        setMentionPosition({ top, left });
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  // Helper function to get caret coordinates
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = getComputedStyle(element);
    
    // Copy textarea styles
    div.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      width: ${element.offsetWidth}px;
      height: auto;
      font: ${style.font};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
      box-sizing: ${style.boxSizing};
    `;
    
    // Get text before caret
    const text = element.value.substring(0, position);
    div.textContent = text;
    
    // Add a span to mark the caret position
    const span = document.createElement('span');
    span.textContent = '|';
    div.appendChild(span);
    
    // Add the div to the document
    document.body.appendChild(div);
    
    // Get the coordinates
    const coordinates = {
      top: span.offsetTop,
      left: span.offsetLeft
    };
    
    // Clean up
    document.body.removeChild(div);
    
    return coordinates;
  };

  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const val = textarea.value;
    const caret = textarea.selectionStart || 0;
    
    const textBeforeCaret = val.slice(0, caret);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterCaret = val.slice(caret);
      const newValue = val.slice(0, lastAtIndex) + `@${user.name} ` + textAfterCaret;
      const newCaretPos = lastAtIndex + user.name.length + 2; // +2 for @ and space
      
      onContentChange(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCaretPos, newCaretPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return {
    showSuggestions,
    suggestions,
    mentionPosition,
    selectedIndex,
    handleKeyDown,
    handleContentChange,
    handleSelectUser
  };
}

function CommentItem({ comment, isReply = false, onReplyAdded, onVote, onDelete, reviewId, user }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    showSuggestions,
    suggestions,
    mentionPosition,
    selectedIndex,
    handleKeyDown,
    handleContentChange,
    handleSelectUser
  } = useMentionHandling(textareaRef, setReplyContent);

  const handleSubmitReply = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const reply = await addComment(reviewId, replyContent, user.id, comment.id);
      
      // Notify mentioned users
      const contentLower = replyContent.toLowerCase();
      const mentionedUsers = suggestions.filter(u =>
        contentLower.includes(`@${u.name.toLowerCase()}`)
      );
      if (mentionedUsers.length > 0) {
        fetch('/api/notifications/mention', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mentionedUsers: mentionedUsers.map(u => ({ email: u.email, name: u.name })),
            commenterName: user.user_metadata?.name || user.email,
            reviewId,
            commentId: reply.id,
            commentContent: reply.content
          })
        }).catch(err => console.error('Error sending mention notifications:', err));
      }

      onReplyAdded(comment.id, reply);
      setReplyContent('');
      setIsReplying(false);
      toast.success('Reply added successfully');
    } catch (error) {
      console.error('Error adding reply:', error);
      toast.error('Failed to add reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-4 ${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 font-medium">
              {comment.user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{comment.user.name}</p>
              <p className="text-sm text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
            {!isReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center space-x-4">
            <button
              onClick={() => onVote(comment.id, 'up')}
              className={`${
                comment.userVote === 'up' ? 'text-blue-600' : 'text-gray-500'
              } hover:text-blue-800`}
              title="Upvote"
            >
              <HandThumbUpIcon className="h-5 w-5" />
            </button>
            <span className="text-sm text-gray-500">{comment.voteCount}</span>
            <button
              onClick={() => onVote(comment.id, 'down')}
              className={`${
                comment.userVote === 'down' ? 'text-red-600' : 'text-gray-500'
              } hover:text-red-800`}
              title="Downvote"
            >
              <HandThumbDownIcon className="h-5 w-5" />
            </button>
            {user?.id === comment.userId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            )}
          </div>

          {/* Inline reply form */}
          {isReplying && (
            <div className="mt-4 space-y-3 relative">
              <textarea
                ref={textareaRef}
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={`Reply to ${comment.user.name}...`}
                value={replyContent}
                onChange={(e) => {
                  setReplyContent(e.target.value);
                  handleContentChange(e);
                }}
                onKeyDown={handleKeyDown}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  className="fixed z-50 mt-1 w-64 rounded-md bg-white shadow-lg"
                  style={{
                    top: `${mentionPosition.top}px`,
                    left: `${mentionPosition.left}px`,
                  }}
                >
                  <ul className="max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {suggestions.map((user, index) => (
                      <li
                        key={user.id}
                        className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                          index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-100'
                        }`}
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="flex items-center">
                          <span className="ml-3 truncate">{user.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReply}
                  disabled={isSubmitting}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          isReply={true}
          onReplyAdded={onReplyAdded}
          onVote={onVote}
          onDelete={onDelete}
          reviewId={reviewId}
          user={user}
        />
      ))}
    </div>
  );
}

export function CommentSection({ reviewId, onCommentAdded }: CommentSectionProps) {
  const { user, loading: authLoading, session } = useAuth();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    showSuggestions,
    suggestions,
    mentionPosition,
    selectedIndex,
    handleKeyDown,
    handleContentChange,
    handleSelectUser
  } = useMentionHandling(textareaRef, setNewComment);

  // Fetch comments when the component mounts or reviewId changes
  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      try {
        const fetchedComments = await getCommentsByReviewId(reviewId);
        if (isMounted) {
          setComments(fetchedComments);
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
        if (isMounted) {
          toast.error('Failed to fetch comments');
        }
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  const handleReplyAdded = (parentId: string, reply: CommentWithProfile) => {
    setComments(prevComments => 
      prevComments.map(c => {
        if (c.id === parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), reply]
          };
        }
        return c;
      })
    );
    onCommentAdded?.({ ...reply, replies: reply.replies || [] });
  };

  const handleVote = async (commentId: string, voteType: VoteType) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }

    const comment = comments.find(c => c.id === commentId);
    if (comment?.userId === user.id) {
      toast.error("You cannot vote on your own comments");
      return;
    }

    try {
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
        toast.success('Vote removed');
        return;
      }
      
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
      toast.success('Vote recorded');
    } catch (error) {
      console.error('Error voting on comment:', error);
      toast.error('Failed to vote on comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      toast.error('Please sign in to delete comments');
      return;
    }
    
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

      // Update the comments state to remove the deleted comment or reply
      setComments(prevComments => {
        // First check if it's a top-level comment
        const isTopLevel = prevComments.some(c => c.id === commentId);
        if (isTopLevel) {
          return prevComments.filter(c => c.id !== commentId);
        }
        
        // If not top-level, it's a reply - find and update the parent comment
        return prevComments.map(comment => {
          if (comment.replies?.some(reply => reply.id === commentId)) {
            return {
              ...comment,
              replies: comment.replies.filter(reply => reply.id !== commentId)
            };
          }
          return comment;
        });
      });

      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment');
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const comment = await addComment(reviewId, newComment, user.id);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      onCommentAdded?.({ ...comment, replies: comment.replies || [] });
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Comments</h3>
          <div className="mt-4 relative">
            <textarea
              ref={textareaRef}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                handleContentChange(e);
              }}
              onKeyDown={handleKeyDown}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="fixed z-50 mt-1 w-64 rounded-md bg-white shadow-lg"
                style={{
                  top: `${mentionPosition.top}px`,
                  left: `${mentionPosition.left}px`,
                }}
              >
                <ul className="max-h-60 overflow-auto rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {suggestions.map((user, index) => (
                    <li
                      key={user.id}
                      className={`relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                        index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex items-center">
                        <span className="ml-3 truncate">{user.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleAddComment}
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {comments.map(comment => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReplyAdded={handleReplyAdded}
            onVote={handleVote}
            onDelete={handleDeleteComment}
            reviewId={reviewId}
            user={user}
          />
        ))}
      </div>
    </div>
  );
}

export default CommentSection;