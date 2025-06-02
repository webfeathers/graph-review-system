// pages/api/reviews/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedHandler } from '@/lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { EmailService } from '../../../lib/emailService';
import { FIELD_LIMITS } from '../../../constants';
import { SupabaseClient } from '@supabase/supabase-js';
import { Role, CommentWithProfile } from '@/types/supabase';
import { supabaseAdmin } from '../../../lib/serverAuth';

type ResponseData = {
  success: boolean;
  message?: string;
  data?: any;
  review?: any;
  error?: string;
};

const reviewHandler: AuthenticatedHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  supabaseClient: SupabaseClient,
  userRole?: Role
) => {
  const { id } = req.query;
  const method = req.method;

  if (!id || Array.isArray(id)) {
    console.error('Invalid review ID:', id);
    return res.status(400).json({
      success: false,
      message: 'Invalid review ID'
    });
  }

  try {
    switch (method) {
      case 'GET': {
        const { data: review, error: reviewError } = await supabaseClient
          .from('reviews')
          .select(`
            *,
            user:user_id (
              id,
              email,
              name
            ),
            projectLead:project_lead_id (
              id,
              email,
              name
            ),
            comments (
              id,
              content,
              created_at,
              user_id,
              user:user_id (
                id,
                email,
                name
              ),
              votes:comment_votes!left(*)
            )
          `)
          .eq('id', id)
          .order('created_at', { foreignTable: 'comments', ascending: false })
          .order('created_at', { foreignTable: 'comments.votes', ascending: false })
          .single();

        if (reviewError) {
          console.error('Error fetching review:', reviewError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch review',
            error: reviewError.message
          });
        }

        if (!review) {
          console.error('Review not found:', id);
          return res.status(404).json({
            success: false,
            message: 'Review not found'
          });
        }

        // Transform the review data to ensure proper date handling
        const transformedReview = {
          ...review,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
          comments: review.comments?.map((comment: any) => {
            // Ensure votes is an array
            const votes = Array.isArray(comment.votes) ? comment.votes : [];
            
            // Calculate vote count
            const voteCount = votes.reduce((sum: number, vote: any) => 
              sum + (vote.vote_type === 'up' ? 1 : -1), 0);
            
            // Find user's vote
            const userVote = votes.find((v: any) => v.user_id === userId)?.vote_type;
            
            return {
              ...comment,
              createdAt: comment.created_at,
              user: comment.user ? {
                ...comment.user,
                createdAt: comment.user.created_at
              } : undefined,
              votes,
              voteCount,
              userVote
            };
          })
        };

        // Add template file versions if this is a template review
        if (review.review_type === 'template') {
          const { data: versions, error: versionError } = await supabaseClient
            .from('template_file_versions')
            .select('*')
            .eq('review_id', id)
            .order('uploaded_at', { ascending: false });
          if (!versionError && versions) {
            transformedReview.templateFileVersions = versions.map((v: any) => ({
              id: v.id,
              reviewId: v.review_id,
              fileUrl: v.file_url,
              uploadedAt: v.uploaded_at,
              uploadedBy: v.uploaded_by,
            }));
          }
        }

        return res.status(200).json({
          success: true,
          data: transformedReview
        });
      }

      case 'DELETE': {
        // Get the review first to check ownership
        const { data: review, error: reviewError } = await supabaseClient
          .from('reviews')
          .select('user_id')
          .eq('id', id)
          .single();

        if (reviewError) {
          console.error('Error fetching review for deletion:', reviewError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch review'
          });
        }

        if (!review) {
          return res.status(404).json({
            success: false,
            message: 'Review not found'
          });
        }

        // Only allow admins or the review creator to delete
        if (userRole !== 'Admin' && userId !== review.user_id) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this review'
          });
        }

        const { error: deleteError } = await supabaseClient
          .from('reviews')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Error deleting review:', deleteError);
          return res.status(500).json({
            success: false,
            message: 'Failed to delete review'
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Review deleted successfully'
        });
      }

      case 'PUT': {
        // Check if the review exists and get the owner
        const { data: initialFetch, error: initialFetchError } = await supabaseClient
          .from('reviews')
          .select('user_id, status, project_lead_id')
          .eq('id', id)
          .single();

        if (initialFetchError) {
          console.error('Error fetching review for update:', initialFetchError);
          return res.status(500).json({
            success: false,
            message: 'Failed to fetch review'
          });
        }

        if (!initialFetch) {
          return res.status(404).json({
            success: false,
            message: 'Review not found'
          });
        }

        // Check authorization - only author or admin can edit
        const isAuthor = initialFetch.user_id === userId;
        const isAdmin = userRole === 'Admin';

        if (!isAuthor && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to edit this review'
          });
        }

        const { 
          title, 
          description,
          accountName,
          orgId,
          segment,
          remoteAccess,
          graphName,
          useCase,
          customerFolder,
          handoffLink,
          kantataProjectId,
          projectLeadId,
          status 
        } = req.body;

        // Validate required fields
        if (!title) {
          return res.status(400).json({
            success: false,
            message: 'Title is required'
          });
        }

        // Prepare update data
        const putUpdateData: any = {
          title,
          description,
          account_name: accountName,
          org_id: orgId,
          segment,
          remote_access: remoteAccess,
          graph_name: graphName,
          use_case: useCase,
          customer_folder: customerFolder,
          handoff_link: handoffLink,
          kantata_project_id: kantataProjectId,
          updated_at: new Date().toISOString()
        };

        // Only update status if provided
        if (status) {
          // Only admins can approve reviews
          if (status === 'Approved' && userRole !== 'Admin') {
            return res.status(403).json({
              success: false,
              message: 'Only admins can approve reviews'
            });
          }
          putUpdateData.status = status;
        }

        // Only update project lead if provided
        if (projectLeadId) {
          putUpdateData.project_lead_id = projectLeadId;
        }

        try {
          // Perform the update using admin client
          const { error: updateError } = await supabaseAdmin
            .from('reviews')
            .update(putUpdateData)
            .eq('id', id);

          if (updateError) {
            console.error('Error updating review:', updateError);
            return res.status(500).json({
              success: false,
              message: 'Failed to update review'
            });
          }

          // Fetch the updated review with all related data using admin client
          const { data, error: fetchError } = await supabaseAdmin
            .from('reviews')
            .select(`
              *,
              user:profiles!fk_reviews_user(id, name, email, created_at, role),
              projectLead:profiles!fk_project_lead(id, name, email, created_at, role),
              comments (
                id,
                content,
                created_at,
                user_id,
                user:profiles!fk_comments_user(id, name, email, created_at, role)
              )
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
          console.error('Unexpected error in PUT handler:', error);
          return res.status(500).json({
            success: false,
            message: 'Internal server error'
          });
        }
      }

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Unexpected error in review handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export default withAuth(reviewHandler);