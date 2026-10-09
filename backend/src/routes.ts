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
import { mockRanches, mockTanks, mockUsers, updateCustomerApprovalStatus } from './usersStore';

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
      return res.json(newTank);
    }

    const tank = await prisma.tankSetup.create({
      data: { ranchId, capacity, location, approvalStatus: 'PENDING' }
    });
    res.json(tank);
  } catch(e) { res.status(500).json({ error: 'Failed to create tank setup' }); }
});

router.get('/orders', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) return res.json([]);
  try {
    const orders = await prisma.order.findMany();
    res.json(orders);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/invoices', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) return res.json([]);
  try {
    const invoices = await prisma.invoice.findMany({ include: { entity: true } });
    res.json(invoices);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/messages', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) return res.json([]);
  try {
    const messages = await prisma.message.findMany();
    res.json(messages);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/products', async (req: AuthenticatedRequest, res) => {
  if (req.user!.id.startsWith('mock-')) {
    return res.json([
      { id: 'prod-1', name: 'Biome Care', description: 'Fermentation-based liquid designed to improve soil health and water-holding capacity.', price: 120.00, imageUrl: 'https://via.placeholder.com/150/15803D/FFFFFF?text=Biome+Care' },
      { id: 'prod-2', name: 'N-CARE', description: 'Green nitrification inhibitor that extends nitrogen shelf life by up to 8 weeks and reduces leaching.', price: 250.00, imageUrl: 'https://via.placeholder.com/150/10B981/FFFFFF?text=N-CARE' },
      { id: 'prod-3', name: 'K-RUSH', description: 'Specialized formula for frost prevention and enhancing fruit quality.', price: 180.00, imageUrl: 'https://via.placeholder.com/150/FACC15/000000?text=K-RUSH' },
      { id: 'prod-4', name: 'Bee Bloom', description: 'Pheromone blend to promote bee health and optimize pollination.', price: 85.00, imageUrl: 'https://via.placeholder.com/150/F59E0B/000000?text=Bee+Bloom' }
    ]);
  }
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// ---------------------------------
// Admin Approvals Routes
// ---------------------------------
router.get('/admin/approvals', async (req: AuthenticatedRequest, res) => {
  const pendingCustomers = mockUsers.filter(u => u.approvalStatus === 'PENDING').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    approvalStatus: u.approvalStatus,
    createdAt: u.createdAt
  }));

  if (req.user!.id.startsWith('mock-')) {
    const pendingRanches = mockRanches.filter(r => r.approvalStatus === 'PENDING').map(r => ({ ...r, entity: r.entity || { name: 'Demo Entity' } }));
    const pendingTanks = mockTanks.filter(t => t.approvalStatus === 'PENDING').map(t => ({ ...t, ranch: mockRanches.find(r => r.id === t.ranchId) || { name: 'Demo Ranch' } }));
    return res.json({ customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks });
  }
  try {
    const pendingRanches = await prisma.ranch.findMany({ where: { approvalStatus: 'PENDING' }, include: { entity: true } });
    const pendingTanks = await prisma.tankSetup.findMany({ where: { approvalStatus: 'PENDING' }, include: { ranch: true } });
    res.json({ customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks });
  } catch (error) { 
    // Fallback to in-memory on DB errors
    const pendingRanches = mockRanches.filter(r => r.approvalStatus === 'PENDING').map(r => ({ ...r, entity: r.entity || { name: 'Demo Entity' } }));
    const pendingTanks = mockTanks.filter(t => t.approvalStatus === 'PENDING').map(t => ({ ...t, ranch: mockRanches.find(r => r.id === t.ranchId) || { name: 'Demo Ranch' } }));
    res.json({ customers: pendingCustomers, ranches: pendingRanches, tanks: pendingTanks }); 
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
    const product = await prisma.product.create({
      data: { name, description, price: parseFloat(price), imageUrl }
    });
    res.json(product);
  } catch (error) { res.status(500).json({ error: 'Failed to add product' }); }
});

export default router;
