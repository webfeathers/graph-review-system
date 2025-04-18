// pages/api/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { comments } from '../../lib/db';
import { Comment } from '../../models/Comment';

// Initialize with sample data if empty
if (comments.length === 0) {
  comments.push({
    id: '1',
    content: 'This graph looks interesting. Can you provide more context?',
    reviewId: '1',
    userId: '456',
    createdAt: new Date(Date.now() - 86400000), // Yesterday
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from Supabase auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // GET /api/comments?reviewId=[reviewId]
  if (req.method === 'GET') {
    const { reviewId } = req.query;
    
    if (!reviewId) {
      return res.status(400).json({ message: 'Review ID is required' });
    }
    
    const reviewComments = comments.filter(comment => comment.reviewId === reviewId);
    return res.status(200).json(reviewComments);
  }
  
  // POST /api/comments
  if (req.method === 'POST') {
    const { content, reviewId } = req.body;
    
    if (!content || !reviewId) {
      return res.status(400).json({ message: 'Content and review ID are required' });
    }
    
    const newComment: Comment = {
      id: Date.now().toString(),
      content,
      reviewId,
      userId: user.id,
      createdAt: new Date(),
    };
    
    comments.push(newComment);
    
    return res.status(201).json(newComment);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}