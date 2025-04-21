import React, { useState } from 'react';
import { Comment } from '../models/Comment';
import { User } from '../models/User';
import { useAuth } from './AuthProvider';
import { supabase } from '../lib/supabase';

interface CommentSectionProps {
  comments: (Comment & { user: User })[];
  reviewId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ comments, reviewId }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    
    setIsSubmitting(true);
    try {
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
          content: newComment, 
          reviewId 
        }),
      });
      
      if (!response.ok) {
        console.error('Comment post failed with status:', response.status);
        console.error('Response:', await response.text());
        throw new Error('Failed to post comment');
      }
      
      // Refresh the page to show the new comment
      window.location.reload();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold mb-4">Discussion</h3>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded resize-none h-24"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !user}
          className="mt-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
      
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