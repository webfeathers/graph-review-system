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

      // In development mode without real credentials, log instead of sending
      if (process.env.NODE_ENV === 'development' && 
          (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
        console.log('Email would be sent (DEV MODE):');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Content:', options.html || options.text);
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
}