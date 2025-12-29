import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/domains/auth/services/auth.service';
import { connect } from '@/infrastructure/database';
import EmailTemplate from '@/infrastructure/database/models/EmailTemplate';

// Email template definitions
const emailTemplates = [
  {
    name: 'OTP Verification',
    slug: 'otp-verification',
    subject: 'Verify Your Email - NalmiFX',
    description: 'Sent when user needs to verify their email with OTP',
    variables: ['otp'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Verify Your Email</h2>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Thank you for registering with NalmiFX. Please use the following OTP to verify your email address:</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">{{otp}}</span>
              </div>
              <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">This OTP will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
              <p style="margin: 0; color: #a0a0a0; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    subject: 'Reset Your Password - NalmiFX',
    description: 'Sent when user requests password reset',
    variables: ['otp'],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
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
              <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">You have requested to reset your password. Please use the following OTP to proceed:</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">{{otp}}</span>
              </div>
              <p style="margin: 0 0 10px; color: #a0a0a0; font-size: 14px;">This OTP will expire in <strong style="color: #ffffff;">10 minutes</strong>.</p>
              <p style="margin: 0; color: #a0a0a0; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Account Suspended',
    slug: 'account-suspended',
    subject: 'Your NalmiFX Account Has Been Suspended',
    description: 'Sent when admin bans/suspends a user account',
    variables: ['userName', 'reason'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">We regret to inform you that your NalmiFX account has been suspended.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason for suspension:</p>
                <p style="margin: 0; color: #a0a0a0; font-size: 14px;">{{reason}}</p>
              </div>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">If you believe this is a mistake or would like to appeal this decision, please contact our support team.</p>
              <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Account Reactivated',
    slug: 'account-reactivated',
    subject: 'Your NalmiFX Account Has Been Reactivated',
    description: 'Sent when admin unbans/reactivates a user account',
    variables: ['userName'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">We're glad to have you back!</p>
              <a href="https://nalmifx.com/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Log In Now</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Deposit Approved',
    slug: 'deposit-approved',
    subject: 'Your Deposit Has Been Approved - NalmiFX',
    description: 'Sent when admin approves a deposit request',
    variables: ['userName', 'amount', 'method'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Great news! Your deposit has been approved and credited to your account.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                    <td style="color: #22c55e; font-size: 18px; font-weight: bold; text-align: right;">${"$"}{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Method:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{method}}</td>
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
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Deposit Rejected',
    slug: 'deposit-rejected',
    subject: 'Your Deposit Has Been Rejected - NalmiFX',
    description: 'Sent when admin rejects a deposit request',
    variables: ['userName', 'amount', 'reason'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Unfortunately, your deposit request has been rejected.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                    <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">${"$"}{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                    <td style="color: #dc2626; font-size: 14px; text-align: right;">Rejected</td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason:</p>
                <p style="margin: 0; color: #a0a0a0; font-size: 14px;">{{reason}}</p>
              </div>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">If you have any questions, please contact our support team.</p>
              <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Withdrawal Approved',
    slug: 'withdrawal-approved',
    subject: 'Your Withdrawal Has Been Approved - NalmiFX',
    description: 'Sent when admin approves a withdrawal request',
    variables: ['userName', 'amount', 'method'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your withdrawal request has been approved and is being processed.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                    <td style="color: #22c55e; font-size: 18px; font-weight: bold; text-align: right;">${"$"}{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Method:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{method}}</td>
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
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Withdrawal Rejected',
    slug: 'withdrawal-rejected',
    subject: 'Your Withdrawal Has Been Rejected - NalmiFX',
    description: 'Sent when admin rejects a withdrawal request',
    variables: ['userName', 'amount', 'reason'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Unfortunately, your withdrawal request has been rejected.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Amount:</td>
                    <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">${"$"}{{amount}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Status:</td>
                    <td style="color: #dc2626; font-size: 14px; text-align: right;">Rejected</td>
                  </tr>
                </table>
              </div>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                <p style="margin: 0 0 10px; color: #ffffff; font-size: 14px; font-weight: 600;">Reason:</p>
                <p style="margin: 0; color: #a0a0a0; font-size: 14px;">{{reason}}</p>
              </div>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your funds have been returned to your wallet. If you have any questions, please contact support.</p>
              <a href="mailto:support@nalmifx.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Support</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Trade Executed',
    slug: 'trade-executed',
    subject: 'Trade Executed - NalmiFX',
    description: 'Sent when a trade is successfully executed',
    variables: ['userName', 'symbol', 'side', 'lot', 'entryPrice'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your trade has been successfully executed.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Symbol:</td>
                    <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">{{symbol}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Side:</td>
                    <td style="color: #ffffff; font-size: 14px; font-weight: bold; text-align: right;">{{side}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Lot Size:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{lot}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Entry Price:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{entryPrice}}</td>
                  </tr>
                </table>
              </div>
              <a href="https://nalmifx.com/userdashboard/trading" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Trade</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    name: 'Trade Closed',
    slug: 'trade-closed',
    subject: 'Trade Closed - NalmiFX',
    description: 'Sent when a trade is closed',
    variables: ['userName', 'symbol', 'side', 'lot', 'entryPrice', 'closePrice', 'pnl'],
    htmlContent: `<!DOCTYPE html>
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
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Dear {{userName}},</p>
              <p style="margin: 0 0 20px; color: #a0a0a0; font-size: 16px; line-height: 1.6;">Your trade has been closed.</p>
              <div style="background-color: #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%;">
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Symbol:</td>
                    <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">{{symbol}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Side:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{side}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Lot Size:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{lot}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Entry Price:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{entryPrice}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">Close Price:</td>
                    <td style="color: #ffffff; font-size: 14px; text-align: right;">{{closePrice}}</td>
                  </tr>
                  <tr>
                    <td style="color: #a0a0a0; font-size: 14px; padding: 8px 0;">P&L:</td>
                    <td style="color: #ffffff; font-size: 18px; font-weight: bold; text-align: right;">{{pnl}}</td>
                  </tr>
                </table>
              </div>
              <a href="https://nalmifx.com/userdashboard/trading" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">View History</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 40px; text-align: center; border-top: 1px solid #2a2a4a;">
              <p style="margin: 0; color: #606060; font-size: 12px;">© 2024 NalmiFX. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];

// POST - Seed email templates
export async function POST(request: Request) {
  try {
    const session = await getAdminSessionFromRequest(request);

    if (!session || session.scope !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      );
    }

    await connect();

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const template of emailTemplates) {
      try {
        const existing = await EmailTemplate.findOne({ slug: template.slug });
        
        if (existing) {
          // Update existing template
          await EmailTemplate.updateOne(
            { slug: template.slug },
            { $set: template }
          );
          results.updated++;
        } else {
          // Create new template
          await EmailTemplate.create(template);
          results.created++;
        }
      } catch (error: any) {
        results.errors.push(`${template.slug}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email templates seeded. Created: ${results.created}, Updated: ${results.updated}`,
      results,
    });
  } catch (error: any) {
    console.error('Error seeding email templates:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to seed email templates' },
      { status: 500 }
    );
  }
}

// GET - List all templates
export async function GET(request: Request) {
  try {
    const session = await getAdminSessionFromRequest(request);

    if (!session || (session.scope !== 'admin' && session.scope !== 'tradeMaster')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    await connect();

    const templates = await EmailTemplate.find({}).sort({ name: 1 }).lean();

    return NextResponse.json({
      success: true,
      templates,
      availableTemplates: emailTemplates.map(t => ({ name: t.name, slug: t.slug, description: t.description })),
    });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}
