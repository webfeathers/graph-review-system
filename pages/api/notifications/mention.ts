import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../../lib/emailService';

// POST /api/notifications/mention
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[Mention API] request method:', req.method);
  console.log('[Mention API] request body:', req.body);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { mentionedUsers, commenterName, reviewId, commentContent } = req.body as {
      mentionedUsers: Array<{ email: string; name: string }>;
      commenterName: string;
      reviewId: string;
      commentContent: string;
    };

    // Determine the app URL (fallback to localhost for dev)
    const origin = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;

    // Send emails to each mentioned user
    await Promise.all(
      mentionedUsers.map((u) => {
        const html = `
          <p>Hi ${u.name},</p>
          <p><strong>${commenterName}</strong> mentioned you in a comment:</p>
          <blockquote>${commentContent}</blockquote>
          <p><a href="${origin}/reviews/${reviewId}">View the comment</a></p>
        `;
        return EmailService.sendEmail({
          to: u.email,
          subject: `${commenterName} mentioned you in a comment`,
          html
        });
      })
    );
    console.log('[Mention API] emails sent to:', mentionedUsers.map(u => u.email));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in mention notification API:', error);
    return res.status(500).json({ success: false, error: (error instanceof Error ? error.message : String(error)) });
  }
} 