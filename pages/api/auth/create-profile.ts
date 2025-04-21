// pages/api/auth/create-profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id, name, email } = req.body;

  if (!id || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Use the admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id, // This will be handled as UUID by Postgres
        name,
        email: email || '',
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating profile:', error);
      return res.status(500).json({ message: error.message });
    }

    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error creating profile:', error);
    return res.status(500).json({ message: error.message });
  }
}