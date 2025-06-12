import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

type ResponseData = {
  success: boolean;
  message?: string;
  error?: any;
  session?: any;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
  adminId: string
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Target user ID is required' 
      });
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Target user not found' 
      });
    }

    // Create admin client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create a new session for the target user
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`
      }
    });

    if (sessionError) {
      console.error('Error creating impersonation session:', sessionError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create impersonation session',
        error: sessionError.message
      });
    }

    // Return the session data
    return res.status(200).json({
      success: true,
      message: 'Impersonation successful',
      session: session
    });

  } catch (error: any) {
    console.error('Error in impersonation:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
}

export default withAdminAuth(handler); 