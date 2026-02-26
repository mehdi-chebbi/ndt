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
