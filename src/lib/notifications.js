import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';

/**
 * Send email notification
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.body - Email body (HTML)
 * @returns {Promise} - Nodemailer response
 */
export async function sendEmail({ to, subject, body }) {
  // Skip sending in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.SEND_EMAILS_IN_DEV) {
    console.log('Email notification skipped in dev mode:');
    console.log({ to, subject, body });
    return { success: true, dev: true };
  }
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: process.env.EMAIL_SERVER_PORT,
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
    
    // Create email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; }
            .content { padding: 20px 0; }
            .footer { font-size: 12px; color: #777; padding-top: 20px; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Graph Review System</h2>
            </div>
            <div class="content">
              ${body}
            </div>
            <div class="footer">
              <p>This is an automated notification from the Graph Review System.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: htmlBody,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

/**
 * Send Slack notification
 * @param {Object} options - Slack notification options
 * @param {string} options.userId - User ID to notify
 * @param {string} options.message - Message content
 * @param {Object} options.blocks - Optional Slack blocks for rich content
 * @returns {Promise} - Slack API response
 */
export async function sendSlackNotification({ userId, message, blocks }) {
  // Skip if Slack is not configured
  if (!process.env.SLACK_BOT_TOKEN) {
    return { success: false, error: 'Slack integration not configured' };
  }
  
  // Skip sending in development mode
  if (process.env.NODE_ENV === 'development' && !process.env.SEND_SLACK_IN_DEV) {
    console.log('Slack notification skipped in dev mode:');
    console.log({ userId, message });
    return { success: true, dev: true };
  }
  
  try {
    // Get user's Slack ID from database or mapping
    // This is a placeholder - you would need to implement user-to-slack mapping
    const slackId = await getSlackIdForUser(userId);
    
    if (!slackId) {
      return { success: false, error: 'No Slack ID found for user' };
    }
    
    // Initialize Slack client
    const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Send message
    const result = await slack.chat.postMessage({
      channel: slackId,
      text: message,
      ...(blocks && { blocks }),
    });
    
    return { success: true, result };
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return { success: false, error };
  }
}

/**
 * Fetch Slack ID for a user
 * @param {string} userId - Internal user ID
 * @returns {Promise<string|null>} - Slack user ID or null
 */
async function getSlackIdForUser(userId) {
  // In a real implementation, you would:
  // 1. Check your database for a mapping between your users and Slack IDs
  // 2. Or use Slack User Identity API if you've implemented Slack OAuth
  
  // This is a placeholder - implement your own logic
  console.log(`Would look up Slack ID for user ${userId}`);
  
  // Return null to indicate no Slack ID found
  return null;
}