const nodemailer = require('nodemailer');

/**
 * Creates a transporter for sending emails using SMTP settings from .env.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a password reset email.
 * 
 * @param {string} to - Recipient email address
 * @param {string} token - The reset token
 */
async function sendResetEmail(to, token) {
  // In a real app, this would be a link to your frontend reset page.
  // For this local setup, we'll provide both the token and a hypothetical link.
  const resetLink = `http://localhost:3000/forgot-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"TZW FEMS" <noreply@tzw-fems.com>',
    to,
    subject: 'Password Reset Request - TZW FEMS',
    text: `You requested a password reset for your TZW FEMS account.\n\n` +
          `Please use the following token to reset your password:\n\n${token}\n\n` +
          `Or click the link below to go to the reset page:\n${resetLink}\n\n` +
          `This token will expire in 1 hour.\n\n` +
          `If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #e11d48;">Password Reset Request</h2>
        <p>You requested a password reset for your <strong>TZW FEMS</strong> account.</p>
        <p>Please use the following token to reset your password:</p>
        <div style="background: #f4f4f5; padding: 10px; font-family: monospace; font-size: 18px; text-align: center; border-radius: 4px; margin: 20px 0;">
          ${token}
        </div>
        <p>Alternatively, click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: #e11d48; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 12px;">This token will expire in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Reset email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Error sending email to ${to}:`, error);
    // We don't throw here to avoid leaking SMTP errors to the client, 
    // but we return false so the controller knows it failed.
    return false;
  }
}

module.exports = {
  sendResetEmail,
};
