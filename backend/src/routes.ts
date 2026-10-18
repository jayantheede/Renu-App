import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth';
import {
  mockRanches,
  mockTanks,
  mockUsers,
  mockOrdersList,
  mockInvoices,
  mockProducts,
  mockFeatureFlags,
  mockAuditLogs,
  addAuditLog,
  addAdminNotification,
  saveStore,
  syncStoreFromDB,
  updateUserProfile,
  computeRanchAcreage,
  getRanchesForCustomer,
  createRanch,
  addBlockToRanch,
  updateBlock,
  deleteBlock,
  addTankToRanch,
  updateTank,
  deleteTank,
  createDeliveryOrder,
  updateDeliveryStatus,
  getInvoicesList,
  createHandEnteredInvoice,
  markInvoicePaid,
  voidInvoice,
  getCustomerYearEndSummary,
  getFeatureFlagsForCustomer,
  updateGlobalFeatureFlags,
  updateCustomerFeatureFlagOverride,
  getAllCustomersList,
  updateCustomerDetails,
  ProductItem
} from './usersStore';
import { mockAvatars, transporter } from './index';

const router = Router();

router.use(requireAuth);

// ---------------------------------
// Profile & User Settings
// ---------------------------------
router.get('/profile', async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const found = mockUsers.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  const userObj: any = found || user;
  res.json({
    message: 'Profile details',
    user: {
      ...userObj,
      avatarUrl: userObj.avatarUrl || mockAvatars[user.id] || '',
      user_metadata: {
        full_name: userObj.name,
        role: userObj.role,
        approvalStatus: userObj.approvalStatus
      }
    }
  });
});

router.put('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl, phone, password } = req.body;
    const userEmail = req.user!.email;
    const userId = req.user!.id;

    const updated = updateUserProfile(userEmail || userId, { name, avatarUrl, phone });
    if (password && updated) {
      await updateCustomerDetails(updated.id, { password });
    }

    if (avatarUrl && userId) {
      mockAvatars[userId] = avatarUrl;
    }

    addAuditLog({
      action: 'PROFILE_UPDATED',
      details: `Profile updated for ${userEmail}: name="${name || updated?.name}"`,
      actor: userEmail,
      category: 'USERS'
    });

    res.json({
      id: updated?.id || userId,
      email: userEmail,
      role: req.user!.role,
      name: updated?.name || name || req.user!.name,
      avatarUrl: updated?.avatarUrl || avatarUrl || '',
      approvalStatus: (req.user as any)?.approvalStatus || 'APPROVED',
      phone: updated?.phone || phone,
      user_metadata: {
        full_name: updated?.name || name || req.user!.name,
        role: req.user!.role,
        approvalStatus: (req.user as any)?.approvalStatus || 'APPROVED'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// ---------------------------------
// Dashboard Routes
// ---------------------------------
router.get('/grower/dashboard', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const user = req.user!;
  const ranches = getRanchesForCustomer(user.email, user.role);
  const totalAcres = ranches.reduce((s, r) => s + (r.ac || 0), 0);
  const userDeliveries = mockOrdersList.filter(
    d => d.customerId === user.id || d.customerEmail?.toLowerCase() === user.email.toLowerCase()
  );
  const userInvoices = mockInvoices.filter(
    i => i.customerId === user.id || i.customerEmail?.toLowerCase() === user.email.toLowerCase()
  );

  res.json({
    role: user.role,
    metrics: {
      assignedRanches: ranches.length,
      totalAcres,
      upcomingDeliveries: userDeliveries.filter(d => d.status === 'Scheduled' || d.status === 'Out for delivery').length,
      openInvoices: userInvoices.filter(i => i.status === 'Open' || i.status === 'Overdue').length,
      unreadMessages: 0,
      activeRecommendations: 0
    }
  });
});

router.get('/admin/dashboard', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let deliveriesDueSoon = mockOrdersList.filter(
    d => (d.status === 'Scheduled' || d.status === 'Out for delivery') &&
         (d.date === today || d.date === tomorrow || (d.deliveryWindow && (d.deliveryWindow.includes(today) || d.deliveryWindow.includes(tomorrow))))
  );
  if (deliveriesDueSoon.length === 0) {
    deliveriesDueSoon = mockOrdersList.filter(d => d.status === 'Scheduled' || d.status === 'Out for delivery').slice(0, 4);
  }

  const deliveriesThisWeek = mockOrdersList.filter(d => d.status === 'Scheduled' || d.status === 'Out for delivery');

  const invoices = getInvoicesList(undefined, 'admin');
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  const totalPaidRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const openInvoices = invoices.filter(i => i.status === 'Open');
  const openTotal = openInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  res.json({
    deliveriesDueSoon,
    deliveriesThisWeekCount: deliveriesThisWeek.length,
    overdueInvoices,
    overdueTotal,
    totalPaidRevenue,
    openTotal,
    metrics: {
      totalRevenue: totalPaidRevenue,
      openInvoicesTotal: openTotal,
      overdueTotal,
      activeDeliveries: deliveriesThisWeek.length
    }
  });
});

// ---------------------------------
// Ranches, Blocks & Tanks Routes
// ---------------------------------
router.get('/ranches', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const user = req.user!;
  const ranches = getRanchesForCustomer(user.email, user.role);
  res.json(ranches);
});

router.post('/ranches', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, county, location, customerId, customerEmail } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Ranch name is required' });
    }
    const finalCounty = (county || location || 'Fresno County').trim();
    const user = req.user!;
    const targetCustId = (user.role === 'admin' && customerId) ? customerId : (customerId || user.id);
    const targetCustEmail = (user.role === 'admin' && customerEmail) ? customerEmail : (customerEmail || user.email);

    const ranch = createRanch({
      name: name.trim(),
      county: finalCounty,
      customerId: targetCustId,
      customerEmail: targetCustEmail
    });

    addAuditLog({
      action: 'RANCH_CREATED',
      details: `Ranch "${name.trim()}" created in ${finalCounty}`,
      actor: user.email,
      category: 'RANCHES'
    });

    res.json(ranch);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create ranch' });
  }
});

