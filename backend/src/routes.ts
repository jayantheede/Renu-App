import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole, AuthenticatedRequest } from './auth';

const router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

router.get('/profile', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) {
    const mockUser = { ...req.user, avatarUrl: mockAvatars[req.user!.id] };
    return res.json({ message: 'Profile details', user: mockUser });
  }
  const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ message: 'Profile details', user: u });
});

import { mockAvatars } from './index';
import { mockRanches, mockTanks, mockUsers, mockOrdersList, mockInvoices, updateCustomerApprovalStatus, updateCustomerDetails, mockPlatformSettings, mockAuditLogs, addAuditLog, mockProducts, saveStore, syncStoreFromDB } from './usersStore';

router.put('/profile', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;
    if (req.user!.id.startsWith('mock-')) {
      if (avatarUrl) {
        mockAvatars[req.user!.id] = avatarUrl;
      }
      return res.json({ id: req.user!.id, email: req.user!.email, role: req.user!.role, name, avatarUrl });
    }
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, avatarUrl }
    });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: 'Failed to update profile' }); }
});
router.get('/settings', (req, res) => res.json({ message: 'Settings details' }));
router.get('/notifications', (req, res) => res.json({ message: 'Notifications' }));

// ---------------------------------
// Dashboard Routes
// ---------------------------------
router.get('/grower/dashboard', requireRole(['Grower', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const ranches = await prisma.ranch.count();
    const orders = await prisma.order.count();
    res.json({
      role: 'Grower',
      metrics: {
        assignedRanches: ranches,
        pendingOrders: orders,
        openInvoices: 0,
        unreadMessages: 0,
        activeRecommendations: 0
      }
    });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/manager/dashboard', async (req, res) => res.json({ role: 'Ranch Manager', metrics: {} }));
router.get('/owner/dashboard', async (req, res) => res.json({ role: 'Owner', metrics: {} }));
router.get('/ceo/dashboard', async (req, res) => res.json({ role: 'CEO', metrics: {} }));
router.get('/cto/dashboard', async (req, res) => res.json({ role: 'CTO', metrics: {} }));
router.get('/support/dashboard', async (req, res) => res.json({ role: 'Support Admin', metrics: {} }));
router.get('/admin/dashboard', async (req, res) => res.json({ role: 'Super Administrator', metrics: {} }));

// ---------------------------------
// Grower / Customer App Routes
// ---------------------------------

router.get('/ranches', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  if (req.user!.id.startsWith('mock-')) {
    return res.json(mockRanches.map(r => ({ ...r, tankSetups: mockTanks.filter(t => t.ranchId === r.id) })));
  }
  try {
    const ranches = await prisma.ranch.findMany({ include: { tankSetups: true } });
    res.json(ranches);
  } catch(e) { res.status(500).json({ error: 'Failed to fetch ranches' }); }
});

router.post('/ranches', async (req: AuthenticatedRequest, res) => {
  try {
    const { entId, name, county, ac } = req.body;
    
    if (req.user!.id.startsWith('mock-')) {
      const newRanch = { id: `mock-ranch-${Date.now()}`, entId: 'mock-entity-1', name, county, ac, approvalStatus: 'PENDING' };
      mockRanches.push(newRanch);
      saveStore();
      return res.json(newRanch);
    }

    let targetEntId = entId;
    if (!targetEntId) {
       const entity = await prisma.entity.create({ data: { name: 'Demo Entity' } });
       targetEntId = entity.id;
    }

    const ranch = await prisma.ranch.create({
      data: { entId: targetEntId, name, county, ac, approvalStatus: 'PENDING' }
    });
    res.json(ranch);
  } catch(e) { res.status(500).json({ error: 'Failed to create ranch' }); }
});

router.post('/tank-setups', async (req: AuthenticatedRequest, res) => {
  try {
    const { ranchId, capacity, location } = req.body;
    
    if (req.user!.id.startsWith('mock-')) {
      const newTank = { id: `mock-tank-${Date.now()}`, ranchId, capacity, location, approvalStatus: 'PENDING' };
      mockTanks.push(newTank);
      saveStore();
      return res.json(newTank);
    }

    const tank = await prisma.tankSetup.create({
      data: { ranchId, capacity, location, approvalStatus: 'PENDING' }
    });
    res.json(tank);
  } catch(e) { res.status(500).json({ error: 'Failed to create tank setup' }); }
});

router.get('/orders', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  if (req.user!.id.startsWith('mock-')) return res.json(mockOrdersList);
  try {
    const orders = await prisma.order.findMany();
    res.json(orders && orders.length > 0 ? orders : mockOrdersList);
  } catch (error) { res.json(mockOrdersList); }
});

router.post('/orders', async (req: AuthenticatedRequest, res) => {
  try {
    const { items, total, customerEmail, product, qty } = req.body;
    const prodName = product || (items && items[0]?.product) || 'Biome Care';
    const quantity = qty || (items && items[0]?.qty) || '10 Gal';
    const amount = total || 1000;
    const email = customerEmail || req.user?.email || 'customer@renu.com';
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


router.get('/invoices', async (req: AuthenticatedRequest, res) => {
  await syncStoreFromDB();
  if (req.user!.id.startsWith('mock-')) return res.json(mockInvoices);
  try {
    const invoices = await prisma.invoice.findMany({ include: { entity: true } });
    res.json(invoices && invoices.length > 0 ? invoices : mockInvoices);
  } catch (error) { res.json(mockInvoices); }
});

router.get('/messages', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) return res.json([]);
  try {
    const messages = await prisma.message.findMany();
    res.json(messages);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/products', async (req: AuthenticatedRequest, res) => {
  try {
    const dbProducts = await prisma.product.findMany();
    if (dbProducts && dbProducts.length > 0) {
      const combined = [...mockProducts];
      for (const p of dbProducts) {
        if (!combined.some(item => item.id === p.id)) combined.push(p as any);
      }
      return res.json(combined);
    }
  } catch (error) {
    console.warn('[DB Warning] Failed to fetch db products, using mockProducts');
  }
  res.json(mockProducts);
});


// ---------------------------------
// Admin Approvals Routes
// ---------------------------------
router.get('/admin/approvals', async (req: AuthenticatedRequest, res) => {
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

  try {
    const dbRanches = await prisma.ranch.findMany({ where: { approvalStatus: 'PENDING' }, include: { entity: true } });
    const dbTanks = await prisma.tankSetup.findMany({ where: { approvalStatus: 'PENDING' }, include: { ranch: true } });
    const combinedRanches = [...pendingRanches];
    for (const r of dbRanches) {
      if (!combinedRanches.some(item => item.id === r.id)) combinedRanches.push(r as any);
    }
    const combinedTanks = [...pendingTanks];
    for (const t of dbTanks) {
      if (!combinedTanks.some(item => item.id === t.id)) combinedTanks.push(t as any);
    }
    res.json({ orders: pendingOrders, customers: pendingCustomers, ranches: combinedRanches, tanks: combinedTanks });
  } catch (error) { 
    res.json({ orders: pendingOrders, customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks }); 
  }
});

router.post('/admin/approvals/customer/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    const updated = updateCustomerApprovalStatus(req.params.id as string, status as any);
    res.json({ success: true, customer: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer approval' });
  }
});

router.put('/admin/customers/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, email, role, approvalStatus, password } = req.body;
    const updated = await updateCustomerDetails(req.params.id as string, { name, email, role, approvalStatus, password });
    if (updated) {
      addAuditLog({
        action: 'CUSTOMER_UPDATED',
        details: `Customer details modified for ${(name || updated.name)} (${(email || updated.email)})`,
        actor: req.user?.email || 'admin@renu.com',
        category: 'USERS'
      });
      res.json({ success: true, customer: updated });
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update customer' });
  }
});


router.post('/admin/approvals/ranch/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    if (req.user!.id.startsWith('mock-')) {
      const idx = mockRanches.findIndex(r => r.id === req.params.id);
      const target = idx !== -1 ? mockRanches[idx] : undefined;
      if (target) target.approvalStatus = status;
      return res.json({ success: true });
    }
    const ranch = await prisma.ranch.update({
      where: { id: req.params.id as string },
      data: { approvalStatus: status }
    });
    res.json(ranch);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.post('/admin/approvals/tank/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    if (req.user!.id.startsWith('mock-')) {
      const idx = mockTanks.findIndex(t => t.id === req.params.id);
      const targetTank = idx !== -1 ? mockTanks[idx] : undefined;
      if (targetTank) targetTank.approvalStatus = status;
      return res.json({ success: true });
    }
    const tank = await prisma.tankSetup.update({
      where: { id: req.params.id as string },
      data: { approvalStatus: status }
    });
    res.json(tank);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});
