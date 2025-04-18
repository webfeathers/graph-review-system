// pages/api/reviews/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { reviews } from '../../../lib/db';

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

  const { id } = req.query;
  
  // GET /api/reviews/[id]
  if (req.method === 'GET') {
    const review = reviews.find(r => r.id === id);
    
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    return res.status(200).json(review);
  }
  
  // PATCH /api/reviews/[id]
  if (req.method === 'PATCH') {
    const reviewIndex = reviews.findIndex(r => r.id === id);
    
    if (reviewIndex === -1) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    const review = reviews[reviewIndex];
    
    // Only the author can update the review
    if (review.userId !== user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const { status } = req.body;
    
    if (status) {
      reviews[reviewIndex] = {
        ...review,
        status,
        updatedAt: new Date(),
      };
    }
    
    return res.status(200).json(reviews[reviewIndex]);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}