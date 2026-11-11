import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config({ override: true });

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

import { mockAvatars, transporter } from './usersStore';
import { getLogoAttachment, getEmailHeaderHtml, getEmailFooterHtml } from './emailTemplateHelper';
export { mockAvatars, transporter };

import {
  findUserByEmail,
  createNewUser,
  getAllCustomersList,
  updateCustomerApprovalStatus,
  updateCustomerDetails,
  mockUsers,
  mockRanches,
  mockTanks,
  mockPlatformSettings,
  mockAuditLogs,
  addAuditLog,
  mockProducts,
  mockOrdersList,
  mockInvoices,
  mockTasks,
  mockLabResults,
  mockNotifications,
  acceptOrderAndSendPaymentEmail,
  adminAcceptOrder,
  customerConfirmDelivery,
  dispatchProcessDecision,
  payOrderAndGenerateInvoice,
  updateOrderTracking,
  cancelOrderWithRefund,
  createEmployeeTask,
  updateTaskStatus,
  addLabResult,
  toggleRanchHidden,
  assignGrowerToEmployee,
  saveStore,
  syncStoreFromDB
} from './usersStore';
import {
  sendOrderAcceptedEmailToCustomer,
  sendCustomerConfirmedEmailToDispatch,
  renderCustomerConfirmHtmlPage,
  renderDispatchActionHtmlPage,
  getBaseBackendUrl,
  getBaseFrontendUrl,
  sendNewUserCredentialsEmail,
  sendPasswordResetCredentialsEmail,
  sendCustomerAccountStatusEmail,
  sendOrderPlacedAlertEmailToCustomer,
  sendLabResultReadyEmailToCustomer,
  sendInvoiceAlertEmailToCustomer,
  sendDeliveryStatusEmailToCustomer,
  DISPATCH_NOTIFICATION_EMAIL
} from './orderEmailService';
import { syncAllTanksTelemetry } from './otodataService';
import { syncOpenDeliveriesWithOptimoRoute } from './optimoRouteService';

import helmet from 'helmet';
import compression from 'compression';

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
import rateLimit from 'express-rate-limit';

app.set('trust proxy', 1);

// Global API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PWA Web App Manifest & Service Worker
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    short_name: 'ReNu-Biome',
    name: 'ReNu-Biome Agricultural Operations',
    description: 'Biological plant nutrition delivery tracking, ranch blocks and invoices.',
    icons: [
      {
        src: '/assets/icon.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any maskable'
      },
      {
        src: '/assets/icon.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any maskable'
      }
    ],
    start_url: '/',
    background_color: '#0F2318',
    theme_color: '#2E5D36',
    display: 'standalone',
    orientation: 'any'
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
const CACHE_NAME = 'renu-biome-cache-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', (e) => {});
  `);
});

// Static assets from mobile assets folder
app.use('/assets', express.static(path.join(__dirname, '../../mobile/assets')));
app.use('/brand', express.static(path.join(__dirname, '../../mobile/assets/brand')));

// Standalone /install route for direct browser and QR access
app.get('/install', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install ReNu-Biome Grower Portal</title>
  <link rel="icon" type="image/png" href="/brand/renu-biome-app-icon-64.png">
  <link rel="apple-touch-icon" href="/brand/renu-biome-app-icon-180.png">
  <link rel="manifest" href="/manifest.json">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; color: #0F172A; display: flex; justify-content: center; padding: 24px 16px; }
    .card { background: #FFFFFF; max-width: 480px; width: 100%; border-radius: 18px; padding: 28px 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; text-align: center; }
    .logo { max-width: 220px; height: auto; margin-bottom: 4px; }
    .tagline { font-style: italic; color: #64748B; font-size: 14px; margin-bottom: 8px; }
    .badge { display: inline-block; background: #F0FDFA; color: #0C6054; border: 1px solid #99F6E4; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #0F172A; }
    p.desc { font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 20px; }
    .instruction-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px 16px; text-align: left; margin-bottom: 20px; }
    .instruction-header { font-size: 15px; font-weight: 700; color: #0C6054; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .step { display: flex; gap: 10px; margin-bottom: 12px; font-size: 13px; line-height: 1.4; color: #334155; }
    .step-num { background: #0C6054; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; flex-shrink: 0; }
    .qr-container { margin: 16px 0; text-align: center; }
    .qr-img { width: 180px; height: 180px; border-radius: 12px; border: 1px solid #E2E8F0; padding: 6px; background: white; }
    .qr-url { font-weight: 700; color: #0C6054; font-size: 13px; margin-top: 6px; }
    .btn { display: block; width: 100%; background: #0C6054; color: white; text-decoration: none; font-weight: 700; padding: 12px; border-radius: 10px; text-align: center; font-size: 14px; margin-top: 8px; border: none; cursor: pointer; }
    .btn:hover { background: #083F38; }
    .footer { font-size: 11px; color: #94A3B8; margin-top: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/brand/renu-biome-logo-teal-orange-for-light-backgrounds.png" class="logo" alt="ReNu-Biome Logo">
    <div class="tagline">Farmer's Pride</div>
    <div class="badge">GROWER PORTAL</div>
    <h1>Install ReNu-Biome App</h1>
    <p class="desc">Add the portal to your home screen for instant 1-tap access to delivery schedules, tank levels, and nutrition programs.</p>

    <div id="device-instructions" class="instruction-box">
      <!-- Injected by script based on device -->
    </div>

    <a href="/" class="btn">Launch Grower Portal</a>
    <div class="footer">
      Questions or need assistance? Email support@renu-biome.com.
    </div>
  </div>

  <script>
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const box = document.getElementById('device-instructions');

    if (isIOS) {
      box.innerHTML = '<div class="instruction-header">📱 iPhone & iPad (App Store)</div>' +
        '<a href="https://apps.apple.com/app/id6832246515" class="btn" style="background:#0F172A;margin:0 0 14px 0;">Download on the App Store</a>' +
        '<div style="font-size:12px;color:#64748B;margin-bottom:10px;">Or add the web portal directly via Safari:</div>' +
        '<div class="step"><div class="step-num">1</div><div>Tap the <strong>Share</strong> button at the bottom of Safari (square with up arrow).</div></div>' +
        '<div class="step"><div class="step-num">2</div><div>Scroll down and tap <strong>Add to Home Screen</strong>.</div></div>' +
        '<div class="step"><div class="step-num">3</div><div>Tap <strong>Add</strong> in the top right. ReNu-Biome will appear on your home screen.</div></div>';
    } else if (isAndroid) {
      box.innerHTML = '<div class="instruction-header">🤖 Android (Chrome)</div>' +
        '<div class="step"><div class="step-num">1</div><div>Tap the browser menu (<strong>⋮</strong> three dots) in Chrome.</div></div>' +
        '<div class="step"><div class="step-num">2</div><div>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</div></div>' +
        '<div class="step"><div class="step-num">3</div><div>Tap <strong>Add</strong> to confirm.</div></div>';
    } else {
      box.innerHTML = '<div class="instruction-header">📷 Scan to Download on the App Store</div>' +
        '<p style="font-size:12px;color:#64748B;margin-bottom:12px;">Open your phone camera and point it at the QR code below to download from the App Store:</p>' +
        '<div class="qr-container"><a href="https://apps.apple.com/app/id6832246515" style="text-decoration:none;">' +
        '<img src="/brand/renu-biome-install-qr-300dpi.png" class="qr-img" alt="ReNu-Biome App Store QR">' +
        '<div class="qr-url">apps.apple.com/app/id6832246515</div></a></div>' +
        '<a href="https://apps.apple.com/app/id6832246515" class="btn" style="background:#0F172A;margin-top:8px;">Open in App Store</a>' +
        '<p style="font-size:11px;color:#94A3B8;margin-top:10px;">Or on desktop Chrome/Edge, click the install icon in the address bar.</p>';
    }
  </script>
</body>
</html>`);
});

