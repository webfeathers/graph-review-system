// src/components/submissions/comment-thread.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { Send, Reply, User } from "lucide-react";
import Image from "next/image";

export default function CommentThread({ submissionId }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchComments();
    fetchUsers();
  }, [submissionId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/submissions/${submissionId}/comments`);
      const data = await response.json();
      
      // Organize comments by parent/child
      const parentComments = data.filter(c => !c.parentId);
      const childComments = data.filter(c => c.parentId);
      
      // Add replies to each parent comment
      parentComments.forEach(parent => {
        parent.replies = childComments.filter(child => child.parentId === parent.id);
      });
      
      setComments(parentComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim() || !session?.user) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: comment,
          parentId: replyTo,
          mentions: extractMentions(comment).map(mention => mention.slice(1)) // Remove @ symbol
        }),
      });
      
      if (!response.ok) throw new Error("Failed to post comment");
      
      // Clear form and refresh comments
      setComment("");
      setReplyTo(null);
      fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMention = (e) => {
    const value = e.target.value;
    setComment(value);
    
    // Check if we're typing a mention
    const lastWord = value.split(" ").pop();
    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setMentionQuery(lastWord.slice(1).toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (username) => {
    const commentWords = comment.split(" ");
    commentWords.pop(); // Remove the partial @mention
    const newComment = [...commentWords, `@${username} `].join(" ");
    setComment(newComment);
    setShowMentions(false);
    
    // Focus back on textarea and place cursor at end
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = newComment.length;
      textareaRef.current.selectionEnd = newComment.length;
    }
  };

  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    return text.match(mentionRegex) || [];
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Discussion</h3>
      
      {isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No comments yet. Be the first to start the discussion.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex space-x-3">
                {comment.user.image ? (
                  <Image
                    src={comment.user.image}
                    alt={comment.user.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {comment.user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  <div className="mt-2">
                    <button
                      onClick={() => setReplyTo(comment.id)}
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      Reply
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-12 mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex space-x-3">
                        {reply.user.image ? (
                          <Image
                            src={reply.user.image}
                            alt={reply.user.name}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {reply.user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Comment form */}
      <div className="bg-white rounded-lg shadow p-4">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between bg-gray-50 p-2 rounded">
            <span className="text-sm text-gray-600">
              Replying to a comment
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={handleMention}
              placeholder="Add a comment... (Use @username to mention someone)"
              rows={3}
              className="block w-full rounded-md border border-gray-300 shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
            
            {showMentions && filteredUsers.length > 0 && (
              <div className="absolute z-10 mt-1 w-64 bg-white rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => insertMention(user.name)}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  >
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full mr-2"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm">{user.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!comment.trim() || isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Comment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}