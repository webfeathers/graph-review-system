// lib/emailService.ts
import nodemailer from 'nodemailer';

/**
 * Interface for email options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Class for handling email operations
 */
export class EmailService {
  /**
   * Create a nodemailer transporter for sending emails
   */
  private static createTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /**
   * Check if we should use development mode (log instead of send)
   */
  private static isDevelopmentMode() {
    const missingCredentials = !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD;
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    // You can force dev mode by setting this to true
    const forceDevMode = false;
    
    return forceDevMode || isDev || missingCredentials;
  }

  /**
   * Send an email
   * 
   * @param options Email options (to, subject, text/html, etc.)
   * @returns Object containing success status and any error
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: any }> {
    try {
      // Validate required fields
      if (!options.to || !options.subject || (!options.text && !options.html)) {
        return { 
          success: false, 
          error: 'Missing required fields: to, subject, and either text or html' 
        };
      }

      // In development mode, log instead of sending
      if (this.isDevelopmentMode()) {
        console.log('📧 DEV MODE - Email would be sent:');
        console.log('To:', options.to);
        console.log('From:', options.from || process.env.EMAIL_FROM || 'noreply@example.com');
        console.log('Subject:', options.subject);
        console.log('Text:', options.text);
        console.log('HTML:', options.html);
        return { success: true };
      }

      // Create transporter for this email
      const transporter = this.createTransporter();
      
      // Send the email
      const info = await transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM || 'noreply@example.com',
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || '',
      });

      console.log('Email sent:', info.messageId);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification about a new comment on a review
   * 
   * @param reviewId Review ID
   * @param reviewTitle Review title
   * @param reviewAuthorEmail Email of the review author
   * @param reviewAuthorName Name of the review author
   * @param commentContent Content of the new comment
   * @param commenterName Name of the commenter
   * @param appUrl Base URL of the application
   * @returns Result of the email sending
   */
  static async sendCommentNotification(
    reviewId: string,
    reviewTitle: string,
    reviewAuthorEmail: string,
    reviewAuthorName: string,
    commentContent: string,
    commenterName: string,
    appUrl: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const reviewUrl = `${appUrl}/reviews/${reviewId}`;
      
      const emailHtml = `
        <h1>New Comment on Your Graph Review</h1>
        <p>Hello ${reviewAuthorName},</p>
        <p><strong>${commenterName}</strong> has added a comment to your graph review "${reviewTitle}".</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2db670; margin: 15px 0;">
          ${commentContent}
        </div>
        <p><a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Comment</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `;
      
      return await this.sendEmail({
        to: reviewAuthorEmail,
        subject: `New Comment on Your Graph Review: ${reviewTitle}`,
        html: emailHtml
      });
    } catch (error) {
      console.error('Error sending comment notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification about a status change on a review
   * 
   * @param reviewId Review ID
   * @param reviewTitle Review title
   * @param reviewAuthorEmail Email of the review author
   * @param reviewAuthorName Name of the review author
   * @param previousStatus Previous status before change
   * @param newStatus New status after change
   * @param updaterName Name of the user who updated the status
   * @param appUrl Base URL of the application
   * @returns Result of the email sending
   */
  static async sendStatusChangeNotification(
    reviewId: string,
    reviewTitle: string,
    reviewAuthorEmail: string,
    reviewAuthorName: string,
    previousStatus: string,
    newStatus: string,
    updaterName: string,
    appUrl: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const reviewUrl = `${appUrl}/reviews/${reviewId}`;
      
      const emailHtml = `
        <h1>Status Change on Your Graph Review</h1>
        <p>Hello ${reviewAuthorName},</p>
        <p>The status of your graph review "${reviewTitle}" has been updated.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 15px 0; border: 1px solid #e0e0e0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Previous Status:</td>
            <td style="padding: 8px; border: 1px solid #e0e0e0;">${previousStatus}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">New Status:</td>
            <td style="padding: 8px; border: 1px solid #e0e0e0;"><strong>${newStatus}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Updated by:</td>
            <td style="padding: 8px; border: 1px solid #e0e0e0;">${updaterName}</td>
          </tr>
        </table>
        <p><a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Review</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `;
      
      return await this.sendEmail({
        to: reviewAuthorEmail,
        subject: `Status Update on Your Graph Review: ${reviewTitle}`,
        html: emailHtml
      });
    } catch (error) {
      console.error('Error sending status change notification:', error);
      return { success: false, error };
    }
  }
}