import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedHandler } from '@/lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { Role } from '@/types/supabase';

type ResponseData = {
  success: boolean;
  message?: string;
  error?: string;
};

const commentHandler: AuthenticatedHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) => {
  const { id } = req.query;
  const method = req.method;

  if (!id || Array.isArray(id)) {
    console.error('Invalid comment ID:', id);
    return res.status(400).json({
      success: false,
      message: 'Invalid comment ID'
    });
  }

  try {
    switch (method) {
      case 'DELETE': {
        // Get the comment first to check ownership
        const { data: comment, error: commentError } = await supabaseClient
          .from('comments')
          .select('user_id')
          .eq('id', id)
          .single();

        if (commentError) {
          console.error('Error fetching comment for deletion:', commentError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch comment'
          });
        }

        if (!comment) {
          return res.status(404).json({
            success: false,
            message: 'Comment not found'
          });
        }

        // Only allow admins or the comment creator to delete
        if (userRole !== 'Admin' && userId !== comment.user_id) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this comment'
          });
        }

        const { error: deleteError } = await supabaseClient
          .from('comments')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting comment:', deleteError);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete comment'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Comment deleted successfully'
        });
      }

      default:
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${method} not allowed`
        });
    }
  } catch (error) {
    console.error('Error in comment handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default withAuth(commentHandler); 