router.put('/ranches/:id', async (req: AuthenticatedRequest, res) => {
  const ranch = mockRanches.find(r => r.id === req.params.id);
  if (!ranch) return res.status(404).json({ error: 'Ranch not found' });

  if (req.body.name) ranch.name = req.body.name.trim();
  if (req.body.county) ranch.county = req.body.county.trim();
  saveStore();
  res.json(ranch);
});

router.delete('/ranches/:id', async (req: AuthenticatedRequest, res) => {
  const idx = mockRanches.findIndex(r => r.id === req.params.id);
  if (idx >= 0) {
    mockRanches.splice(idx, 1);
    saveStore();
    return res.json({ success: true, message: 'Ranch deleted' });
  }
  res.status(404).json({ error: 'Ranch not found' });
});

// Blocks
router.post('/ranches/:ranchId/blocks', async (req: AuthenticatedRequest, res) => {
  try {
    const block = addBlockToRanch(req.params.ranchId as string, req.body);
    if (!block) return res.status(404).json({ error: 'Ranch not found' });
    res.json({ success: true, block });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to add block' });
  }
});

router.put('/blocks/:id', async (req: AuthenticatedRequest, res) => {
  const updated = updateBlock(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Block not found' });
  res.json({ success: true, block: updated });
});

router.delete('/blocks/:id', async (req: AuthenticatedRequest, res) => {
  const ok = deleteBlock(req.params.id as string);
  if (ok) return res.json({ success: true, message: 'Block deleted' });
  res.status(404).json({ error: 'Block not found' });
});

// Tanks
router.post('/ranches/:ranchId/tanks', async (req: AuthenticatedRequest, res) => {
  try {
    const tank = addTankToRanch(req.params.ranchId as string, req.body);
    if (!tank) return res.status(404).json({ error: 'Ranch not found' });
    res.json({ success: true, tank });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to add tank' });
  }
});

router.post('/tank-setups', async (req: AuthenticatedRequest, res) => {
  try {
    const { ranchId, capacity, location, name } = req.body;
    const tank = addTankToRanch(ranchId, { capacity, location, name });
    if (!tank) return res.status(404).json({ error: 'Ranch not found' });
    res.json(tank);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to add tank' });
  }
});

router.put('/tanks/:id', async (req: AuthenticatedRequest, res) => {
  const updated = updateTank(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Tank not found' });
  res.json({ success: true, tank: updated });
});

router.delete('/tanks/:id', async (req: AuthenticatedRequest, res) => {
  const ok = deleteTank(req.params.id as string);
  if (ok) return res.json({ success: true, message: 'Tank deleted' });
  res.status(404).json({ error: 'Tank not found' });
});

// ---------------------------------
// Deliveries (Orders) Routes
// ---------------------------------
router.get(['/deliveries', '/orders'], async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const user = req.user!;
  if (user.role === 'admin') {
    return res.json(mockOrdersList);
  }
  const norm = user.email.toLowerCase().trim();
  const userDeliveries = mockOrdersList.filter(
    d => (d.customerId && d.customerId.toLowerCase() === norm) ||
         (d.customerEmail && d.customerEmail.toLowerCase() === norm)
  );
  res.json(userDeliveries);
});

router.post(['/deliveries', '/orders'], async (req: AuthenticatedRequest, res) => {
  try {
    const {
      customerId,
      customerEmail,
      product,
      gallons,
      ranchId,
      tankId,
      blockIds,
      deliveryWindow,
      gateCode,
      contactOnArrival,
      notes
    } = req.body;

    const targetEmail = customerEmail || req.user?.email || 'customer@renu.com';
    const targetCustId = customerId || req.user?.id || 'mock-cust-1';

    const delivery = createDeliveryOrder({
      customerId: targetCustId,
      customerEmail: targetEmail,
      product: product || 'Biome Care',
      gallons: Number(gallons) || 500,
      ranchId: ranchId || 'ranch-1',
      tankId: tankId || 'tank-1-1',
      blockIds: Array.isArray(blockIds) ? blockIds : [],
      deliveryWindow: deliveryWindow || 'Scheduled date window',
      gateCode,
      contactOnArrival,
      notes
    });

    // Send email notification to customer on Scheduled
    if (transporter && targetEmail) {
      try {
        await transporter.sendMail({
          from: `"ReNu-Biome Deliveries" <${process.env.SMTP_USER || 'deliveries@renubiome.com'}>`,
          to: targetEmail,
          subject: `Delivery Scheduled: Order #${delivery.orderId} (${delivery.product})`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
              <h2 style="color: #2E5D36;">ReNu-Biome Delivery Scheduled</h2>
              <p>Your delivery has been scheduled with the following details:</p>
              <ul>
                <li><strong>Order #:</strong> ${delivery.orderId}</li>
                <li><strong>Product:</strong> ${delivery.product}</li>
                <li><strong>Gallons:</strong> ${delivery.gallons.toLocaleString()} Gal</li>
                <li><strong>Delivery Window:</strong> ${delivery.deliveryWindow}</li>
                <li><strong>Status:</strong> Scheduled</li>
              </ul>
              <p>You can track delivery status anytime in the ReNu-Biome portal.</p>
            </div>
          `
        });
      } catch (err: any) {
        console.warn('[Email Warning] Could not send scheduled delivery email:', err.message);
      }
    }

    addAuditLog({
      action: 'DELIVERY_CREATED',
      details: `Order #${delivery.orderId} created for ${targetEmail} (${delivery.gallons} Gal ${delivery.product})`,
      actor: req.user?.email || 'admin@renu.com',
      category: 'ORDERS'
    });

    res.json({ success: true, order: delivery, delivery });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create delivery' });
  }
});

router.put(['/deliveries/:id/status', '/orders/:id/status'], async (req: AuthenticatedRequest, res) => {
  try {
    const { status, deliveredGallons, deliveredDate, cancelReason } = req.body;
    const delivery = updateDeliveryStatus(req.params.id as string, status, {
      deliveredGallons,
      deliveredDate,
      cancelReason
    });

    if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

    // Email notification on status changes
    if (transporter && delivery.customerEmail) {
      try {
        let subject = `Delivery Update: Order #${delivery.orderId} is ${status}`;
        let msg = `<p>Your delivery status has changed to <strong>${status}</strong>.</p>`;

        if (status === 'Out for delivery') {
          subject = `Out for Delivery: Order #${delivery.orderId} (${delivery.product})`;
          msg = `<p>Our dispatch truck is en route with <strong>${delivery.gallons} Gal</strong> of <strong>${delivery.product}</strong> for injection.</p>`;
        } else if (status === 'Delivered') {
          subject = `Delivery Completed: Order #${delivery.orderId} (${delivery.product})`;
          msg = `<p>Successfully injected <strong>${delivery.deliveredGallons || delivery.gallons} Gal</strong> of <strong>${delivery.product}</strong> on ${delivery.deliveredDate || 'today'}.</p>`;
        }

        await transporter.sendMail({
          from: `"ReNu-Biome Deliveries" <${process.env.SMTP_USER || 'deliveries@renubiome.com'}>`,
          to: delivery.customerEmail,
          subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
              <h2 style="color: #2E5D36;">ReNu-Biome Delivery Update</h2>
              ${msg}
              <ul>
                <li><strong>Order #:</strong> ${delivery.orderId}</li>
                <li><strong>Product:</strong> ${delivery.product}</li>
                <li><strong>Delivered Quantity:</strong> ${(delivery.deliveredGallons || delivery.gallons).toLocaleString()} Gal</li>
                <li><strong>Status:</strong> ${status}</li>
              </ul>
            </div>
          `
        });

        // If delivered, notify other admin as required:
        if (status === 'Delivered') {
          addAdminNotification({
            title: 'Delivery Marked Delivered',
            message: `Delivery #${delivery.orderId} (${delivery.product}, ${delivery.deliveredGallons || delivery.gallons} Gal) marked delivered for ${delivery.customerEmail}.`,
            type: 'DELIVERY'
          });
        }
      } catch (err: any) {
        console.warn('[Email Warning] Status update email failed:', err.message);
      }
    }

    res.json({ success: true, delivery, order: delivery });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update delivery status' });
  }
});

router.put(['/deliveries/:id', '/orders/:id'], async (req: AuthenticatedRequest, res) => {
  const delivery = mockOrdersList.find(d => d.id === req.params.id || d.orderId === req.params.id);
  if (!delivery) return res.status(404).json({ error: 'Delivery not found' });

  if (req.body.deliveryWindow) delivery.deliveryWindow = req.body.deliveryWindow;
  if (req.body.gateCode !== undefined) delivery.gateCode = req.body.gateCode;
  if (req.body.contactOnArrival !== undefined) delivery.contactOnArrival = req.body.contactOnArrival;
  if (req.body.notes !== undefined) delivery.notes = req.body.notes;
  if (req.body.gallons !== undefined) delivery.gallons = Number(req.body.gallons) || delivery.gallons;
  if (req.body.deliveredGallons !== undefined) delivery.deliveredGallons = Number(req.body.deliveredGallons);
  if (req.body.deliveredDate !== undefined) delivery.deliveredDate = req.body.deliveredDate;

  saveStore();
  res.json({ success: true, delivery, order: delivery });
});

// ---------------------------------
// Invoices Routes (Hand-entered from QuickBooks)
// ---------------------------------
router.get('/invoices', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const user = req.user!;
  const invoices = getInvoicesList(user.email, user.role);
  res.json(invoices);
});

router.post('/invoices', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      invoiceNumber,
      customerId,
      customerEmail,
      deliveryId,
      invoiceDate,
      dueDate,
      amount,
      pdfData,
      pdfFileName,
      quickbooksInvoiceId
    } = req.body;

    if (!invoiceNumber || !amount || !dueDate) {
      return res.status(400).json({ error: 'Invoice number, amount, and due date are required' });
    }

    const invoice = createHandEnteredInvoice({
      invoiceNumber,
      customerId: customerId || 'mock-cust-1',
      customerEmail: customerEmail || 'customer@renu.com',
      deliveryId,
      invoiceDate,
      dueDate,
      amount: Number(amount) || 0,
      pdfData,
      pdfFileName,
      quickbooksInvoiceId
    });

    addAuditLog({
      action: 'INVOICE_ENTERED',
      details: `Invoice #${invoice.invoiceNumber} entered from QuickBooks ($${invoice.amount}) for ${invoice.customerEmail}`,
      actor: req.user?.email || 'admin@renu.com',
      category: 'SYSTEM'
    });

    res.json({ success: true, invoice });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create invoice' });
  }
});

