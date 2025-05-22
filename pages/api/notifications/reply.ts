import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../../lib/emailService';
import { APP_URL } from '../../../lib/env';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📧 Reply notification API called');
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { parentCommentId, replyCommentId, reviewId, commenterName, commentContent } = req.body;
    console.log('📧 Processing reply notification:', {
      parentCommentId,
      replyCommentId,
      reviewId,
      commenterName
    });

    // Get the parent comment and its author
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select(`
        *,
        user:profiles!fk_comments_user(id, name, email)
      `)
      .eq('id', parentCommentId)
      .single();

    if (parentError || !parentComment) {
      console.error('❌ Error fetching parent comment:', parentError);
      return res.status(500).json({ success: false, message: 'Failed to fetch parent comment' });
    }

    console.log('📧 Found parent comment author:', {
      authorId: parentComment.user_id,
      authorEmail: parentComment.user.email,
      authorName: parentComment.user.name
    });

    // Don't notify if the reply is from the same user
    if (parentComment.user_id === req.body.userId) {
      console.log('📧 Skipping notification - same user');
      return res.status(200).json({ success: true, message: 'No notification needed - same user' });
    }

    const baseUrl = APP_URL;
    const commentUrl = `${baseUrl}/reviews/${reviewId}#comment-${replyCommentId}`;

    console.log('📧 Sending email notification to:', parentComment.user.email);

    // Send email notification using EmailService
    const result = await EmailService.sendEmail({
      to: parentComment.user.email,
      subject: `New reply to your comment from ${commenterName}`,
      html: `
        <h1>New Reply to Your Comment</h1>
        <p>Hello ${parentComment.user.name},</p>
        <p><strong>${commenterName}</strong> has replied to your comment:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2db670; margin: 15px 0;">
          ${commentContent}
        </div>
        <p><a href="${commentUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Reply</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `
    });

    console.log('📧 Email service result:', result);

    if (!result.success) {
      console.error('❌ Error sending reply notification:', result.error);
      return res.status(500).json({ success: false, message: 'Failed to send notification' });
    }

    console.log('✅ Reply notification processed successfully');
    res.status(200).json({ success: true, message: 'Reply notification sent successfully' });
  } catch (error) {
    console.error('❌ Error in reply notification API:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to send reply notification' 
    });
  }
} 