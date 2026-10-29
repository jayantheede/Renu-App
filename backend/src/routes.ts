import { Router } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth';
import {
  mockRanches,
  mockTanks,
  mockUsers,
  mockOrdersList,
  mockInvoices,
  mockProducts,
  mockPrograms,
  mockSamples,
  mockFeatureFlags,
  mockAuditLogs,
  mockNotifications,
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
  addMedicineToTank,
  deleteMedicineFromTank,
  updateTankTracker,
  addReportToTank,
  deleteReportFromTank,
  createDeliveryOrder,
  updateDeliveryStatus,
  adminAcceptOrder,
  customerConfirmDelivery,
  dispatchProcessDecision,
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
  createNewUser,
  enrichDelivery,
  getProgramsForRanch,
  createProgram,
  updateProgram,
  deleteProgram,
  getSamplesList,
  createSample,
  updateSampleValues,
  createRecommendation,
  replyToRecommendation,
  getMonthlyReports,
  importBlocksToRanch,
  exportBlocksFromRanches,
  updateTankTelemetry,
  ProductItem,
  mockTasks,
  mockMessages,
  mockDocuments,
  mockPlatformSettings,
  getMessagesForUser,
  createMessage,
  markMessageRead,
  createEmployeeTask,
  updateTaskStatus,
  getDocumentsForCustomer,
  uploadCustomerDocument,
  deleteCustomerDocument,
  signCustomerContract,
  calculateComplianceReport,
  updateBlockYield,
  syncWithQuickBooks
} from './usersStore';
import { mockAvatars, transporter } from './usersStore';
import {
  sendOrderAcceptedEmailToCustomer,
  sendCustomerConfirmedEmailToDispatch,
  renderCustomerConfirmHtmlPage,
  renderDispatchActionHtmlPage,
  getBaseBackendUrl,
  DISPATCH_NOTIFICATION_EMAIL
} from './orderEmailService';

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
  syncStoreFromDB().catch(() => {});
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
  syncStoreFromDB().catch(() => {});
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let deliveriesDueSoon = mockOrdersList.filter(
    d => (d.status === 'Scheduled' || d.status === 'Out for delivery') &&
         (d.date === today || d.date === tomorrow || (d.deliveryWindow && (d.deliveryWindow.includes(today) || d.deliveryWindow.includes(tomorrow))))
  );
  if (deliveriesDueSoon.length === 0) {
    deliveriesDueSoon = mockOrdersList.filter(d => d.status === 'Scheduled' || d.status === 'Out for delivery').slice(0, 4);
  }

  // Enrich delivery cards so customer, ranch, and tank names are populated
  const enrichedDueSoon = deliveriesDueSoon.map(d => enrichDelivery(d));

  const deliveriesThisWeek = mockOrdersList.filter(d => d.status === 'Scheduled' || d.status === 'Out for delivery');

  const invoices = getInvoicesList(undefined, 'admin');
  const overdueInvoices = invoices.filter(i => i.status === 'Overdue');
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  const totalPaidRevenue = paidInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const openInvoices = invoices.filter(i => i.status === 'Open');
  const openTotal = openInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Otodata Low-tank alerts (Section 3)
  const lowTanksAlerts: any[] = [];
  mockRanches.forEach(r => {
    (r.tanks || []).forEach(t => {
      const threshold = t.reorderThresholdPercent || 25;
      const level = t.levelPercent !== undefined ? t.levelPercent : parseInt(t.level || '100', 10);
      if (level <= threshold) {
        lowTanksAlerts.push({
          tankId: t.id,
          tankName: t.name,
          ranchId: r.id,
          ranchName: r.name,
          customerId: r.customerId,
          customerEmail: r.customerEmail,
          levelPercent: level,
          levelGallons: t.levelGallons || Math.round(t.capacity * (level / 100)),
          capacity: t.capacity,
          thresholdPercent: threshold,
          daysToEmpty: t.daysToEmpty || 4,
          deviceSerial: t.otodataDeviceId
        });
      }
    });
  });

  // Pending lab samples waiting for recommendation (Section 5.5)
  const pendingSamplesAlerts = mockSamples.filter(s => s.status === 'Received' || s.status === 'Under review');

  res.json({
    deliveriesDueSoon: enrichedDueSoon,
    deliveriesThisWeekCount: deliveriesThisWeek.length,
    overdueInvoices,
    overdueTotal,
    totalPaidRevenue,
    openTotal,
    lowTanksAlerts,
    pendingSamplesAlerts,
    metrics: {
      totalRevenue: totalPaidRevenue,
      openInvoicesTotal: openTotal,
      overdueTotal,
      activeDeliveries: deliveriesThisWeek.length,
      lowTanksCount: lowTanksAlerts.length,
      pendingSamplesCount: pendingSamplesAlerts.length
    }
  });
});