router.put('/invoices/:id/pay', async (req: AuthenticatedRequest, res) => {
  const { paymentDate } = req.body;
  const invoice = markInvoicePaid(req.params.id as string, paymentDate);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  addAuditLog({
    action: 'INVOICE_MARKED_PAID',
    details: `Invoice #${invoice.invoiceNumber} marked Paid ($${invoice.amount}) on ${invoice.paidDate}`,
    actor: req.user?.email || 'admin@renu.com',
    category: 'SYSTEM'
  });

  res.json({ success: true, invoice });
});

router.put('/invoices/:id/void', async (req: AuthenticatedRequest, res) => {
  const invoice = voidInvoice(req.params.id as string);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ success: true, invoice });
});

router.put('/invoices/:id', async (req: AuthenticatedRequest, res) => {
  const inv = mockInvoices.find(i => i.id === req.params.id || i.invoiceNumber === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  if (req.body.invoiceNumber) inv.invoiceNumber = req.body.invoiceNumber.trim();
  if (req.body.amount !== undefined) inv.amount = Number(req.body.amount) || inv.amount;
  if (req.body.dueDate) inv.dueDate = req.body.dueDate;
  if (req.body.invoiceDate) inv.invoiceDate = req.body.invoiceDate;
  if (req.body.pdfData) inv.pdfData = req.body.pdfData;
  if (req.body.pdfFileName) inv.pdfFileName = req.body.pdfFileName;
  if (req.body.quickbooksInvoiceId !== undefined) inv.quickbooksInvoiceId = req.body.quickbooksInvoiceId;

  saveStore();
  res.json({ success: true, invoice: inv });
});

// ---------------------------------
// Year-End Purchase Summary & Reports
// ---------------------------------
router.get(['/reports/year-end-summary', '/reports/year-end'], async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
  const customerId = (req.query.customerId as string) || (req.user?.role === 'admin' ? 'customer@renu.com' : (req.user?.email || 'customer@renu.com'));

  const summary = getCustomerYearEndSummary(customerId, year);
  res.json({
    ...summary,
    customerName: summary.customer?.name,
    totalGallons: summary.totals?.totalGallons,
    totalAmount: summary.totals?.totalInvoiced
  });
});

