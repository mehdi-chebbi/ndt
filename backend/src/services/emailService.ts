import nodemailer from 'nodemailer';
import pool from '../config/database';

// Email credentials (hardcoded for local testing)
const EMAIL_USER = 'mehdipfe437@gmail.com';
const EMAIL_PASS = 'wewy bkot lvxe azcv';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// Generate alphanumeric code (6 characters)
export function generateResetCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetCode: string
): Promise<void> {
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: '[NDT Platform] Password Reset Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; background: white; padding: 20px; border-radius: 8px; border: 2px dashed #1f2937; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Password Reset</h2>
          </div>
          <div class="content">
            <p>You requested to reset your password.</p>
            <p>Enter this code on the reset page:</p>
            <div class="code">${resetCode}</div>
            <p class="warning">This code expires in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the NDT Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Get all active notification recipients
export async function getNotificationRecipients(): Promise<string[]> {
  try {
    const result = await pool.query(
      'SELECT email FROM notification_recipients WHERE is_active = true'
    );
    return result.rows.map(row => row.email);
  } catch (error) {
    console.error('Error fetching notification recipients:', error);
    return [];
  }
}

// Send notification email for new report
export async function sendReportNotification(reportData: {
  reportId: number;
  reporterName: string;
  reporterEmail: string;
  layer: string;
  comment: string;
}): Promise<void> {
  const recipients = await getNotificationRecipients();

  if (recipients.length === 0) {
    console.log('No notification recipients configured');
    return;
  }

  const { reportId, reporterName, reporterEmail, layer, comment } = reportData;

  const mailOptions = {
    from: EMAIL_USER,
    to: recipients.join(', '),
    subject: `[NDT Platform] New Invalid Data Report #${reportId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #111827; margin-top: 4px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 12px; background: #fee2e2; color: #dc2626; border-radius: 9999px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Invalid Data Report</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">Report #${reportId}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Status</div>
              <div class="value"><span class="badge">INVALID</span></div>
            </div>
            <div class="field">
              <div class="label">Reported By</div>
              <div class="value">${reporterName} (${reporterEmail})</div>
            </div>
            <div class="field">
              <div class="label">Layer</div>
              <div class="value">${layer}</div>
            </div>
            <div class="field">
              <div class="label">Comment</div>
              <div class="value">${comment}</div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from the NDT Platform.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${recipients.length} recipient(s) for report #${reportId}`);
  } catch (error) {
    console.error('Error sending notification email:', error);
    throw error;
  }
}

// Send notification email for new contact form submission
export async function sendContactNotification(contactData: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const recipients = await getNotificationRecipients();

  if (recipients.length === 0) {
    console.log('No notification recipients configured for contact form');
    return;
  }

  const { name, email, subject, message } = contactData;

  const mailOptions = {
    from: EMAIL_USER,
    to: recipients.join(', '),
    subject: `[NDT Platform] Contact Us: ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #111827; margin-top: 4px; }
          .message-box { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .badge { display: inline-block; padding: 4px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 9999px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Contact Form Submission</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.8;">LDN Platform Africa — Contact Us</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">From</div>
              <div class="value">${name} (${email})</div>
            </div>
            <div class="field">
              <div class="label">Subject</div>
              <div class="value"><span class="badge">${subject}</span></div>
            </div>
            <div class="field">
              <div class="label">Message</div>
              <div class="message-box">${message}</div>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from the NDT Platform Contact Form.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Contact notification email sent to ${recipients.length} recipient(s)`);
  } catch (error) {
    console.error('Error sending contact notification email:', error);
    throw error;
  }
}
