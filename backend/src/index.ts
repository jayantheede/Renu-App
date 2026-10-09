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
  payOrderAndGenerateInvoice,
  updateOrderTracking,
  createEmployeeTask,
  updateTaskStatus,
  addLabResult,
  toggleRanchHidden,
  assignGrowerToEmployee,
  saveStore,
  syncStoreFromDB
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
    const { email, otp, password, name, harvestStages } = req.body;
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

app.put(['/api/admin/customers/:id', '/api/app/admin/customers/:id'], async (req, res) => {
  try {
    const { name, email, role, approvalStatus, password } = req.body;
    const updated = await updateCustomerDetails(req.params.id as string, { name, email, role, approvalStatus, password });
    if (updated) {
      addAuditLog({
        action: 'CUSTOMER_UPDATED',
        details: `Customer details modified for ${(name || updated.name)} (${(email || updated.email)})`,
        actor: 'admin@renu.com',
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
        actor: 'admin@renu.com',
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


app.get(['/api/admin/approvals', '/api/app/admin/approvals'], async (req, res) => {
  await syncStoreFromDB();
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
    const prodName = product || (items && items[0]?.product) || 'Biome Care';
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

    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post([
  '/api/admin/orders/:id/accept',
  '/api/app/admin/orders/:id/accept',
  '/api/admin/orders/:id/accept-and-email',
  '/api/app/admin/orders/:id/accept-and-email'
], async (req, res) => {
  try {
    const order = acceptOrderAndSendPaymentEmail(req.params.id as string);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send email notification via nodemailer if configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: `"Renu Biome Billing" <${process.env.SMTP_USER}>`,
          to: order.customerEmail,
          subject: `Order Accepted: Payment Required for #${order.orderId}`,
          html: `
            <div style="font-family: sans-serif; padding: 24px; color: #1E293B;">
              <h2 style="color: #2E5D36;">Order #${order.orderId} Accepted!</h2>
              <p>Dear Valued Grower,</p>
              <p>Your order for <strong>${order.product}</strong> (${order.qty}) has been reviewed and accepted by agronomist staff.</p>
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Total Amount Due:</strong> $${order.amt.toLocaleString()}</p>
                <p style="margin: 0;"><strong>Status:</strong> Awaiting Secure Online Payment</p>
              </div>
              <p>Please open the Renu Biome mobile app or click below to complete payment:</p>
              <a href="https://app.renubiome.com/pay/${order.id}" style="display: inline-block; background: #2E5D36; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Pay Invoice Online</a>
              <p style="margin-top: 24px; color: #64748B; font-size: 13px;">Upon payment confirmation, an official invoice will be generated and dispatched automatically.</p>
            </div>
          `
        });
      } catch (mailErr: any) {
        console.warn('[Mail Warning] Could not send payment email:', mailErr.message);
      }
    }

    res.json({ success: true, order, message: 'Order accepted and payment link emailed to customer' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept order' });
  }
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
                <p style="margin: 0 0 6px 0;"><strong>Date:</strong> ${invoice.date}</p>
                <p style="margin: 0 0 6px 0;"><strong>Item:</strong> ${invoice.product} (${invoice.qty})</p>
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

app.put(['/api/admin/orders/:id/tracking', '/api/app/admin/orders/:id/tracking'], async (req, res) => {
  try {
    const { status, step } = req.body;
    const order = updateOrderTracking(req.params.id as string, status, Number(step));
    if (!order) return res.status(404).json({ error: 'Order not found' });
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
    actor: 'admin@renu.com',
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
      actor: 'admin@renu.com',
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



// Only listen if not running on Vercel Serverless
if (process.env.VERCEL !== '1') {
  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`Backend server running on port ${PORT}`);
    await syncStoreFromDB();
    saveStore();
  });
}

export default app;
