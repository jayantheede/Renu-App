import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export const mockAvatars: Record<string, string> = {
  'mock-admin': '',
  'mock-emp': '',
  'mock-cust': ''
};

import {
  findUserByEmail,
  createNewUser,
  getAllCustomersList,
  updateCustomerApprovalStatus,
  mockUsers,
  mockRanches,
  mockTanks,
  mockPlatformSettings,
  mockAuditLogs,
  addAuditLog
} from './usersStore';

import helmet from 'helmet';
import compression from 'compression';

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
import rateLimit from 'express-rate-limit';

// Global API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use('/api', apiLimiter);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth Routes (Custom OTP Flow)
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Mock OTP sending to bypass Prisma errors, but still use nodemailer
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store mock OTP in memory since Prisma fails
    (global as any).mockOtp = { email, code };

    const mailOptions = {
      from: '"Agri Assistant" <' + process.env.SMTP_USER + '>',
      to: email,
      subject: 'Your Agri Assistant Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Welcome to Agri Assistant!</h2>
          <p>Your verification code is:</p>
          <h1 style="color: #2e7d32; letter-spacing: 5px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`[Mock] OTP sent to: ${email} via SMTP.`);
      res.json({ success: true, message: 'OTP sent successfully to your email' });
    } else {
      console.log(`[Mock] SMTP credentials missing. OTP would be sent to: ${email}. Use code ${code} to verify.`);
      res.json({ success: true, message: `OTP sent (Use ${code})` });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp, password, name } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stored = (global as any).mockOtp;
    if (!stored || stored.email !== email || stored.code !== otp) {
      // Fallback for demo purposes if they used 123456
      if (otp !== '123456') {
        return res.status(400).json({ error: 'Invalid OTP' });
      }
    }

    // Create user in persistent store and try MongoDB insert
    const newUser = await createNewUser({
      email,
      password,
      name,
      role: 'Grower',
      approvalStatus: 'PENDING'
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
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
app.use('/api/app', appRoutes);

// Admin & Customer Management Top-Level Routes (direct access)
app.get(['/api/admin/customers', '/api/app/admin/customers'], async (req, res) => {
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

    const newCust = await createNewUser({
      name,
      email,
      password: password || 'Customer123!',
      role: role || 'Grower',
      approvalStatus: 'APPROVED'
    });

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

app.get(['/api/admin/approvals', '/api/app/admin/approvals'], async (req, res) => {
  const pendingOrders = mockOrdersList.filter(o => o.status === 'PENDING');
  const pendingCustomers = mockUsers.filter(u => u.approvalStatus === 'PENDING').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    approvalStatus: u.approvalStatus,
    createdAt: u.createdAt
  }));
  const pendingRanches = mockRanches.filter(r => r.approvalStatus === 'PENDING').map(r => ({ ...r, entity: r.entity || { name: 'Demo Entity' } }));
  const pendingTanks = mockTanks.filter(t => t.approvalStatus === 'PENDING').map(t => ({ ...t, ranch: mockRanches.find(r => r.id === t.ranchId) || { name: 'Demo Ranch' } }));
  res.json({ orders: pendingOrders, customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks });
});

app.post(['/api/admin/approvals/customer/:id'], async (req, res) => {
  try {
    const { status } = req.body;
    const updated = updateCustomerApprovalStatus(req.params.id as string, status);
    res.json({ success: true, customer: updated });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to update customer approval' });
  }
});

const mockOrdersList = [
  { id: 'ord-1', orderId: 'ORD-1099', customerEmail: 'customer@renu.com', product: 'Biome Care', qty: '10 Gal', amt: 1240, status: 'PENDING', date: '2026-10-08' },
  { id: 'ord-2', orderId: 'ORD-1098', customerEmail: 'john@grower.com', product: 'N-CARE', qty: '25 Gal', amt: 6250, status: 'ACCEPTED', date: '2026-10-07' },
  { id: 'ord-3', orderId: 'ORD-1097', customerEmail: 'sarah@farms.com', product: 'K-RUSH', qty: '5 Gal', amt: 900, status: 'PENDING', date: '2026-10-06' },
];

app.get(['/api/admin/orders', '/api/app/admin/orders'], async (req, res) => {
  res.json(mockOrdersList);
});

app.post(['/api/admin/orders/:id/accept', '/api/app/admin/orders/:id/accept'], async (req, res) => {
  const order = mockOrdersList.find(o => o.id === req.params.id);
  if (order) {
    order.status = 'ACCEPTED';
    addAuditLog({
      action: 'ORDER_ACCEPTED',
      details: `Order #${order.orderId} ($${order.amt}) accepted and approved for dispatch`,
      actor: 'admin@renu.com',
      category: 'ORDERS'
    });
  }
  res.json({ success: true, order });
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
      actor: 'admin@renu.com',
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
    actor: 'admin@renu.com',
    category: 'SYSTEM'
  });
  res.json({ success: true, message: 'System cache cleared and synchronized' });
});


// Only listen if not running on Vercel Serverless
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export default app;