// Auth Helpers (non-blocking SMTP dispatch so sign-in/OTP never stalls on slow SMTP)
function resolveOtpTargetEmail(email: string): string {
  if (!email.includes('@')) {
    return email.includes('admin')
      ? 'support@renu-biome.com'
      : 'rgundavelli@gmail.com';
  }
  return email;
}

function dispatchMailAsync(mailOptions: any, tag: string, onFailure?: () => void): void {
  if (!(process.env.SMTP_USER && process.env.SMTP_PASS)) {
    if (onFailure) onFailure();
    return;
  }
  void transporter
    .sendMail(mailOptions)
    .then(() => {
      console.log(`[${tag}] Email dispatched to ${mailOptions.to}`);
    })
    .catch((mailErr: any) => {
      console.warn(`[${tag}] SMTP dispatch to ${mailOptions.to} failed:`, mailErr?.message || mailErr);
      if (onFailure) onFailure();
    });
}

function dispatchMfaOtpEmail(params: {
  userEmail: string;
  targetEmail: string;
  code: string;
  isResend?: boolean;
}): void {
  const { userEmail, targetEmail, code, isResend } = params;
  const tag = isResend ? 'MFA Resend' : 'MFA';
  const intro = isResend
    ? 'A fresh verification code was requested for your account:'
    : 'Please use the following 6-digit verification code to complete your sign-in:';
  const logoAtt = getLogoAttachment();

  dispatchMailAsync(
    {
      from: `"ReNu-Biome Security" <${process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: `Your ReNu-Biome Sign-In Verification Code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
            .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center; }
            .content { padding: 32px 24px; }
            .code-box { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0C6054; background: #F0FDFA; border: 2px dashed #99F6E4; padding: 16px 28px; border-radius: 10px; margin: 20px 0; font-family: monospace; display: inline-block; }
            .note { font-size: 13px; color: #64748B; margin-top: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            ${getEmailHeaderHtml('Two-Factor Authentication', 'Sign-In Security Verification')}
            <div class="content">
              <p style="margin-top: 0; font-size: 15px;">${intro}</p>
              <div class="code-box">${code}</div>
              <p class="note">This code is valid for 10 minutes. Never share this code with anyone.</p>
            </div>
            ${getEmailFooterHtml()}
          </div>
        </body>
        </html>
      `,
      attachments: logoAtt ? [logoAtt] : []
    },
    tag,
    () => {
      console.log(`[MFA Verification Code Generated] ${code} for ${userEmail} (Target: ${targetEmail})`);
    }
  );
}

// Auth Routes (Custom OTP Flow)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const norm = email.toLowerCase().trim();
    (global as any).mockOtp = { email: norm, code, expiresAt: Date.now() + 10 * 60 * 1000 };

    const logoAtt = getLogoAttachment();
    const mailOptions = {
      from: `"ReNu-Biome Security" <${process.env.SMTP_USER || 'support@renu-biome.com'}>`,
      to: email,
      subject: `Your ReNu-Biome Verification Code: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
            .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center; }
            .header { background: #0C6054; padding: 28px 24px 20px; text-align: center; }
            .content { padding: 32px 24px; }
            .code-box { font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0C6054; background: #F0FDFA; border: 2px dashed #99F6E4; padding: 16px 28px; border-radius: 10px; margin: 20px 0; font-family: monospace; display: inline-block; }
            .note { font-size: 13px; color: #64748B; margin-top: 14px; line-height: 1.5; }
            .footer { padding: 14px; background: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; }
          </style>
        </head>
        <body>
          <div class="card">
            ${getEmailHeaderHtml('Portal Verification', 'Security Verification Code')}
            <div class="content">
              <p style="margin-top: 0; font-size: 15px;">Your verification code is:</p>
              <div class="code-box">${code}</div>
              <p class="note">This code will expire in 10 minutes. Never share this code with anyone.</p>
            </div>
            ${getEmailFooterHtml()}
          </div>
        </body>
        </html>
      `,
      attachments: logoAtt ? [logoAtt] : []
    };

    dispatchMailAsync(mailOptions, 'Auth OTP', () => {
      console.log(`[Auth Simulation] OTP generated for: ${email}: ${code}`);
    });
    res.json({ success: true, message: 'OTP sent successfully to your email' });

  } catch (error: any) {
    console.error('Failed to send OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, password, name, harvestStages } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const norm = email.toLowerCase().trim();
    const stored = (global as any).mockOtp;
    if (!stored || stored.email !== norm || stored.code !== String(otp).trim() || (stored.expiresAt && Date.now() > stored.expiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }
    delete (global as any).mockOtp;

    // Create user in persistent store and try MongoDB insert
    const newUser = await createNewUser({
      email,
      password,
      name,
      role: 'Grower',
      approvalStatus: 'PENDING',
      harvestStages: Array.isArray(harvestStages) && harvestStages.length > 0 ? harvestStages : ['Pre Harvest', 'Harvest', 'Post Harvest']
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, approvalStatus: newUser.approvalStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[Auth] Verified OTP & created customer for: ${email}`);
    res.json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        approvalStatus: newUser.approvalStatus,
        avatarUrl: newUser.avatarUrl || '',
        user_metadata: {
          full_name: newUser.name,
          role: newUser.role,
          approvalStatus: newUser.approvalStatus
        }
      }
    });

  } catch (error: any) {
    console.error('Failed to verify OTP:', error);
    res.status(500).json({ error: error.message || 'Failed to verify OTP' });
  }
});