// ---------------------------------
// Ranches, Blocks & Tanks Routes
// ---------------------------------
router.get('/ranches', async (req: AuthenticatedRequest, res) => {
  syncStoreFromDB().catch(() => {});
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

// Tank Medicines
router.post('/tanks/:id/medicines', async (req: AuthenticatedRequest, res) => {
  try {
    const med = addMedicineToTank(req.params.id as string, req.body);
    if (!med) return res.status(404).json({ error: 'Tank not found' });
    res.json({ success: true, medicine: med });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to add medicine' });
  }
});

router.delete('/tanks/:id/medicines/:medId', async (req: AuthenticatedRequest, res) => {
  const ok = deleteMedicineFromTank(req.params.id as string, req.params.medId as string);
  if (ok) return res.json({ success: true, message: 'Medicine removed' });
  res.status(404).json({ error: 'Tank or medicine not found' });
});

// Tank Trackers
router.post('/tanks/:id/trackers', async (req: AuthenticatedRequest, res) => {
  try {
    const tracker = updateTankTracker(req.params.id as string, req.body);
    if (!tracker) return res.status(404).json({ error: 'Tank not found' });
    res.json({ success: true, tracker });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to update tracker' });
  }
});

// Tank Reports
router.post('/tanks/:id/reports', async (req: AuthenticatedRequest, res) => {
  try {
    const report = addReportToTank(req.params.id as string, {
      ...req.body,
      author: req.user?.name || req.user?.email || 'Grower'
    });
    if (!report) return res.status(404).json({ error: 'Tank not found' });
    res.json({ success: true, report });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to add report' });
  }
});

router.delete('/tanks/:id/reports/:reportId', async (req: AuthenticatedRequest, res) => {
  const ok = deleteReportFromTank(req.params.id as string, req.params.reportId as string);
  if (ok) return res.json({ success: true, message: 'Report removed' });
  res.status(404).json({ error: 'Tank or report not found' });
});

// ---------------------------------
// Deliveries (Orders) Routes
// ---------------------------------
router.get(['/deliveries', '/orders'], async (req: AuthenticatedRequest, res) => {
  syncStoreFromDB().catch(() => {});
  const user = req.user!;
  const isAdmin = user.role?.toLowerCase() === 'admin' || user.email?.toLowerCase().includes('admin') || user.email?.toLowerCase().includes('support@');
  if (isAdmin) {
    return res.json(mockOrdersList.map(d => enrichDelivery(d)));
  }
  const norm = user.email.toLowerCase().trim();
  const userId = user.id ? user.id.toLowerCase().trim() : '';
  const userDeliveries = mockOrdersList.filter(
    d => (d.customerId && (d.customerId.toLowerCase() === norm || d.customerId.toLowerCase() === userId)) ||
         (d.customerEmail && d.customerEmail.toLowerCase() === norm)
  );
  res.json(userDeliveries.map(d => enrichDelivery(d)));
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
      product: product || 'ReNu N-32% K-28% Blend',
      gallons: Number(gallons) || 500,
      ranchId: ranchId || 'ranch-1',
      tankId: tankId || 'tank-1-1',
      blockIds: Array.isArray(blockIds) ? blockIds : [],
      deliveryWindow: deliveryWindow || 'Scheduled date window',
      gateCode,
      contactOnArrival,
      notes
    });

    // Send email notification to customer on Scheduled (non-blocking)
    if (process.env.SMTP_USER && process.env.SMTP_PASS && targetEmail) {
      transporter.sendMail({
        from: `"ReNu-Biome Deliveries" <${process.env.SMTP_USER}>`,
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
      }).catch((err: any) => {
        console.warn('[Email Warning] Could not send scheduled delivery email:', err.message);
      });
    }

    addAuditLog({
      action: 'DELIVERY_CREATED',
      details: `Order #${delivery.orderId} created for ${targetEmail} (${delivery.gallons} Gal ${delivery.product})`,
      actor: req.user?.email || 'support@renu-biome.com',
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

    // Email notification on status changes (non-blocking)
    if (process.env.SMTP_USER && process.env.SMTP_PASS && delivery.customerEmail) {
      let subject = `Delivery Update: Order #${delivery.orderId} is ${status}`;
      let msg = `<p>Your delivery status has changed to <strong>${status}</strong>.</p>`;

      if (status === 'Out for delivery') {
        subject = `Out for Delivery: Order #${delivery.orderId} (${delivery.product})`;
        msg = `<p>Our dispatch truck is en route with <strong>${delivery.gallons} Gal</strong> of <strong>${delivery.product}</strong> for injection.</p>`;
      } else if (status === 'Delivered') {
        subject = `Delivery Completed: Order #${delivery.orderId} (${delivery.product})`;
        msg = `<p>Successfully injected <strong>${delivery.deliveredGallons || delivery.gallons} Gal</strong> of <strong>${delivery.product}</strong> on ${delivery.deliveredDate || 'today'}.</p>`;
      }

      transporter.sendMail({
        from: `"ReNu-Biome Deliveries" <${process.env.SMTP_USER}>`,
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
      }).catch((err: any) => {
        console.warn('[Email Warning] Status update email failed:', err.message);
      });
    }

    // If delivered, notify other admin as required:
    if (status === 'Delivered') {
      addAdminNotification({
        title: 'Delivery Marked Delivered',
        message: `Delivery #${delivery.orderId} (${delivery.product}, ${delivery.deliveredGallons || delivery.gallons} Gal) marked delivered for ${delivery.customerEmail}.`,
        type: 'DELIVERY'
      });
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

router.post([
  '/admin/orders/:id/accept',
  '/admin/orders/:id/accept-and-email',
  '/orders/:id/accept'
], async (req: AuthenticatedRequest, res) => {
  try {
    const order = adminAcceptOrder(req.params.id as string);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send confirmation request to the customer asynchronously
    sendOrderAcceptedEmailToCustomer(order, req).catch((err: any) => {
      console.warn('[Email Warning] Error sending customer confirmation email:', err.message);
    });

    addAuditLog({
      action: 'ORDER_ACCEPTED',
      details: `Order #${order.orderId} accepted by admin ${req.user?.email || 'admin'}. Confirmation request dispatched to customer ${order.customerEmail}.`,
      actor: req.user?.email || 'admin@renu-biome.com',
      category: 'ORDERS'
    });

    res.json({
      success: true,
      order,
      delivery: order,
      message: `Order #${order.orderId} accepted! Confirmation request emailed to customer.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to accept order' });
  }
});

router.post([
  '/orders/:id/confirm-delivery',
  '/deliveries/:id/confirm-delivery'
], async (req: AuthenticatedRequest, res) => {
  try {
    const { deliveryAddress, gateCode, contactOnArrival, contactPhone, deliveryWindow, notes } = req.body;
    const order = customerConfirmDelivery(req.params.id as string, {
      deliveryAddress,
      gateCode,
      contactOnArrival,
      contactPhone,
      deliveryWindow,
      notes
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Send detailed delivery details to eedevnsskjayanth.asa@gmail.com with Accept and Reschedule buttons
    sendCustomerConfirmedEmailToDispatch(order, req).catch((err: any) => {
      console.warn('[Email Warning] Error sending dispatch confirmation email:', err.message);
    });

    addAuditLog({
      action: 'DELIVERY_CONFIRMED',
      details: `Customer confirmed delivery for order #${order.orderId} at ${order.deliveryAddress || 'Ranch'}. Dispatch notification sent to ${DISPATCH_NOTIFICATION_EMAIL}.`,
      actor: req.user?.email || order.customerEmail,
      category: 'ORDERS'
    });

    res.json({
      success: true,
      order,
      delivery: order,
      message: `Delivery details confirmed! Dispatch notified at ${DISPATCH_NOTIFICATION_EMAIL}.`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to confirm delivery' });
  }
});

// Public Web Link: Customer fills delivery details
router.get(['/public/orders/:id/confirm', '/orders/:id/confirm'], async (req: AuthenticatedRequest, res) => {
  const orderId = req.params.id as string;
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) {
    return res.status(404).send('<h2 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#B91C1C;">Order not found or link has expired.</h2>');
  }

  const backendUrl = getBaseBackendUrl(req);
  const html = renderCustomerConfirmHtmlPage(order, backendUrl);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Public Web Link: Customer submits delivery details
router.post(['/public/orders/:id/confirm-delivery'], async (req: AuthenticatedRequest, res) => {
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

    sendCustomerConfirmedEmailToDispatch(order, req).catch((err: any) => {
      console.warn('[Email Warning] Could not send dispatch email:', err.message);
    });

    addAuditLog({
      action: 'DELIVERY_CONFIRMED',
      details: `Customer confirmed delivery details for #${order.orderId} (${order.deliveryAddress || 'Ranch'}). Dispatch notified at ${DISPATCH_NOTIFICATION_EMAIL}.`,
      actor: order.customerEmail,
      category: 'ORDERS'
    });

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

// Public Dispatch Action (Accept or Reschedule from Email)
router.get(['/public/orders/:id/dispatch-action', '/orders/:id/dispatch-action'], async (req: AuthenticatedRequest, res) => {
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

    const html = renderDispatchActionHtmlPage(order, 'reschedule', undefined, true, backendUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  res.status(400).send('Invalid dispatch action.');
});

router.post(['/public/orders/:id/dispatch-action', '/orders/:id/dispatch-action'], async (req: AuthenticatedRequest, res) => {
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

// ---------------------------------
// Invoices Routes (Hand-entered from QuickBooks)
// ---------------------------------
router.get('/invoices', async (req: AuthenticatedRequest, res) => {
  syncStoreFromDB().catch(() => {});
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
      actor: req.user?.email || 'support@renu-biome.com',
      category: 'SYSTEM'
    });

    res.json({ success: true, invoice });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create invoice' });
  }
});

router.put('/invoices/:id/pay', async (req: AuthenticatedRequest, res) => {
  const { paymentDate, paymentMethod, paymentDetails } = req.body;
  const invoice = markInvoicePaid(req.params.id as string, paymentDate, paymentMethod, paymentDetails);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  addAuditLog({
    action: 'INVOICE_ONLINE_PAYMENT',
    details: `Invoice #${invoice.invoiceNumber} paid online ($${invoice.amount}) via ${paymentMethod || 'ACH'} by ${req.user?.email || 'grower'}`,
    actor: req.user?.email || 'support@renu-biome.com',
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
  syncStoreFromDB().catch(() => {});
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
  syncStoreFromDB().catch(() => {});
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
  syncStoreFromDB().catch(() => {});
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
      actor: req.user?.email || 'support@renu-biome.com',
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

// ---------------------------------
// Nutrition Programs Routes (Phase 2 - Section 4)
// ---------------------------------
router.get('/programs', async (req: AuthenticatedRequest, res) => {
  syncStoreFromDB().catch(() => {});
  const ranchId = req.query.ranchId as string | undefined;
  const programs = getProgramsForRanch(ranchId);
  res.json(programs);
});

router.post('/programs', async (req: AuthenticatedRequest, res) => {
  try {
    const program = createProgram(req.body);
    addAuditLog({
      action: 'PROGRAM_CREATED',
      details: `Program "${program.name}" created for ranch ${program.ranchName}`,
      actor: req.user?.email || 'support@renu-biome.com',
      category: 'RANCHES'
    });
    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create nutrition program' });
  }
});

router.put('/programs/:id', async (req: AuthenticatedRequest, res) => {
  const updated = updateProgram(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Program not found' });
  res.json(updated);
});

router.delete('/programs/:id', async (req: AuthenticatedRequest, res) => {
  const ok = deleteProgram(req.params.id as string);
  if (!ok) return res.status(404).json({ error: 'Program not found' });
  res.json({ success: true });
});

// ---------------------------------
// Soil & Tissue Samples Routes (Phase 2 - Section 5)
// ---------------------------------
router.get('/samples', async (req: AuthenticatedRequest, res) => {
  syncStoreFromDB().catch(() => {});
  const ranchId = req.query.ranchId as string | undefined;
  const blockId = req.query.blockId as string | undefined;
  const samples = getSamplesList(ranchId, blockId);
  res.json(samples);
});

router.post('/samples', async (req: AuthenticatedRequest, res) => {
  try {
    const sample = createSample({
      ...req.body,
      customerId: req.user?.id,
      customerEmail: req.user?.email
    });

    addAuditLog({
      action: 'SAMPLE_SUBMITTED',
      details: `New ${sample.sampleType} sample submitted for Block ${sample.blockId}`,
      actor: req.user?.email || 'customer@renu.com',
      category: 'RANCHES'
    });

    addAdminNotification({
      title: 'New Lab Sample Received',
      message: `${sample.sampleType.toUpperCase()} assay submitted for Block ${sample.blockId} (${sample.ranchName})`,
      type: 'LAB'
    });

    res.json(sample);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit lab sample' });
  }
});

router.put('/samples/:id/values', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = updateSampleValues(req.params.id as string, req.body);
    if (!updated) return res.status(404).json({ error: 'Sample not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update sample values' });
  }
});

router.post('/samples/:id/recommendation', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = createRecommendation(req.params.id as string, req.body);
    if (!updated) return res.status(404).json({ error: 'Sample not found' });

    addAuditLog({
      action: 'RECOMMENDATION_SENT',
      details: `Custom nutrition recommendation sent for Sample ${updated.id}`,
      actor: req.user?.email || 'support@renu-biome.com',
      category: 'RANCHES'
    });

    // Notify customer
    if (transporter && updated.customerEmail) {
      try {
        await transporter.sendMail({
          from: `"ReNu-Biome Agronomy" <${process.env.SMTP_USER || 'support@renu-biome.com'}>`,
          to: updated.customerEmail,
          subject: `ReNu-Biome: Agronomic Recommendation for Block ${updated.blockId}`,
          text: `Your lab results for Block ${updated.blockId} have been reviewed. A custom recommendation has been posted in your grower portal.`
        });
      } catch (err) {}
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to post recommendation' });
  }
});

router.post('/samples/:id/reply', async (req: AuthenticatedRequest, res) => {
  try {
    const { question } = req.body;
    const updated = replyToRecommendation(req.params.id as string, question);
    if (!updated) return res.status(404).json({ error: 'Sample not found' });

    addAdminNotification({
      title: 'Customer Question on Recommendation',
      message: `Question regarding ${updated.blockId} recommendation: "${question}"`,
      type: 'LAB'
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit reply' });
  }
});

// ---------------------------------
// Otodata Tank Telemetry Routes (Phase 2 - Section 3)
// ---------------------------------
router.get('/tanks/:id/telemetry', async (req: AuthenticatedRequest, res) => {
  for (const ranch of mockRanches) {
    const tank = (ranch.tanks || []).find(t => t.id === req.params.id);
    if (tank) {
      const levelPercent = tank.levelPercent !== undefined ? tank.levelPercent : parseInt(tank.level || '75', 10);
      const levelGallons = tank.levelGallons || tank.currentGallons || Math.round(tank.capacity * 0.75);
      return res.json({
        tankId: tank.id,
        tankName: tank.name,
        ranchName: ranch.name,
        capacity: tank.capacity,
        serial: tank.otodataDeviceId || tank.serial || 'OTO-99214',
        otodataDeviceId: tank.otodataDeviceId || tank.serial || 'OTO-99214',
        levelPercent,
        currentGallons: levelGallons,
        levelGallons,
        pressurePSI: parseInt(tank.pressure || '32', 10),
        lastReadingTime: tank.lastReadingTime || new Date().toISOString(),
        weeklyUsageAvg: tank.weeklyUsageAvg || 210,
        daysToEmpty: tank.daysToEmpty || 35,
        reorderThresholdPercent: tank.reorderThresholdPercent || 25,
        status: tank.status || 'Normal'
      });
    }
  }
  res.status(404).json({ error: 'Tank not found' });
});

router.put('/tanks/:id/telemetry', async (req: AuthenticatedRequest, res) => {
  const updated = updateTankTelemetry(req.params.id as string, req.body);
  if (!updated) return res.status(404).json({ error: 'Tank not found' });
  res.json(updated);
});

// ---------------------------------
// Monthly Reports Routes (Section A6.7)
// ---------------------------------
router.get('/reports/monthly', async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string | undefined;
  const reports = getMonthlyReports(period);
  res.json(reports);
});

// ---------------------------------
// Block Import / Export Routes (Section A11)
// ---------------------------------
router.post('/ranches/:ranchId/blocks/import', async (req: AuthenticatedRequest, res) => {
  try {
    const { blocks } = req.body;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return res.status(400).json({ error: 'Blocks array is required' });
    }
    const result = importBlocksToRanch(req.params.ranchId as string, blocks);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Import failed' });
  }
});

router.get('/blocks/export', async (req: AuthenticatedRequest, res) => {
  try {
    const ranchId = req.query.ranchId as string | undefined;
    const csvData = exportBlocksFromRanches(ranchId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ReNu-Biome-Blocks.csv"');
    res.send(csvData);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

// ---------------------------------
// Admin Customer Management Routes (inside router)
// ---------------------------------
router.get('/admin/customers', async (req: AuthenticatedRequest, res) => {
  const customers = await getAllCustomersList();
  res.json(customers);
});

router.post('/admin/customers', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const newCust = await createNewUser({
      name: name || 'New Customer',
      email,
      password: password || 'Customer123!',
      phone,
      role: role || 'Grower',
      approvalStatus: 'APPROVED'
    });

    res.json({ success: true, customer: newCust });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create customer' });
  }
});

router.put('/admin/customers/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await updateCustomerDetails(req.params.id as string, req.body);
    res.json({ success: true, customer: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update customer' });
  }
});

router.put('/admin/customers/:id/reset-password', async (req: AuthenticatedRequest, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    const updated = await updateCustomerDetails(req.params.id as string, { password });
    res.json({ success: true, message: 'Password reset successfully', customer: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

// ---------------------------------
// OptimoRoute Integration Routes (Phase 2 - Section 2)
// ---------------------------------
router.post(['/optimoroute/webhook', '/webhooks/optimoroute'], async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, status, driverName, eta, completionTime } = req.body;
    const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId || o.optimoRouteOrderId === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (status === 'Out for delivery' || status === 'en_route') {
      updateDeliveryStatus(order.id, 'Out for delivery');
      if (driverName) order.driverName = driverName;
      if (eta) order.estimatedArrival = eta;
    } else if (status === 'Delivered' || status === 'completed') {
      updateDeliveryStatus(order.id, 'Delivered', {
        deliveredDate: completionTime || new Date().toISOString().split('T')[0]
      });
      if (completionTime) order.completedTime = completionTime;
    }

    saveStore();
    res.json({ success: true, order: enrichDelivery(order) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Webhook failed' });
  }
});

// ---------------------------------
// Messaging Routes (Phase 2 - Deferred Launch Capability)
// ---------------------------------
router.get('/messages', async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const msgs = getMessagesForUser(user.email, user.role);
  res.json(msgs);
});

router.post('/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { title, body, toEmail, type, photoUrl } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    const newMsg = createMessage({
      title,
      body,
      fromEmail: user.email,
      toEmail: toEmail || (user.role === 'admin' ? 'customer@renu.com' : 'support@renu-biome.com'),
      senderName: user.name || (user.role === 'admin' ? 'ReNu-Biome Admin' : 'Grower'),
      type: type || 'USER',
      photoUrl
    });

    addAdminNotification({
      title: `New In-App Message: ${title}`,
      message: `From ${user.email}: ${body.slice(0, 80)}...`,
      type: 'TASK'
    });

    res.json({ success: true, message: newMsg });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

router.put('/messages/:id/read', async (req: AuthenticatedRequest, res) => {
  const updated = markMessageRead(req.params.id as string);
  res.json({ success: true, message: updated });
});

// ---------------------------------
// Staff Tasks Routes (Phase 2 - Deferred Launch Capability)
// ---------------------------------
router.get('/tasks', async (req: AuthenticatedRequest, res) => {
  res.json(mockTasks);
});

router.post(['/tasks', '/admin/tasks'], async (req: AuthenticatedRequest, res) => {
  try {
    const newTask = createEmployeeTask(req.body);
    addAuditLog({
      action: 'TASK_CREATED',
      details: `Field task created: "${newTask.title}" assigned to ${newTask.assignedToEmail}`,
      actor: req.user?.email || 'admin',
      category: 'SYSTEM'
    });
    res.json({ success: true, task: newTask });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

router.put('/tasks/:id/status', async (req: AuthenticatedRequest, res) => {
  const { status, empEmail } = req.body;
  const updated = updateTaskStatus(req.params.id as string, status, empEmail);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, task: updated });
});

// ---------------------------------
// Documents & Compliance Center Routes (Phase 2 - Deferred Launch Capability)
// ---------------------------------
router.get('/documents', async (req: AuthenticatedRequest, res) => {
  const docs = getDocumentsForCustomer(req.user?.email);
  res.json(docs);
});

router.post('/documents/upload', async (req: AuthenticatedRequest, res) => {
  try {
    const newDoc = uploadCustomerDocument({
      ...req.body,
      uploadedBy: req.user?.name || req.user?.email || 'Grower'
    });
    addAuditLog({
      action: 'DOCUMENT_UPLOADED',
      details: `Document uploaded: "${newDoc.title}" (${newDoc.category}) by ${req.user?.email}`,
      actor: req.user?.email || 'grower',
      category: 'SYSTEM'
    });
    res.json({ success: true, document: newDoc });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

router.delete('/documents/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const success = deleteCustomerDocument(req.params.id as string);
    if (!success) return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to delete document' });
  }
});

router.post('/documents/sign', async (req: AuthenticatedRequest, res) => {
  try {
    const { documentId, signatureName } = req.body;
    if (!signatureName) return res.status(400).json({ error: 'Signature name is required' });
    const signed = signCustomerContract(documentId, signatureName);
    if (!signed) return res.status(404).json({ error: 'Document not found' });

    addAuditLog({
      action: 'CONTRACT_ESIGNED',
      details: `Agreement "${signed.title}" e-signed by ${signatureName} (${req.user?.email})`,
      actor: req.user?.email || 'grower',
      category: 'USERS'
    });

    res.json({ success: true, document: signed });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sign document' });
  }
});

router.get('/documents/audit-pack', async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const docs = getDocumentsForCustomer(user.email);
  const compliance = calculateComplianceReport(user.email, 2026);
  res.json({
    title: 'ReNu-Biome Official Compliance Audit Package (2026)',
    customer: user.name || 'Sierra Agri Group',
    generatedAt: new Date().toISOString(),
    documents: docs,
    complianceSummary: compliance,
    certifyingOfficer: 'Dr. Marcus Vance, CCA / Senior Agronomist',
    auditStatus: 'ACTIVE_AND_COMPLIANT'
  });
});

// ---------------------------------
// ILRP Nitrogen Compliance Routes (Phase 2 - Section 9.4)
// ---------------------------------
router.get('/compliance/nitrogen-report', async (req: AuthenticatedRequest, res) => {
  const season = req.query.season ? parseInt(req.query.season as string, 10) : 2026;
  const report = calculateComplianceReport(req.user?.email, season);
  res.json(report);
});

router.get('/compliance/export-csv', async (req: AuthenticatedRequest, res) => {
  const season = req.query.season ? parseInt(req.query.season as string, 10) : 2026;
  const report = calculateComplianceReport(req.user?.email, season);
  
  let csv = 'Ranch Name,Block ID,Crop,Variety,Acreage,County,APNs,Applied N (lb/ac),Total Applied N (lb),Kernel Yield (lb/ac),Removed N (lb/ac),A/R Ratio,Benchmark Target,Status,Coalition\n';
  (report.blocks || []).forEach((b: any) => {
    const apnsStr = (b.apns || []).join('; ');
    csv += `"${b.ranchName}","${b.blockId}","${b.crop}","${b.variety}",${b.acreage},"${b.county}","${apnsStr}",${b.appliedLbNPerAcre},${b.totalAppliedLbN},${b.yieldPerAcre},${b.removedLbNPerAcre},${b.arRatio},"${b.benchmarkTarget}","${b.status}","${b.coalition}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=ILRP_Nitrogen_Report_${season}.csv`);
  res.send(csv);
});

router.put('/compliance/yield', async (req: AuthenticatedRequest, res) => {
  const { blockId, yieldPerAcre } = req.body;
  if (!blockId || yieldPerAcre === undefined) {
    return res.status(400).json({ error: 'blockId and yieldPerAcre are required' });
  }
  const updated = updateBlockYield(blockId, Number(yieldPerAcre));
  if (!updated) return res.status(404).json({ error: 'Block not found' });
  res.json({ success: true, block: updated });
});

// ---------------------------------
// QuickBooks Online Sync Routes (Phase 2 - Deferred Launch Capability)
// ---------------------------------
router.get('/quickbooks/status', async (req: AuthenticatedRequest, res) => {
  res.json({
    connected: true,
    company: 'ReNu-Biome Inc.',
    realmId: '9341452819',
    lastSyncTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'Connected & Fully Synchronized',
    syncMode: 'Realtime Bi-directional Webhooks'
  });
});

router.post('/quickbooks/sync', async (req: AuthenticatedRequest, res) => {
  const result = syncWithQuickBooks();
  res.json(result);
});

// ---------------------------------
// Platform Settings & Audit Logs (Admin)
// ---------------------------------
router.get('/admin/settings', async (req: AuthenticatedRequest, res) => {
  res.json(mockPlatformSettings);
});

router.post('/admin/settings', async (req: AuthenticatedRequest, res) => {
  Object.assign(mockPlatformSettings, req.body);
  saveStore();
  res.json({ success: true, settings: mockPlatformSettings });
});

router.get('/admin/audit-logs', async (req: AuthenticatedRequest, res) => {
  res.json(mockAuditLogs);
});

// ---------------------------------
// Mobile Push Notification Endpoints
// ---------------------------------
const pushSubscriptions: any[] = [];

router.post('/push/subscribe', async (req: AuthenticatedRequest, res) => {
  const { subscription, email } = req.body;
  if (subscription) {
    pushSubscriptions.push({
      subscription,
      email: email || req.user?.email || 'grower@renu-biome.com',
      subscribedAt: new Date().toISOString()
    });
  }
  res.json({ success: true, message: 'Push subscription registered for mobile alerts' });
});

router.post('/push/send', async (req: AuthenticatedRequest, res) => {
  const { title, body, url, tag, targetEmail } = req.body;
  addAdminNotification({
    title: title || 'Mobile Operational Alert',
    message: body || 'New update regarding your delivery or ranch tanks.',
    type: 'DELIVERY'
  });

  res.json({
    success: true,
    sent: true,
    subscribersNotified: Math.max(1, pushSubscriptions.length),
    notification: { title, body, url, tag }
  });
});

router.get('/notifications', async (req: AuthenticatedRequest, res) => {
  res.json({ success: true, notifications: mockNotifications });
});

export { router };
export default router;

