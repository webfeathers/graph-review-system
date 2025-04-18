// pages/api/reviews.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { reviews } from '../../lib/db';
import { Review } from '../../models/Review';

// Initialize with some sample data if empty
if (reviews.length === 0) {
  reviews.push({
    id: '1',
    title: 'Network Traffic Analysis',
    description: 'This graph shows the network traffic patterns over the last month.',
    status: 'Approved',
    userId: '123',
    createdAt: new Date(Date.now() - 7 * 86400000), // 7 days ago
    updatedAt: new Date(Date.now() - 2 * 86400000), // 2 days ago
  });
  
  reviews.push({
    id: '2',
    title: 'Customer Conversion Funnel',
    description: 'Visualization of our conversion funnel from visitor to customer.',
    status: 'In Review',
    userId: '456',
    createdAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
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

  // GET /api/reviews
  if (req.method === 'GET') {
    const { userOnly } = req.query;
    
    if (userOnly === 'true' && user?.id) {
      // Return only the current user's reviews
      const userReviews = reviews.filter(review => review.userId === user.id);
      return res.status(200).json(userReviews);
    }
    
    // Return all reviews
    return res.status(200).json(reviews);
  }
  
  // POST /api/reviews
  if (req.method === 'POST') {
    const { title, description, graphImageUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    const newReview: Review = {
      id: Date.now().toString(),
      title,
      description,
      graphImageUrl,
      status: 'Submitted',
      userId: user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    reviews.push(newReview);
    
    return res.status(201).json(newReview);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}