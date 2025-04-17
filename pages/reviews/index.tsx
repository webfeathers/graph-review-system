// pages/api/reviews/index.ts
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

  // GET /api/reviews
  if (req.method === 'GET') {
    const { userOnly } = req.query;
    
    let query = supabase
      .from('reviews')
      .select(`
        *,
        profiles:user_id (
          id,
          name,
          email,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (userOnly === 'true') {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ message: 'Error fetching reviews', error });
    }

    return res.status(200).json(data);
  }
  
  // POST /api/reviews
  if (req.method === 'POST') {
    const { title, description, graphImageUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        title,
        description,
        graph_image_url: graphImageUrl,
        status: 'Submitted',
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Error creating review', error });
    }

    return res.status(201).json(data);
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}