router.get('/reports/csv', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  const type = (req.query.type as string) || 'deliveries';
  const startDate = (req.query.startDate as string) || '2026-01-01';
  const endDate = (req.query.endDate as string) || '2026-12-31';

  let csvContent = '';
  if (type === 'deliveries') {
    csvContent = 'Order ID,Customer Email,Product,Gallons,Delivered Gallons,Status,Date,Ranch,Delivery Window\n';
    const list = mockOrdersList.filter(d => d.date >= startDate && d.date <= endDate);
    for (const d of list) {
      const ranch = mockRanches.find(r => r.id === d.ranchId);
      csvContent += `"${d.orderId}","${d.customerEmail}","${d.product}",${d.gallons},${d.deliveredGallons || d.gallons},"${d.status}","${d.date}","${ranch?.name || ''}","${d.deliveryWindow || ''}"\n`;
    }
  } else {
    csvContent = 'Invoice Number,Customer Email,Amount,Status,Invoice Date,Due Date,Paid Date,Product,Gallons\n';
    const list = mockInvoices.filter(i => i.invoiceDate >= startDate && i.invoiceDate <= endDate);
    for (const i of list) {
      csvContent += `"${i.invoiceNumber}","${i.customerEmail}",${i.amount},"${i.status}","${i.invoiceDate}","${i.dueDate}","${i.paidDate || ''}","${i.product || ''}",${i.gallons || ''}\n`;
    }
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${type}_report_${Date.now()}.csv"`);
  res.send(csvContent);
});

