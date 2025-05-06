import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/serverAuth';
import { withAuth } from '@/lib/apiHelpers';
import { Role } from '@/types/supabase';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: any,
  userRole?: Role
) {
  const { id } = req.query;

  if (req.method !== 'PATCH') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Check if user is admin
    if (userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can change the Project Lead'
      });
    }

    const { newLeadId } = req.body;

    if (!newLeadId) {
      return res.status(400).json({
        success: false,
        message: 'New project lead ID is required'
      });
    }

    // Update the project lead using admin client
    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({ 
        project_lead_id: newLeadId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating project lead:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update project lead'
      });
    }

    // Fetch the updated review with all related data
    const { data, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        user:profiles!fk_reviews_user(id, name, email, created_at, role),
        projectLead:profiles!fk_project_lead(id, name, email, created_at, role)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching updated review:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch updated review'
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in project lead update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler, ['Admin']); 