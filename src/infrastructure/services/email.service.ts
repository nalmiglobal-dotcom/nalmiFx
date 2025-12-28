import * as nodemailer from 'nodemailer';
import { connect } from '@/infrastructure/database';

// Create transporter lazily to ensure env vars are loaded
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Debug: Log SMTP configuration (without password)
    console.log('[Email] SMTP Config:', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || '587',
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 5)}...` : 'NOT SET',
      pass: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'NOT SET',
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('[Email] ERROR: SMTP_USER or SMTP_PASS not configured in .env');
      return false;
    }

    console.log('[Email] Sending to:', options.to, 'Subject:', options.subject);
    
    const result = await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    
    console.log('[Email] Sent successfully! MessageId:', result.messageId);
    return true;
  } catch (error: any) {
    console.error('[Email] Send error:', error.message);
    console.error('[Email] Full error:', error);
    return false;
  }
}

// Send email using a template from database
export async function sendTemplateEmail(
  slug: string,
  to: string,
  variables: Record<string, string>
): Promise<boolean> {
  try {
    await connect();
    const EmailTemplate = (await import('@/infrastructure/database/models/EmailTemplate')).default;
    
    const template = await EmailTemplate.findOne({ slug, isActive: true });
    if (!template) {
      console.error(`Email template '${slug}' not found or inactive`);
      return false;
    }

    // Replace variables in subject and content
    let subject = template.subject;
    let html = template.htmlContent;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      html = html.replace(regex, value);
    }

    return await sendEmail({ to, subject, html });
  } catch (error) {
    console.error('Send template email error:', error);
    return false;
  }
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOTPEmailTemplate(otp: string, purpose: 'verification' | 'password-reset'): string {
  const title = purpose === 'verification' ? 'Verify Your Email' : 'Reset Your Password';
  const message = purpose === 'verification' 
    ? 'Thank you for registering with NalmiFX. Please use the following OTP to verify your email address:'
    : 'You have requested to reset your password. Please use the following OTP to proceed:';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">${title}</h2>
                  <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">${message}</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                    <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">${otp}</span>
                  </div>
                  <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">This OTP will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
                  <p style="margin: 0; color: #a0a0a0; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
                  <p style="margin: 0; color: #606060; font-size: 12px;">© ${new Date().getFullYear()} NalmiFX. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
