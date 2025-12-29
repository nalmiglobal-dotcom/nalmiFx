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

export function getDepositApprovedEmailTemplate(userName: string, amount: number, method: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deposit Approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Deposit Approved ✓</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Great news! Your deposit has been approved and credited to your account.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                        <td style="color: #22c55e; font-size: 18px; font-weight: bold; text-align: right;">$${amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Method:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${method.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #22c55e; font-size: 14px; text-align: right;">Approved</td>
                      </tr>
                    </table>
                  </div>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">You can now start trading with your funds. Happy trading!</p>
                  <a href="https://nalmifx.com/userdashboard/home" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
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

export function getDepositRejectedEmailTemplate(userName: string, amount: number, reason: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Deposit Rejected</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Deposit Rejected</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Unfortunately, your deposit request has been rejected.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                        <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">$${amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #dc2626; font-size: 14px; text-align: right;">Rejected</td>
                      </tr>
                    </table>
                  </div>
                  ${reason ? `<div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason:</p>
                    <p style="margin: 0; color: #a0a0a0; font-size: 14px;">${reason}</p>
                  </div>` : ''}
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">If you have any questions, please contact our support team.</p>
                  <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
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

export function getWithdrawalApprovedEmailTemplate(userName: string, amount: number, method: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Withdrawal Approved</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Withdrawal Approved ✓</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your withdrawal request has been approved and is being processed.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                        <td style="color: #22c55e; font-size: 18px; font-weight: bold; text-align: right;">$${amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Method:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${method.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #22c55e; font-size: 14px; text-align: right;">Approved</td>
                      </tr>
                    </table>
                  </div>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">The funds will be transferred to your account within 1-3 business days.</p>
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

export function getWithdrawalRejectedEmailTemplate(userName: string, amount: number, reason: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Withdrawal Rejected</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Withdrawal Rejected</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Unfortunately, your withdrawal request has been rejected.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                        <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">$${amount.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #dc2626; font-size: 14px; text-align: right;">Rejected</td>
                      </tr>
                    </table>
                  </div>
                  ${reason ? `<div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason:</p>
                    <p style="margin: 0; color: #a0a0a0; font-size: 14px;">${reason}</p>
                  </div>` : ''}
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your funds have been returned to your wallet. If you have any questions, please contact support.</p>
                  <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
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

export function getTradeExecutedEmailTemplate(userName: string, trade: { symbol: string; side: string; lot: number; entryPrice: number }): string {
  const sideColor = trade.side === 'BUY' ? '#22c55e' : '#dc2626';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trade Executed</title>
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
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Trade Executed ✓</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your trade has been successfully executed.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Symbol:</td>
                        <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">${trade.symbol}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Side:</td>
                        <td style="color: ${sideColor}; font-size: 14px; font-weight: bold; text-align: right;">${trade.side}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Lot Size:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.lot}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Entry Price:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.entryPrice}</td>
                      </tr>
                    </table>
                  </div>
                  <a href="https://nalmifx.com/userdashboard/trading" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Trade</a>
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

export function getTradeClosedEmailTemplate(userName: string, trade: { symbol: string; side: string; lot: number; entryPrice: number; closePrice: number; pnl: number }): string {
  const pnlColor = trade.pnl >= 0 ? '#22c55e' : '#dc2626';
  const pnlSign = trade.pnl >= 0 ? '+' : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trade Closed</title>
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
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Trade Closed</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your trade has been closed.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Symbol:</td>
                        <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">${trade.symbol}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Side:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.side}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Lot Size:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.lot}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Entry Price:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.entryPrice}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Close Price:</td>
                        <td style="color: #ffffff; font-size: 14px; text-align: right;">${trade.closePrice}</td>
                      </tr>
                      <tr>
                        <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">P&L:</td>
                        <td style="color: ${pnlColor}; font-size: 18px; font-weight: bold; text-align: right;">${pnlSign}$${trade.pnl.toFixed(2)}</td>
                      </tr>
                    </table>
                  </div>
                  <a href="https://nalmifx.com/userdashboard/trading" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View History</a>
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

export function getAccountReactivatedEmailTemplate(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Reactivated</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Account Reactivated ✓</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Great news! Your NalmiFX account has been reactivated and you can now access all features again.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">What you can do now:</p>
                    <ul style="margin: 0; padding-left: 20px; color: #a0a0a0; font-size: 14px;">
                      <li style="margin-bottom: 8px;">Log in to your account</li>
                      <li style="margin-bottom: 8px;">Resume trading activities</li>
                      <li style="margin-bottom: 8px;">Deposit and withdraw funds</li>
                      <li>Access all platform features</li>
                    </ul>
                  </div>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">We're glad to have you back! If you have any questions, feel free to contact our support team.</p>
                  <a href="https://nalmifx.com/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Log In Now</a>
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

export function getAccountSuspendedEmailTemplate(userName: string, reason: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Suspended</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">NalmiFX</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Account Suspended</h2>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear ${userName},</p>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">We regret to inform you that your NalmiFX account has been suspended.</p>
                  <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason for suspension:</p>
                    <p style="margin: 0; color: #a0a0a0; font-size: 14px;">${reason}</p>
                  </div>
                  <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">If you believe this is a mistake or would like to appeal this decision, please contact our support team.</p>
                  <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
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
