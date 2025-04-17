// pages/api/comments.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { comments } from '../../lib/db';
import { Comment } from '../../models/Comment';
import { authOptions } from '../../lib/auth';

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
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
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
    
    // Make sure session.user.id exists (based on our type extension)
    if (!session.user?.id) {
      return res.status(500).json({ message: 'User ID not found in session' });
    }
    
    const newComment: Comment = {
      id: Date.now().toString(),
      content,
      reviewId,
      userId: session.user.id,
      createdAt: new Date(),
    };
    
    comments.push(newComment);
    
    return res.status(201).json(newComment);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}