app.post(['/api/auth/login', '/auth/login', '/app/login', '/api/app/login', '/api/login'], async (req, res) => {
  try {
    const { email, password, mfaCode, skipMfa } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let passwordMatch = false;
    if (user.password && user.password === password) {
      passwordMatch = true;
    } else if (user.passwordHash) {
      passwordMatch = await bcrypt.compare(password, user.passwordHash);
    }

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Both Admin and Grower logins strictly require MFA (no bypass)
    const mfaRequired = true;
    if (mfaRequired && !mfaCode) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      (global as any).pendingMfa = (global as any).pendingMfa || {};
      const mfaPayload = {
        code,
        user,
        expiresAt: Date.now() + 10 * 60 * 1000
      };
      (global as any).pendingMfa[user.email.toLowerCase()] = mfaPayload;
      if (email.toLowerCase().trim() !== user.email.toLowerCase()) {
        (global as any).pendingMfa[email.toLowerCase().trim()] = mfaPayload;
      }

      const targetEmail = resolveOtpTargetEmail(user.email);
      dispatchMfaOtpEmail({ userEmail: user.email, targetEmail, code });

      return res.json({
        mfaRequired: true,
        email: user.email,
        targetEmail: targetEmail,
        message: `Security verification code dispatched to ${targetEmail}. Please check your inbox and enter the 6-digit code.`
      });
    }

    if (mfaRequired && mfaCode) {
      const norm = user.email.toLowerCase().trim();
      const reqNorm = email.toLowerCase().trim();
      const pending = (global as any).pendingMfa?.[norm] || (global as any).pendingMfa?.[reqNorm];
      const validCode = pending && pending.code === String(mfaCode).trim() && Date.now() < pending.expiresAt;
      if (!validCode) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }
      delete (global as any).pendingMfa?.[norm];
      delete (global as any).pendingMfa?.[reqNorm];
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, approvalStatus: user.approvalStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        approvalStatus: user.approvalStatus,
        avatarUrl: user.avatarUrl || mockAvatars[user.id] || '',
        mfaEnabled: user.mfaEnabled,
        user_metadata: {
          full_name: user.name,
          role: user.role,
          approvalStatus: user.approvalStatus
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to login:', error);
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
});

// ---------------------------------
// MFA Endpoints
// ---------------------------------
app.post(['/api/auth/verify-mfa', '/auth/verify-mfa', '/app/verify-mfa', '/api/app/verify-mfa', '/api/verify-mfa'], async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const norm = email.toLowerCase().trim();
    let pending = (global as any).pendingMfa?.[norm];
    let targetUser = pending?.user;

    if (!pending) {
      const resolved = await findUserByEmail(norm);
      if (resolved) {
        targetUser = resolved;
        pending = (global as any).pendingMfa?.[resolved.email.toLowerCase()];
      }
    }

    // STRICT VALIDATION: Code must match the real OTP sent and not be expired
    const isValid = Boolean(pending && pending.code === String(code).trim() && Date.now() < pending.expiresAt);

    if (!isValid || !targetUser) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    delete (global as any).pendingMfa?.[norm];
    if (targetUser) {
      delete (global as any).pendingMfa?.[targetUser.email.toLowerCase()];
    }

    const token = jwt.sign(
      { id: targetUser.id, email: targetUser.email, role: targetUser.role, name: targetUser.name, approvalStatus: targetUser.approvalStatus },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        name: targetUser.name,
        approvalStatus: targetUser.approvalStatus,
        avatarUrl: targetUser.avatarUrl || mockAvatars[targetUser.id] || '',
        mfaEnabled: targetUser.mfaEnabled,
        user_metadata: {
          full_name: targetUser.name,
          role: targetUser.role,
          approvalStatus: targetUser.approvalStatus
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'MFA verification failed' });
  }
});

