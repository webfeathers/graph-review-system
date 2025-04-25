// pages/api/email/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailService } from '../../../lib/emailService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('📧 Email API called with method:', req.method);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    // Log entire request body for debugging
    console.log('📧 Request body:', JSON.stringify(req.body, null, 2));
    
    // Extract email data from request body
    const { to, subject, text, html, from } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and either text or html'
      });
    }

    // Log email configuration for debugging
    console.log('📧 Email configuration:');
    console.log('- HOST:', process.env.EMAIL_HOST);
    console.log('- PORT:', process.env.EMAIL_PORT);
    console.log('- USER exists:', !!process.env.EMAIL_USER);
    console.log('- PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    console.log('- FROM:', process.env.EMAIL_FROM);
    console.log('- NODE_ENV:', process.env.NODE_ENV);

    // Send the email
    console.log('📧 Attempting to send email to:', to);
    const result = await EmailService.sendEmail({
      to,
      subject,
      text,
      html,
      from
    });

    console.log('📧 Email service returned:', result);

    // Handle errors from the email service
    if (!result.success) {
      console.error('❌ Email service error:', result.error);
      const errorDetails = result.error instanceof Error 
        ? { message: result.error.message, stack: result.error.stack }
        : result.error;
        
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: errorDetails
      });
    }

    // Return success response
    console.log('✅ Email sent successfully');
    return res.status(200).json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('❌ Unhandled error in email API:', error);
    
    // Extract detailed error information
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorDetails = error instanceof Error && (error as any).code 
      ? { code: (error as any).code, syscall: (error as any).syscall }
      : undefined;
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      stack: errorStack,
      details: errorDetails
    });
  }
}