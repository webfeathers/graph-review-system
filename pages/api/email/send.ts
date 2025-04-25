// pages/api/email/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../../lib/emailService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Extract email data from request body
    const { to, subject, text, html, from } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and either text or html'
      });
    }

    // Send the email
    const result = await EmailService.sendEmail({
      to,
      subject,
      text,
      html,
      from
    });

    // Handle errors from the email service
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error in email API:', error);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}