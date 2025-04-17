import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { Comment } from '../../models/Comment';

// Mock comment database
const comments: Comment[] = [
  {
    id: '1',
    content: 'This graph looks interesting. Can you provide more context?',
    reviewId: '1',
    userId: '456',
    createdAt: new Date(Date.now() - 86400000), // Yesterday
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

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
