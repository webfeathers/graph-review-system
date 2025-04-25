// lib/emailService.ts
import nodemailer from 'nodemailer';
import { ReviewWithProfile } from '../types/supabase';

/**
 * Email notification service for sending automated emails
 */
export class EmailService {
  private static transporter: nodemailer.Transporter;
  private static initialized = false;
  private static defaultFromEmail = 'graphreview@leandata.com';
  private static adminEmail = 'ron.feathers@leandata.com'; // Default admin email

  /**
   * Initialize the email service with environment variables
   */
  static initialize() {
    if (this.initialized) return;

    // Check for required environment variables
    const { 
      EMAIL_HOST, 
      EMAIL_PORT, 
      EMAIL_USER, 
      EMAIL_PASSWORD,
      EMAIL_FROM,
      ADMIN_EMAIL
    } = process.env;

    // Use environment variables if provided, otherwise use defaults for development
    const host = EMAIL_HOST || 'smtp.example.com';
    const port = EMAIL_PORT ? parseInt(EMAIL_PORT) : 587;
    const user = EMAIL_USER || 'username';
    const pass = EMAIL_PASSWORD || 'password';
    
    // Set from address and admin email if provided in environment
    if (EMAIL_FROM) this.defaultFromEmail = EMAIL_FROM;
    if (ADMIN_EMAIL) this.adminEmail = ADMIN_EMAIL;

    // Create reusable transporter object
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    this.initialized = true;
    console.log('Email service initialized');
  }

  /**
   * Send an email using the configured transport
   * 
   * @param options Email options including to, subject, and html content
   * @returns Success status and any error
   */
  static async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    text?: string;
  }): Promise<{ success: boolean; error?: any }> {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      // In development mode, log instead of sending if no credentials
      if (process.env.NODE_ENV === 'development' && 
          (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
        console.log('Email would be sent (DEV MODE):');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Content:', options.html);
        return { success: true };
      }

      // Send mail with defined transport object
      const info = await this.transporter.sendMail({
        from: options.from || this.defaultFromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });

      console.log('Email sent:', info.messageId);
      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification about a new graph review
   * 
   * @param review The newly created review
   * @param appUrl The base URL of the application
   * @returns Success status and any error
   */
  static async sendNewReviewNotification(
    review: ReviewWithProfile,
    appUrl: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const reviewUrl = `${appUrl}/reviews/${review.id}`;
      
      // Email to admin
      const adminHtml = `
        <h1>New Graph Review Submitted</h1>
        <p>A new graph review has been submitted and requires attention.</p>
        <p><strong>Title:</strong> ${review.title}</p>
        <p><strong>Submitted by:</strong> ${review.user.name} (${review.user.email})</p>
        <p><strong>Account:</strong> ${review.accountName || 'Not specified'}</p>
        <p><strong>Status:</strong> ${review.status}</p>
        <p><a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Review</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `;

      return await this.sendEmail({
        to: this.adminEmail,
        subject: `New Graph Review: ${review.title}`,
        html: adminHtml,
      });
    } catch (error) {
      console.error('Error sending new review notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification about a new comment on a review
   * 
   * @param comment The newly added comment with user info
   * @param review The review the comment was added to
   * @param appUrl The base URL of the application
   * @returns Success status and any error
   */
  static async sendNewCommentNotification(
    comment: any,
    review: ReviewWithProfile,
    appUrl: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const reviewUrl = `${appUrl}/reviews/${review.id}`;
      
      // Don't send notification to the comment author
      if (review.user.id === comment.user.id) {
        console.log('Skipping notification as comment author is review owner');
        return { success: true };
      }
      
      const html = `
        <h1>New Comment on Your Graph Review</h1>
        <p>A new comment has been added to your graph review "${review.title}".</p>
        <p><strong>Comment by:</strong> ${comment.user.name}</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #2db670; margin: 15px 0;">
          ${comment.content}
        </div>
        <p><a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Discussion</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `;

      return await this.sendEmail({
        to: review.user.email,
        subject: `New Comment on "${review.title}"`,
        html,
      });
    } catch (error) {
      console.error('Error sending comment notification:', error);
      return { success: false, error };
    }
  }

  /**
   * Send notification about a status change on a review
   * 
   * @param review The updated review
   * @param previousStatus The previous status before change
   * @param updatedBy User who updated the status
   * @param appUrl The base URL of the application
   * @returns Success status and any error
   */
  static async sendStatusChangeNotification(
    review: ReviewWithProfile,
    previousStatus: string,
    updatedBy: any,
    appUrl: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const reviewUrl = `${appUrl}/reviews/${review.id}`;
      
      // Don't send notification if the author updated their own review status
      if (review.user.id === updatedBy.id) {
        console.log('Skipping notification as status updated by review owner');
        return { success: true };
      }
      
      const html = `
        <h1>Status Change on Your Graph Review</h1>
        <p>The status of your graph review "${review.title}" has been updated.</p>
        <p><strong>Previous Status:</strong> ${previousStatus}</p>
        <p><strong>New Status:</strong> ${review.status}</p>
        <p><strong>Updated by:</strong> ${updatedBy.name}</p>
        <p><a href="${reviewUrl}" style="background-color: #2db670; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View Review</a></p>
        <p>Thank you,<br>LeanData Graph Review System</p>
      `;

      return await this.sendEmail({
        to: review.user.email,
        subject: `Status Update on "${review.title}"`,
        html,
      });
    } catch (error) {
      console.error('Error sending status change notification:', error);
      return { success: false, error };
    }
  }
}