// ---------------------------------
// Feature Flags Routes
// ---------------------------------
router.get('/feature-flags', async (req: AuthenticatedRequest, res) => {
  const customerId = req.query.customerId as string;
  const flags = getFeatureFlagsForCustomer(customerId || req.user?.email);
  res.json({
    flags,
    global: mockFeatureFlags.global,
    customerOverrides: mockFeatureFlags.customerOverrides
  });
});

router.post('/feature-flags', async (req: AuthenticatedRequest, res) => {
  try {
    const { global, customerId, customerOverrides } = req.body;
    if (global) {
      updateGlobalFeatureFlags(global);
    }
    if (customerId && customerOverrides) {
      updateCustomerFeatureFlagOverride(customerId, customerOverrides);
    }
    res.json({
      success: true,
      global: mockFeatureFlags.global,
      customerOverrides: mockFeatureFlags.customerOverrides
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update feature flags' });
  }
});

// ---------------------------------
// Products Routes (NO PRICE FIELD ANYWHERE!)
// ---------------------------------
router.get('/products', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  // Strip any price field from response
  const sanitized = mockProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    analysis: p.analysis || '',
    omriCertified: p.omriCertified !== undefined ? p.omriCertified : true,
    imageUrl: p.imageUrl || '',
    createdAt: p.createdAt
  }));
  res.json(sanitized);
});

