import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try to get the table structure by selecting one row
    const { data: review, error } = await supabase
      .from('reviews')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching review structure:', error);
      return res.status(500).json({ error: error.message });
    }

    // Log the raw data
    console.log('Review structure:', review ? Object.keys(review) : 'No reviews found');

    return res.status(200).json({
      structure: review ? Object.keys(review) : [],
      error: null
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
} 