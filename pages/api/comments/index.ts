// pages/api/comments/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with API route runtime env variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from request
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
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          created_at
        )
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ message: 'Error fetching comments', error });
    }
    
    return res.status(200).json(data);
  }
  
  // POST /api/comments
  if (req.method === 'POST') {
    const { content, reviewId } = req.body;
    
    if (!content || !reviewId) {
      return res.status(400).json({ message: 'Content and review ID are required' });
    }
    
    const { data, error } = await supabase
      .from('comments')
      .insert({
        content,
        review_id: reviewId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error creating comment', error });
    }
    
    return res.status(201).json(data);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}