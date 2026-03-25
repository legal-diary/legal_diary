import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  userName: string
): Promise<void> {
  const displayName = userName || 'there';
  const fromAddress = process.env.SMTP_USER || 'noreply@legaldiary.com';

  const mail = getTransporter();

  await mail.sendMail({
    from: `Legal Diary <${fromAddress}>`,
    to,
    subject: 'Reset your Legal Diary password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background: #1a3a52; padding: 24px 32px; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Legal Diary</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 32px;">
                    <p style="margin: 0 0 16px; color: #333; font-size: 15px;">Hi ${displayName},</p>
                    <p style="margin: 0 0 24px; color: #555; font-size: 14px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to set a new password.
                    </p>
                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 8px 0 24px;">
                          <a href="${resetUrl}" style="display: inline-block; background: #1a3a52; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; color: #888; font-size: 12px;">This link expires in <strong>1 hour</strong>.</p>
                    <p style="margin: 0 0 24px; color: #888; font-size: 12px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="margin: 0; color: #aaa; font-size: 11px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="margin: 4px 0 0; color: #1890ff; font-size: 11px; word-break: break-all;">${resetUrl}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
}