router.post('/admin/products', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description, price, imageUrl } = req.body;
    const newProd = {
      id: `prod-${Date.now()}`,
      name: (name || '').trim(),
      description: (description || '').trim(),
      price: parseFloat(price) || 0,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString()
    };
    mockProducts.unshift(newProd);
    saveStore();

    try {
      await prisma.product.create({
        data: { name: newProd.name, description: newProd.description, price: newProd.price, imageUrl: newProd.imageUrl }
      });
    } catch (dbErr) {
      console.warn('[DB Warning] Product create fallback to mock:', (dbErr as any).message);
    }

    addAuditLog({
      action: 'PRODUCT_CREATED',
      details: `New storefront product added: ${newProd.name} ($${newProd.price})`,
      actor: req.user?.email || 'admin@renu.com',
      category: 'SYSTEM'
    });

    res.json(newProd);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.put('/admin/products/:id', async (req: AuthenticatedRequest, res) => {
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
      actor: req.user?.email || 'admin@renu.com',
      category: 'SYSTEM'
    });

    res.json({ success: true, product: mockProducts[idx] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product price' });
  }
});

router.delete('/admin/products/:id', async (req: AuthenticatedRequest, res) => {
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


router.get('/admin/settings', async (req: AuthenticatedRequest, res) => {
  res.json(mockPlatformSettings);
});

router.post('/admin/settings', async (req: AuthenticatedRequest, res) => {
  try {
    Object.assign(mockPlatformSettings, req.body);
    addAuditLog({
      action: 'SETTINGS_UPDATED',
      details: `Global platform settings modified (Maintenance: ${mockPlatformSettings.maintenanceMode ? 'ON' : 'OFF'}, 2FA: ${mockPlatformSettings.require2FAForAdmin ? 'ON' : 'OFF'})`,
      actor: req.user?.email || 'admin@renu.com',
      category: 'SYSTEM'
    });
    res.json({ success: true, settings: mockPlatformSettings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update platform settings' });
  }
});

router.get('/admin/audit-logs', async (req: AuthenticatedRequest, res) => {
  res.json(mockAuditLogs);
});

router.post('/admin/reset-cache', async (req: AuthenticatedRequest, res) => {
  addAuditLog({
    action: 'CACHE_PURGED',
    details: 'System memory cache cleared and re-synced',
    actor: req.user?.email || 'admin@renu.com',
    category: 'SYSTEM'
  });
  res.json({ success: true, message: 'System cache cleared and synchronized' });
});

export default router;
