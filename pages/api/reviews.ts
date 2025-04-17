import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { Review } from '../../models/Review';

// Mock review database
const reviews: Review[] = [
  {
    id: '1',
    title: 'Network Traffic Analysis',
    description: 'This graph shows the network traffic patterns over the last month.',
    status: 'Approved',
    userId: '123',
    createdAt: new Date(Date.now() - 7 * 86400000), // 7 days ago
    updatedAt: new Date(Date.now() - 2 * 86400000), // 2 days ago
  },
  {
    id: '2',
    title: 'Customer Conversion Funnel',
    description: 'Visualization of our conversion funnel from visitor to customer.',
    status: 'In Review',
    userId: '456',
    createdAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // GET /api/reviews
  if (req.method === 'GET') {
    const { userOnly } = req.query;
    
    if (userOnly === 'true') {
      // Return only the current user's reviews
      const userReviews = reviews.filter(review => review.userId === session.user.id);
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
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    reviews.push(newReview);
    
    return res.status(201).json(newReview);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}