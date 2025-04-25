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
    console.log('📧 Creating email transporter with config:');
    
    // Get configuration
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587;
    const secure = process.env.EMAIL_PORT === '465';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    
    // Log configuration (without password)
    console.log({
      host,
      port,
      secure,
      auth: {
        user,
        pass: pass ? '******' : undefined
      }
    });
    
    // Validate required configuration
    if (!host) console.warn('⚠️ Missing EMAIL_HOST environment variable');
    if (!user) console.warn('⚠️ Missing EMAIL_USER environment variable');
    if (!pass) console.warn('⚠️ Missing EMAIL_PASSWORD environment variable');
    
    // Create and return transporter
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? {
        user,
        pass,
      } : undefined,
      // Enable debug mode
      logger: true,
      debug: true, // Include extra logging
    });
  }

  /**
   * Force development mode for testing
   */
  private static isDevelopmentMode() {
    // Check for empty credentials or dev environment
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
    console.log('📧 sendEmail called with options:', {
      to: options.to,
      subject: options.subject,
      from: options.from,
      hasText: !!options.text,
      hasHtml: !!options.html,
    });
    
    try {
      // Validate required fields
      if (!options.to || !options.subject || (!options.text && !options.html)) {
        console.log('❌ Validation failed: Missing required fields');
        return { 
          success: false, 
          error: 'Missing required fields: to, subject, and either text or html' 
        };
      }

      // Check if in development mode
      const devMode = this.isDevelopmentMode();
      console.log('📧 Development mode?', devMode);
      
      // In development mode, log instead of sending
      if (devMode) {
        console.log('📧 DEV MODE - Email would be sent:');
        console.log('To:', options.to);
        console.log('From:', options.from || process.env.EMAIL_FROM || 'noreply@example.com');
        console.log('Subject:', options.subject);
        console.log('Text:', options.text);
        console.log('HTML:', options.html);
        return { success: true };
      }

      // Create transporter for this email
      console.log('📧 Creating transporter');
      const transporter = this.createTransporter();
      
      // Try a transporter verify to check connection
      try {
        console.log('📧 Verifying transporter connection');
        await transporter.verify();
        console.log('📧 Transporter connection verified ✅');
      } catch (verifyError) {
        console.error('❌ Transporter verification failed:', verifyError);
        return { 
          success: false, 
          error: {
            message: 'Failed to connect to email server',
            details: verifyError
          }
        };
      }
      
      // Send the email
      console.log('📧 Sending email');
      const info = await transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM || 'noreply@example.com',
        to: options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html || '',
      });

      console.log('📧 Email sent successfully:', info.messageId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      
      // Extract useful error properties
      const errorObj = error as any;
      let errorInfo = {
        message: errorObj.message || 'Unknown error',
        code: errorObj.code,
        command: errorObj.command,
        responseCode: errorObj.responseCode,
        stack: errorObj.stack
      };
      
      return { success: false, error: errorInfo };
    }
  }
}