router.post('/admin/products', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, analysis, omriCertified, imageUrl } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Product name is required' });

    const newProd: ProductItem = {
      id: `prod-${Date.now()}`,
      name: name.trim(),
      description: (description || '').trim(),
      analysis: (analysis || '').trim(),
      omriCertified: Boolean(omriCertified),
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };

    mockProducts.unshift(newProd);
    saveStore();

    addAuditLog({
      action: 'PRODUCT_CREATED',
      details: `Product "${newProd.name}" added to catalogue`,
      actor: req.user?.email || 'admin@renu.com',
      category: 'SYSTEM'
    });

    res.json(newProd);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

router.put('/admin/products/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, analysis, omriCertified, imageUrl } = req.body;
    const prod = mockProducts.find(p => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    if (name) prod.name = name.trim();
    if (description !== undefined) prod.description = description.trim();
    if (analysis !== undefined) prod.analysis = analysis.trim();
    if (omriCertified !== undefined) prod.omriCertified = Boolean(omriCertified);
    if (imageUrl !== undefined) prod.imageUrl = imageUrl;

    saveStore();
    res.json({ success: true, product: prod });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update product' });
  }
});

router.delete('/admin/products/:id', async (req: AuthenticatedRequest, res) => {
  const idx = mockProducts.findIndex(p => p.id === req.params.id);
  if (idx !== -1) {
    mockProducts.splice(idx, 1);
    saveStore();
    return res.json({ success: true, message: 'Product deleted' });
  }
  res.status(404).json({ error: 'Product not found' });
});

export default router;