app.post('/api/auth/resend-mfa', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const norm = email.toLowerCase().trim();
    const user = await findUserByEmail(norm);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    (global as any).pendingMfa = (global as any).pendingMfa || {};
    (global as any).pendingMfa[norm] = { code, user, expiresAt };
    (global as any).pendingMfa[user.email.toLowerCase()] = { code, user, expiresAt };

    const targetEmail = resolveOtpTargetEmail(user.email);
    dispatchMfaOtpEmail({ userEmail: user.email, targetEmail, code, isResend: true });

    res.json({ success: true, targetEmail, message: `New verification code dispatched to ${targetEmail}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to resend code' });
  }
});

app.post(['/api/auth/forgot-password', '/api/app/auth/forgot-password'], async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const norm = email.toLowerCase().trim();
    const user = await findUserByEmail(norm);
    console.log(`[Forgot Password] Password reset requested for: ${norm} (User exists: ${Boolean(user)})`);
    return res.json({
      success: true,
      message: 'If an account exists for this email, password reset instructions have been dispatched.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process password reset request' });
  }
});

app.post('/api/auth/toggle-mfa', async (req, res) => {
  try {
    const { email, enabled } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const norm = email.toLowerCase().trim();
    const user = mockUsers.find(u => u.email.toLowerCase() === norm);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.mfaEnabled = Boolean(enabled);
    saveStore();

    res.json({ success: true, mfaEnabled: user.mfaEnabled });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update MFA' });
  }
});

// Proxy routes (to be implemented)
app.use('/api/shopify', (req, res) => {
  res.status(501).json({ error: 'Not Implemented' });
});

// Utilization logs routes
app.post('/api/utilization', async (req, res) => {
  try {
    const { customerId, productName, fieldSite, applicationDate, quantityDosage, acreageCovered } = req.body;
    const log = await prisma.applicationLog.create({
      data: {
        customerId,
        productName,
        fieldSite,
        applicationDate: new Date(applicationDate),
        quantityDosage,
        acreageCovered,
      },
    });
    res.json(log);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create log' });
  }
});

app.get('/api/utilization/:customerId', async (req, res) => {
  try {
    const logs = await prisma.applicationLog.findMany({
      where: { customerId: req.params.customerId },
      orderBy: { applicationDate: 'desc' },
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Weather advisory route
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });
    
    // In production, use axios/fetch to call OpenWeatherMap API
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHERMAP_API_KEY}`);
    // const data = await response.json();
    
    // Mock response for now
    res.json({
      forecast: 'Clear conditions expected this week',
      rainExpected: false,
      advisory: 'Optimal time for application.',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Portal Routes
app.get('/api/portal/entities', async (req, res) => {
  try {
    const entities = await prisma.entity.findMany();
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

app.get('/api/portal/ranches', async (req, res) => {
  try {
    const ranches = await prisma.ranch.findMany({
      include: { blocks: true }
    });
    res.json(ranches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ranches' });
  }
});

// Legacy routes removed to fix TS compilation errors with new schema

import appRoutes from './routes';
app.use(['/app', '/api/app', '/api'], appRoutes);

// Admin & Customer Management Top-Level Routes (direct access)
app.get(['/api/admin/customers', '/api/app/admin/customers', '/app/admin/customers'], async (req, res) => {
  try {
    const customers = await getAllCustomersList();
    res.json(customers);
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.post(['/api/admin/customers', '/api/app/admin/customers'], async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const plainPassword = password || 'Customer123!';
    const newCust = await createNewUser({
      name,
      email,
      password: plainPassword,
      role: role || 'Grower',
      approvalStatus: 'APPROVED'
    });

    // Send credentials (username & password) directly to the user's email
    try {
      await sendNewUserCredentialsEmail(
        { name: newCust.name, email: newCust.email },
        plainPassword,
        newCust.role,
        getBaseFrontendUrl(req)
      );
    } catch (mailErr: any) {
      console.warn('[Admin] Failed to send credentials email:', mailErr.message);
    }

    res.json({
      success: true,
      customer: {
        id: newCust.id,
        email: newCust.email,
        name: newCust.name,
        role: newCust.role,
        approvalStatus: newCust.approvalStatus,
        createdAt: newCust.createdAt,
        user_metadata: {
          full_name: newCust.name,
          role: newCust.role,
          approvalStatus: newCust.approvalStatus
        }
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create customer' });
  }
});

app.put(['/api/admin/customers/:id', '/api/app/admin/customers/:id'], async (req, res) => {
  try {
    const { name, email, role, approvalStatus, password } = req.body;
    const updated = await updateCustomerDetails(req.params.id as string, { name, email, role, approvalStatus, password });
    if (updated) {
      addAuditLog({
        action: 'CUSTOMER_UPDATED',
        details: `Customer details modified for ${(name || updated.name)} (${(email || updated.email)})`,
        actor: 'support@renu-biome.com',
        category: 'USERS'
      });
      res.json({ success: true, customer: updated });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update customer' });
  }
});

app.post(['/api/admin/customers/:id/update', '/api/app/admin/customers/:id/update'], async (req, res) => {
  try {
    const { name, email, role, approvalStatus, password } = req.body;
    const updated = await updateCustomerDetails(req.params.id as string, { name, email, role, approvalStatus, password });
    if (updated) {
      addAuditLog({
        action: 'CUSTOMER_UPDATED',
        details: `Customer details modified for ${(name || updated.name)} (${(email || updated.email)})`,
        actor: 'support@renu-biome.com',
        category: 'USERS'
      });
      res.json({ success: true, customer: updated });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update customer' });
  }
});

app.put(['/api/admin/customers/:id/reset-password', '/api/app/admin/customers/:id/reset-password'], async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'New password is required' });
    }
    const newPlainPassword = password.trim();
    const updated = await updateCustomerDetails(req.params.id as string, { password: newPlainPassword });
    if (updated) {
      addAuditLog({
        action: 'CUSTOMER_PASSWORD_RESET',
        details: `Password reset by admin for customer ${updated.name} (${updated.email})`,
        actor: 'support@renu-biome.com',
        category: 'SECURITY'
      });

      // Send email alert with new password to user
      try {
        await sendPasswordResetCredentialsEmail(
          { name: updated.name, email: updated.email },
          newPlainPassword,
          getBaseFrontendUrl(req)
        );
      } catch (mailErr: any) {
        console.warn('[Admin] Failed to send password reset email:', mailErr.message);
      }

      res.json({ success: true, message: 'Password reset successfully', customer: updated });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to reset customer password' });
  }
});


app.get(['/api/admin/approvals', '/api/app/admin/approvals'], async (req, res) => {
  await syncStoreFromDB();
  const pendingOrders = mockOrdersList.filter(o => o.status === 'Scheduled' || (o.status as any) === 'PENDING');
  const pendingCustomers = mockUsers.filter(u => u.approvalStatus === 'PENDING').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    approvalStatus: u.approvalStatus,
    createdAt: u.createdAt
  }));
  const pendingRanches = mockRanches.filter(r => r.approvalStatus === 'PENDING').map(r => ({ ...r, entity: (r as any).entity || { name: r.name } }));
  const pendingTanks = mockTanks.filter(t => t.approvalStatus === 'PENDING').map(t => ({ ...t, ranch: mockRanches.find(r => r.id === t.ranchId) || { name: 'Demo Ranch' } }));
  res.json({ orders: pendingOrders, customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks });
});

app.post(['/api/admin/approvals/customer/:id'], async (req, res) => {
  try {
    const { status } = req.body;
    const updated = updateCustomerApprovalStatus(req.params.id as string, status);
    if (updated) {
      try {
        await sendCustomerAccountStatusEmail(
          { name: updated.name, email: updated.email },
          status,
          undefined,
          getBaseFrontendUrl(req)
        );
      } catch (mailErr: any) {
        console.warn('[Admin] Failed to send approval alert email:', mailErr.message);
      }
    }
    res.json({ success: true, customer: updated });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update customer approval' });
  }
});

// ---------------------------------
// Orders, Payments & Tracking Endpoints
// ---------------------------------
app.get(['/api/orders', '/api/app/orders', '/api/admin/orders', '/api/app/admin/orders'], async (req, res) => {
  await syncStoreFromDB();
  res.json(mockOrdersList);
});

app.post(['/api/orders', '/api/app/orders'], async (req, res) => {
  try {
    const { items, total, customerEmail, product, qty } = req.body;
    const prodName = product || (items && items[0]?.product) || 'ReNu N-32% K-28% Blend';
    const quantity = qty || (items && items[0]?.qty) || '10 Gal';
    const amount = total || 1000;
    const email = customerEmail || 'customer@renu.com';
    const newOrder = {
      id: `ord-${Date.now()}`,
      orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customerEmail: email,
      product: prodName,
      qty: quantity,
      amt: amount,
      status: 'PENDING' as const,
      date: new Date().toISOString().split('T')[0] || '2026-10-09',
      paymentEmailSent: false,
      trackingStep: 1,
      trackingTimeline: [
        { title: 'Order Placed', desc: 'Received and awaiting admin acceptance', date: new Date().toISOString().replace('T', ' ').substring(0, 16), done: true },
        { title: 'Accepted & Payment Sent', desc: 'Awaiting customer payment', date: 'Pending', done: false },
        { title: 'Payment Confirmed', desc: 'Invoice generated & blending initiated', date: 'Pending', done: false },
        { title: 'Dispatched', desc: 'Tank delivery in transit', date: 'Pending', done: false },
        { title: 'Delivered', desc: 'Injected into ranch tank', date: 'Pending', done: false }
      ]
    };
    mockOrdersList.unshift(newOrder as any);
    saveStore();

    addAuditLog({
      action: 'ORDER_PLACED',
      details: `New order ${newOrder.orderId} for ${prodName} placed by ${email}`,
      actor: email,
      category: 'ORDERS'
    });

    try {
      await sendOrderPlacedAlertEmailToCustomer(newOrder, getBaseFrontendUrl(req));
    } catch (mailErr: any) {
      console.warn('[Orders] Failed to send order placed alert email:', mailErr.message);
    }

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post([
  '/api/admin/orders/:id/accept',
  '/api/app/admin/orders/:id/accept',
  '/api/admin/orders/:id/accept-and-email',
  '/api/app/admin/orders/:id/accept-and-email',
  '/api/orders/:id/accept',
  '/api/app/orders/:id/accept'
], async (req, res) => {
  try {
    const order = adminAcceptOrder(req.params.id as string);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send confirmation request to the customer asynchronously
    sendOrderAcceptedEmailToCustomer(order, req).catch((err: any) => {
      console.warn('[Email Warning] Could not send customer confirmation email:', err.message);
    });

    addAuditLog({
      action: 'ORDER_ACCEPTED',
      details: `Order #${order.orderId} accepted by admin. Confirmation request sent to customer ${order.customerEmail}.`,
      actor: 'admin@renu-biome.com',
      category: 'ORDERS'
    });

    res.json({ success: true, order, message: `Order #${order.orderId} accepted and confirmation request emailed to customer.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept order' });
  }
});

// -----------------------------------------------------------------------
// Public Customer & Dispatch Web Action Endpoints (No Bearer Token required)
// -----------------------------------------------------------------------

// 1. Customer fills delivery details via web link
app.get(['/api/public/orders/:id/confirm', '/confirm-delivery'], async (req, res) => {
  const orderId = (req.params.id || req.query.orderId) as string;
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) {
    return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#B91C1C;">Order not found or link has expired.</h2>');
  }

  const backendUrl = getBaseBackendUrl(req);
  const html = renderCustomerConfirmHtmlPage(order, backendUrl);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 2. Customer submits delivery confirmation
app.post(['/api/public/orders/:id/confirm-delivery', '/api/orders/:id/confirm-delivery'], async (req, res) => {
  try {
    const orderId = req.params.id as string;
    const { deliveryAddress, gateCode, contactOnArrival, contactPhone, deliveryWindow, notes } = req.body;

    const order = customerConfirmDelivery(orderId, {
      deliveryAddress,
      gateCode,
      contactOnArrival,
      contactPhone,
      deliveryWindow,
      notes
    });

    if (!order) {
      return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#B91C1C;">Order not found.</h2>');
    }

    // Send email to eedevnsskjayanth.asa@gmail.com with address, gate code, contact, and Accept / Reschedule options
    sendCustomerConfirmedEmailToDispatch(order, req).catch((err: any) => {
      console.warn('[Email Warning] Could not send dispatch email:', err.message);
    });

    addAuditLog({
      action: 'DELIVERY_CONFIRMED',
      details: `Customer confirmed delivery details for #${order.orderId} (${order.deliveryAddress || 'Ranch'}). Dispatch notified at ${DISPATCH_NOTIFICATION_EMAIL}.`,
      actor: order.customerEmail,
      category: 'ORDERS'
    });

    // If API client JSON request, respond with JSON
    if (req.headers.accept?.includes('application/json') || req.headers['content-type']?.includes('application/json')) {
      return res.json({
        success: true,
        order,
        delivery: order,
        message: `Delivery details confirmed! Dispatch notified at ${DISPATCH_NOTIFICATION_EMAIL}.`
      });
    }

    // Otherwise render confirmation HTML page
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Delivery Confirmed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 40px 20px; text-align: center; }
          .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 32px 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
          .icon { font-size: 50px; margin-bottom: 12px; }
          h1 { color: #0C6054; margin: 0 0 10px 0; font-size: 22px; }
          p { color: #475569; font-size: 14px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>Delivery Details Confirmed!</h1>
          <p>Thank you! Your verified delivery address and access details for <strong>Order #${order.orderId}</strong> (${order.product}) have been committed to the database.</p>
          <p>Our dispatch team has been notified at <strong>${DISPATCH_NOTIFICATION_EMAIL}</strong> to schedule injection.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`<h2 style="color:#B91C1C;text-align:center;margin-top:40px;">Error: ${error.message}</h2>`);
  }
});

// 3. Dispatcher clicks Accept or Reschedule in the email
app.get('/api/public/orders/:id/dispatch-action', async (req, res) => {
  const orderId = req.params.id as string;
  const action = (req.query.action as string) || 'accept';
  const newWindow = req.query.newWindow as string;
  const reason = req.query.reason as string;
  const backendUrl = getBaseBackendUrl(req);

  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) {
    return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#B91C1C;">Order not found.</h2>');
  }

  if (action === 'accept') {
    dispatchProcessDecision(orderId, 'ACCEPTED');
    addAuditLog({
      action: 'DISPATCH_ACCEPTED',
      details: `Delivery slot for Order #${order.orderId} accepted by dispatch staff.`,
      actor: DISPATCH_NOTIFICATION_EMAIL,
      category: 'ORDERS'
    });
    const html = renderDispatchActionHtmlPage(order, 'accept', undefined, false, backendUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  if (action === 'reschedule') {
    if (newWindow) {
      dispatchProcessDecision(orderId, 'RESCHEDULE', { newWindow, reason });
      addAuditLog({
        action: 'DISPATCH_RESCHEDULED',
        details: `Order #${order.orderId} reschedule requested to "${newWindow}". Reason: "${reason || 'None'}"`,
        actor: DISPATCH_NOTIFICATION_EMAIL,
        category: 'ORDERS'
      });
      const html = renderDispatchActionHtmlPage(order, 'reschedule', `Reschedule recorded in database for window: ${newWindow}`, false, backendUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Render interactive reschedule form
    const html = renderDispatchActionHtmlPage(order, 'reschedule', undefined, true, backendUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  res.status(400).send('Invalid dispatch action.');
});

// POST submit for reschedule form
app.post('/api/public/orders/:id/dispatch-action', async (req, res) => {
  const orderId = req.params.id as string;
  const { action, newWindow, reason } = req.body;
  const backendUrl = getBaseBackendUrl(req);

  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) {
    return res.status(404).send('<h2 style="color:#B91C1C;text-align:center;margin-top:40px;">Order not found.</h2>');
  }

  if (action === 'reschedule') {
    dispatchProcessDecision(orderId, 'RESCHEDULE', { newWindow, reason });
    addAuditLog({
      action: 'DISPATCH_RESCHEDULED',
      details: `Order #${order.orderId} reschedule requested to "${newWindow}". Reason: "${reason || 'None'}"`,
      actor: DISPATCH_NOTIFICATION_EMAIL,
      category: 'ORDERS'
    });
    const html = renderDispatchActionHtmlPage(order, 'reschedule', `Reschedule recorded in database for window: ${newWindow}`, false, backendUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  dispatchProcessDecision(orderId, 'ACCEPTED');
  const html = renderDispatchActionHtmlPage(order, 'accept', undefined, false, backendUrl);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.post(['/api/orders/:id/pay', '/api/app/orders/:id/pay'], async (req, res) => {
  try {
    const result = payOrderAndGenerateInvoice(req.params.id as string);
    if (!result) return res.status(404).json({ error: 'Order not found' });

    const { order, invoice } = result;

    // Send invoice delivery email to customer
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"Renu Biome Accounting" <${process.env.SMTP_USER}>`,
          to: order.customerEmail,
          subject: `Payment Confirmed & Invoice #${invoice.invoiceNumber} Attached`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #1E293B;">
              <h2 style="color: #2E5D36;">Payment Confirmed - Thank You!</h2>
              <p>Payment of <strong>$${invoice.amount.toLocaleString()}</strong> has been processed successfully for Order #${order.orderId}.</p>
              <div style="background: #F1F8F5; border: 1px solid #C8E6C9; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p style="margin: 0 0 6px 0;"><strong>Date:</strong> ${invoice.invoiceDate}</p>
                <p style="margin: 0 0 6px 0;"><strong>Item:</strong> ${invoice.product} (${invoice.gallons ? invoice.gallons + ' Gal' : 'Standard'})</p>
                <p style="margin: 0;"><strong>Status:</strong> PAID IN FULL</p>
              </div>
              <p>You can access this invoice in the Renu Biome Invoices section anytime.</p>
            </div>
          `
        });
      } catch (mailErr: any) {
        console.warn('[Mail Warning] Could not send invoice delivery email:', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Payment verified, invoice generated & delivered via email and in-app',
      order,
      invoice
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

app.post(['/api/orders/:id/cancel', '/api/app/orders/:id/cancel', '/api/admin/orders/:id/cancel', '/api/app/admin/orders/:id/cancel'], async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }
    const result = cancelOrderWithRefund(req.params.id as string, reason.trim());
    if (!result) return res.status(404).json({ error: 'Order not found' });

    const { order, refunded, refundAmount } = result;

    // Send cancellation email if configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS && order) {
      try {
        await transporter.sendMail({
          from: `"Renu Biome" <${process.env.SMTP_USER}>`,
          to: order.customerEmail,
          subject: `Order #${order.orderId} Cancelled${refunded ? ' — Refund Initiated' : ''}`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #1E293B;">
              <h2 style="color: #DC2626;">Order #${order.orderId} Cancelled</h2>
              <p>Your order for <strong>${order.product}</strong> (${order.gallons || 0} Gal) has been cancelled by our team.</p>
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 6px 0;"><strong>Cancellation Reason:</strong> ${reason}</p>
                ${refunded ? `<p style="margin: 0; color: #15803D;"><strong>Refund of $${refundAmount.toLocaleString()} has been initiated</strong> and will reflect within 3-5 business days.</p>` : '<p style="margin: 0;">No payment was collected, so no refund is required.</p>'}
              </div>
              <p>If you have questions, please contact your Renu Biome agronomist.</p>
            </div>
          `
        });
      } catch (mailErr: any) {
        console.warn('[Mail Warning] Could not send cancellation email:', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: refunded
        ? `Order cancelled and refund of $${refundAmount.toLocaleString()} initiated`
        : 'Order cancelled. No payment was made so no refund is required.',
      order,
      refunded,
      refundAmount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
});

app.put(['/api/admin/orders/:id/tracking', '/api/app/admin/orders/:id/tracking'], async (req, res) => {
  try {
    const { status, step } = req.body;
    const order = updateOrderTracking(req.params.id as string, status, Number(step));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    try {
      await sendDeliveryStatusEmailToCustomer(order, status || 'Updated', order.estimatedArrival, req);
    } catch (mailErr: any) {
      console.warn('[Tracking] Failed to send status update email:', mailErr.message);
    }

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update tracking' });
  }
});

// ---------------------------------
// Invoices Endpoints
// ---------------------------------
app.get(['/api/invoices', '/api/app/invoices', '/api/admin/invoices', '/api/app/admin/invoices'], async (req, res) => {
  res.json(mockInvoices);
});

// ---------------------------------
// Employee Tasks Endpoints (3 Statuses: PENDING, IN_PROGRESS, COMPLETED)
// ---------------------------------
app.get(['/api/tasks', '/api/app/tasks'], async (req, res) => {
  await syncStoreFromDB();
  res.json(mockTasks);
});

app.post(['/api/admin/tasks', '/api/app/admin/tasks'], async (req, res) => {
  try {
    const task = createEmployeeTask(req.body);
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

app.put(['/api/tasks/:id/status', '/api/app/tasks/:id/status'], async (req, res) => {
  try {
    const { status, empEmail } = req.body;
    const task = updateTaskStatus(req.params.id as string, status, empEmail);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update task status' });
  }
});

// ---------------------------------
// Lab Results Endpoints
// ---------------------------------
app.get(['/api/lab-results', '/api/app/lab-results'], async (req, res) => {
  await syncStoreFromDB();
  res.json(mockLabResults);
});

app.post(['/api/lab-results', '/api/app/lab-results'], async (req, res) => {
  try {
    const lab = addLabResult(req.body);
    res.json({ success: true, labResult: lab });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit lab result' });
  }
});

// ---------------------------------
// Ranch Operations & Grower Assignment
// ---------------------------------
app.post(['/api/admin/assign-grower', '/api/app/admin/assign-grower'], async (req, res) => {
  try {
    const { customerId, employeeEmail } = req.body;
    const customer = assignGrowerToEmployee(customerId, employeeEmail);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to assign grower' });
  }
});

app.put(['/api/ranches/:id/visibility', '/api/app/ranches/:id/visibility'], async (req, res) => {
  try {
    const { hidden } = req.body;
    const ranch = toggleRanchHidden(req.params.id as string, Boolean(hidden));
    if (!ranch) return res.status(404).json({ error: 'Ranch not found' });
    res.json({ success: true, ranch });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update ranch visibility' });
  }
});

// ---------------------------------
// Admin Notifications Endpoints
// ---------------------------------
app.get(['/api/admin/notifications', '/api/app/admin/notifications'], async (req, res) => {
  res.json(mockNotifications);
});

app.post(['/api/admin/notifications/mark-read', '/api/app/admin/notifications/mark-read'], async (req, res) => {
  mockNotifications.forEach(n => { n.read = true; });
  res.json({ success: true, message: 'All notifications marked as read' });
});

// ---------------------------------
// Universal Export & Import Endpoints
// ---------------------------------
app.get(['/api/export/:entity', '/api/app/export/:entity'], async (req, res) => {
  const { entity } = req.params;
  let data: any[] = [];
  switch (entity) {
    case 'orders': data = mockOrdersList; break;
    case 'customers': data = await getAllCustomersList(); break;
    case 'ranches': data = mockRanches; break;
    case 'invoices': data = mockInvoices; break;
    case 'tasks': data = mockTasks; break;
    case 'lab-results': data = mockLabResults; break;
    case 'products': data = mockProducts; break;
    default: return res.status(400).json({ error: `Unknown entity: ${entity}` });
  }
  res.json({ entity, count: data.length, data });
});

app.post(['/api/import/:entity', '/api/app/import/:entity'], async (req, res) => {
  const { entity } = req.params;
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });

  let count = 0;
  switch (entity) {
    case 'orders':
      items.forEach(item => { mockOrdersList.unshift(item); count++; });
      break;
    case 'ranches':
      items.forEach(item => { mockRanches.unshift(item); count++; });
      break;
    case 'tasks':
      items.forEach(item => { mockTasks.unshift(item); count++; });
      break;
    case 'lab-results':
      items.forEach(item => { mockLabResults.unshift(item); count++; });
      break;
    default:
      return res.status(400).json({ error: `Import not supported for entity: ${entity}` });
  }

  addAuditLog({
    action: `DATA_IMPORTED_${entity.toUpperCase()}`,
    details: `Imported ${count} records for entity: ${entity}`,
    actor: 'support@renu-biome.com',
    category: 'SYSTEM'
  });

  res.json({ success: true, entity, importedCount: count });
});

app.get(['/api/admin/settings', '/api/app/admin/settings'], async (req, res) => {
  res.json(mockPlatformSettings);
});

app.post(['/api/admin/settings', '/api/app/admin/settings'], async (req, res) => {
  try {
    Object.assign(mockPlatformSettings, req.body);
    addAuditLog({
      action: 'SETTINGS_UPDATED',
      details: `Global platform settings modified (Maintenance: ${mockPlatformSettings.maintenanceMode ? 'ON' : 'OFF'}, 2FA: ${mockPlatformSettings.require2FAForAdmin ? 'ON' : 'OFF'})`,
      actor: 'support@renu-biome.com',
      category: 'SYSTEM'
    });
    res.json({ success: true, settings: mockPlatformSettings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
});

app.get(['/api/admin/audit-logs', '/api/app/admin/audit-logs'], async (req, res) => {
  res.json(mockAuditLogs);
});

app.post(['/api/admin/reset-cache', '/api/app/admin/reset-cache'], async (req, res) => {
  addAuditLog({
    action: 'CACHE_PURGED',
    details: 'System memory cache cleared and re-synced',
    actor: 'support@renu-biome.com',
    category: 'SYSTEM'
  });
  res.json({ success: true, message: 'System cache cleared and synchronized' });
});

app.get(['/api/admin/products', '/api/app/admin/products', '/api/products', '/api/app/products'], async (req, res) => {
  await syncStoreFromDB();
  try {
    const dbProds = await prisma.product.findMany();
    if (dbProds && dbProds.length > 0) {
      const combined = [...mockProducts];
      for (const p of dbProds) {
        if (!combined.some(item => item.id === p.id)) combined.push(p as any);
      }
      return res.json(combined);
    }
  } catch (e) {}
  res.json(mockProducts);
});

app.post(['/api/admin/products', '/api/app/admin/products'], async (req, res) => {
  try {
    const { name, description, price, imageUrl } = req.body;
    const newProd = {
      id: `prod-${Date.now()}`,
      name,
      description: description || '',
      price: parseFloat(price) || 0,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };
    mockProducts.unshift(newProd);
    saveStore();

    try {
      await prisma.product.create({
        data: { name, description, price: parseFloat(price) || 0, imageUrl }
      });
    } catch (dbErr) {
      console.warn('[DB Warning] Product create fallback to mock:', (dbErr as any).message);
    }

    addAuditLog({
      action: 'PRODUCT_CREATED',
      details: `New product added: ${name} ($${price})`,
      actor: 'support@renu-biome.com',
      category: 'SYSTEM'
    });

    res.json(newProd);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.delete(['/api/admin/products/:id', '/api/app/admin/products/:id'], async (req, res) => {
  const idx = mockProducts.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    mockProducts.splice(idx, 1);
    saveStore();
  }
  try {
    await prisma.product.delete({ where: { id: req.params.id as string } });
  } catch (e) {}
  res.json({ success: true, message: 'Product deleted' });
});

app.put(['/api/admin/products/:id', '/api/app/admin/products/:id'], async (req, res) => {
  try {
    const { price, name, description, imageUrl } = req.body;
    const id = req.params.id as string;
    const idx = mockProducts.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldPrice = mockProducts[idx].price;
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: 'Valid positive price is required' });
      }
      mockProducts[idx].price = parsedPrice;
    }
    if (name !== undefined && name.trim()) mockProducts[idx].name = name.trim();
    if (description !== undefined) mockProducts[idx].description = description.trim();
    if (imageUrl !== undefined) mockProducts[idx].imageUrl = imageUrl;

    saveStore();

    try {
      await prisma.product.update({
        where: { id },
        data: {
          price: mockProducts[idx].price,
          name: mockProducts[idx].name,
          description: mockProducts[idx].description,
          imageUrl: mockProducts[idx].imageUrl
        }
      });
    } catch (e) {}

    addAuditLog({
      action: 'PRODUCT_PRICE_UPDATED',
      details: `Product "${mockProducts[idx].name}" price updated from $${oldPrice} to $${mockProducts[idx].price}`,
      actor: 'support@renu-biome.com',
      category: 'SYSTEM'
    });

    res.json({ success: true, product: mockProducts[idx] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product price' });
  }
});



// Serve built frontend assets and provide SPA fallback when running on Render
const possibleDistPaths = [
  path.resolve(__dirname, '..', '..', 'mobile', 'dist'),
  path.resolve(__dirname, '..', 'mobile', 'dist'),
  path.resolve(process.cwd(), 'mobile', 'dist'),
  path.resolve(process.cwd(), 'dist'),
];

for (const distPath of possibleDistPaths) {
  if (fs.existsSync(distPath)) {
    console.log(`[Static Web] Serving frontend assets from: ${distPath}`);
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('.json')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/order-confirm') ||
        req.path.startsWith('/dispatch-action') ||
        req.path.startsWith('/health')
      ) {
        return next();
      }
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(indexHtml);
      }
      next();
    });
    break;
  }
}

// Only listen if not running on Vercel Serverless or Jest unit tests
if (process.env.VERCEL !== '1' && !process.env.JEST_WORKER_ID) {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`Backend server running on port ${PORT}`);
    await syncStoreFromDB();
    saveStore();

    // Initialize Otodata tank telemetry (every 30 mins)
    syncAllTanksTelemetry().catch(err => console.warn('[Otodata Init] Sync failed:', err.message));
    setInterval(() => {
      syncAllTanksTelemetry().catch(err => console.warn('[Otodata Interval] Sync failed:', err.message));
    }, 30 * 60 * 1000);

    // Initialize OptimoRoute delivery sync (every 5 mins)
    syncOpenDeliveriesWithOptimoRoute().catch(err => console.warn('[OptimoRoute Init] Sync failed:', err.message));
    setInterval(() => {
      syncOpenDeliveriesWithOptimoRoute().catch(err => console.warn('[OptimoRoute Interval] Sync failed:', err.message));
    }, 5 * 60 * 1000);
  });
}

export default app;
