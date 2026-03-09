/**
 * Email Service
 * Handles all email sending via Nodemailer (SMTP) or configured provider
 * Supports: OTP verification, subscription reminders, welcome emails, payment receipts
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'Vision POS <noreply@visionpos.com>';
    this.appName = process.env.APP_NAME || 'Vision POS';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.initialized = false;
  }

  /**
   * Initialize transporter lazily
   */
  getTransporter() {
    if (this.transporter) return this.transporter;

    // Check if email is configured
    if (!process.env.SMTP_HOST && !process.env.EMAIL_HOST) {
      console.warn('[Email] SMTP not configured. Emails will be logged to console.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
      secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });

    this.initialized = true;
    return this.transporter;
  }

  /**
   * Send an email (or log to console if SMTP not configured)
   */
  async send(to, subject, html, text = null) {
    const transporter = this.getTransporter();
    
    const mailOptions = {
      from: this.from,
      to,
      subject: `${this.appName} - ${subject}`,
      html,
      text: text || this.stripHtml(html),
    };

    if (!transporter) {
      // Log to console in dev mode
      console.log(`\n[Email] To: ${to}`);
      console.log(`[Email] Subject: ${mailOptions.subject}`);
      console.log(`[Email] Body: ${mailOptions.text?.substring(0, 200)}...\n`);
      return { messageId: `console-${Date.now()}`, logged: true };
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`[Email] Sent to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`[Email] Failed to send to ${to}:`, error.message);
      // Don't throw - email failures should not break business logic
      return { error: error.message };
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOtp(email, name, otp) {
    const subject = 'Verify Your Account';
    const html = this.template(`
      <h2>Welcome to ${this.appName}! 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your verification code is:</p>
      <div style="text-align:center;margin:30px 0;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#4F46E5;background:#EEF2FF;padding:16px 32px;border-radius:12px;display:inline-block;">${otp}</span>
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Send welcome email after account verification
   */
  async sendWelcome(email, name, companyName) {
    const subject = 'Welcome! Your Account is Ready';
    const html = this.template(`
      <h2>Your account is verified! ✅</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Great news! Your company <strong>${companyName}</strong> is all set up and ready to use.</p>
      <p>Here's what you can do:</p>
      <ul style="margin:20px 0;">
        <li>🏪 Set up your first branch</li>
        <li>📦 Add your products & categories</li>
        <li>🛒 Start taking orders from the POS</li>
        <li>📊 Track sales & inventory in real-time</li>
        <li>📈 Generate detailed reports</li>
      </ul>
      <p>You have a <strong>14-day free trial</strong> to explore all features.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${this.frontendUrl}/login" style="display:inline-block;padding:14px 32px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Login to Dashboard</a>
      </div>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Send trial expiring warning
   */
  async sendTrialExpiring(email, name, companyName, daysLeft) {
    const subject = `Trial Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`;
    const html = this.template(`
      <h2>Your trial is ending soon ⏰</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your free trial for <strong>${companyName}</strong> will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
      <p>To continue using all features without interruption, please subscribe to a plan.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${this.frontendUrl}/settings/subscription" style="display:inline-block;padding:14px 32px;background:#4F46E5;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Choose a Plan</a>
      </div>
      <p style="color:#64748b;font-size:13px;">Your data is safe and will be preserved. After trial expiry, you'll only need to subscribe to regain access.</p>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Send subscription expired notice
   */
  async sendSubscriptionExpired(email, name, companyName) {
    const subject = 'Subscription Expired';
    const html = this.template(`
      <h2>Your subscription has expired ⚠️</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>The subscription for <strong>${companyName}</strong> has expired. Your account access is now limited.</p>
      <p>To restore full access to your POS, inventory, and accounting features, please renew your subscription.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${this.frontendUrl}/subscription-payment" style="display:inline-block;padding:14px 32px;background:#EF4444;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Renew Now</a>
      </div>
      <p style="color:#64748b;font-size:13px;">All your data is securely preserved and will be available immediately after renewal.</p>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Send subscription renewal confirmation / payment receipt
   */
  async sendPaymentReceipt(email, name, receipt) {
    const { invoiceNumber, planName, amount, currency, period, expiresAt } = receipt;
    const subject = `Payment Confirmation - ${invoiceNumber}`;
    const html = this.template(`
      <h2>Payment Successful! 🎉</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your subscription has been renewed successfully.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:24px;margin:24px 0;">
        <h3 style="margin:0 0 16px;color:#1E293B;">Payment Receipt</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#64748b;">Invoice #</td><td style="padding:8px 0;text-align:right;font-weight:600;">${invoiceNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Plan</td><td style="padding:8px 0;text-align:right;font-weight:600;">${planName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Period</td><td style="padding:8px 0;text-align:right;">${period === 'yearly' ? 'Yearly' : 'Monthly'}</td></tr>
          <tr style="border-top:2px solid #E2E8F0;"><td style="padding:12px 0;color:#1E293B;font-weight:bold;">Total</td><td style="padding:12px 0;text-align:right;font-weight:bold;font-size:18px;color:#4F46E5;">${currency} ${amount}</td></tr>
        </table>
      </div>
      <p>Your subscription is valid until <strong>${new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.</p>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Send subscription expiry reminder (before expiry)
   */
  async sendSubscriptionExpiryReminder(email, name, companyName, daysLeft) {
    const subject = `Subscription Expiring in ${daysLeft} Day${daysLeft > 1 ? 's' : ''}`;
    const html = this.template(`
      <h2>Subscription Renewal Reminder 🔔</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your subscription for <strong>${companyName}</strong> will expire in <strong>${daysLeft} day${daysLeft > 1 ? 's' : ''}</strong>.</p>
      <p>Renew now to avoid any service interruption.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${this.frontendUrl}/settings/subscription" style="display:inline-block;padding:14px 32px;background:#F59E0B;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Renew Subscription</a>
      </div>
    `);
    return this.send(email, subject, html);
  }

  /**
   * Base email template wrapper
   */
  template(content) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:24px;font-weight:700;">${this.appName}</h1>
            </td></tr>
            <!-- Content -->
            <tr><td style="padding:40px;color:#334155;font-size:15px;line-height:1.7;">
              ${content}
            </td></tr>
            <!-- Footer -->
            <tr><td style="background:#F8FAFC;padding:24px 40px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">© ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
              <p style="margin:8px 0 0;color:#94A3B8;font-size:12px;">This is an automated message, please do not reply.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;
  }

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

module.exports = new EmailService();
