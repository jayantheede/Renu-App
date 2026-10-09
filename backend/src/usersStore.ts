import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// -----------------------------------------------------------------------
// File-based persistence — survives process restarts when MongoDB is down
// -----------------------------------------------------------------------
const STORE_PATH = path.join(__dirname, '..', 'data_store.json');

function loadStore(): Record<string, any> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Persist] Could not load data_store.json, starting fresh:', (e as any).message);
  }
  return {};
}

export function saveStore() {
  const data = {
    users: mockUsers,
    ranches: mockRanches,
    tanks: mockTanks,
    orders: mockOrdersList,
    invoices: mockInvoices,
    tasks: mockTasks,
    labResults: mockLabResults,
    notifications: mockNotifications,
    products: mockProducts,
    platformSettings: mockPlatformSettings,
  };
  const payload = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(STORE_PATH, payload, 'utf-8');
  } catch (e: any) {
    console.warn('[Persist] Could not save data_store.json:', e.message);
  }

  // Also sync to MongoDB Atlas so Render and Local always share identical data
  prisma.appDataStore.upsert({
    where: { key: 'main_store' },
    update: { payload },
    create: { key: 'main_store', payload }
  }).catch((err: any) => {
    // Non-fatal if offline
  });
}

export async function syncStoreFromDB(): Promise<void> {
  try {
    const record = await prisma.appDataStore.findUnique({ where: { key: 'main_store' } });
    if (record && record.payload) {
      const data = JSON.parse(record.payload);
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          const idx = mockUsers.findIndex(m => m.id === u.id || m.email.toLowerCase() === u.email.toLowerCase());
          if (idx >= 0) {
            mockUsers[idx] = { ...mockUsers[idx], ...u };
          } else {
            mockUsers.push(u);
          }
        }
      }
      if (Array.isArray(data.ranches) && data.ranches.length > 0) {
        mockRanches.length = 0;
        mockRanches.push(...data.ranches);
      }
      if (Array.isArray(data.tanks) && data.tanks.length > 0) {
        mockTanks.length = 0;
        mockTanks.push(...data.tanks);
      }
      if (Array.isArray(data.orders)) {
        mockOrdersList.length = 0;
        mockOrdersList.push(...data.orders);
      }
      if (Array.isArray(data.invoices)) {
        mockInvoices.length = 0;
        mockInvoices.push(...data.invoices);
      }
      if (Array.isArray(data.tasks)) {
        mockTasks.length = 0;
        mockTasks.push(...data.tasks);
      }
      if (Array.isArray(data.labResults)) {
        mockLabResults.length = 0;
        mockLabResults.push(...data.labResults);
      }
      if (Array.isArray(data.notifications)) {
        mockNotifications.length = 0;
        mockNotifications.push(...data.notifications);
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        mockProducts.length = 0;
        mockProducts.push(...data.products);
      }
      if (data.platformSettings) {
        Object.assign(mockPlatformSettings, data.platformSettings);
      }
      console.log('[Persist] Synced state from MongoDB Atlas successfully!');
    }
  } catch (err: any) {
    console.warn('[Persist] MongoDB sync warning:', err.message);
  }
}


// Load persisted data on startup (populated into arrays after they are defined)
const _persistedStore = loadStore();

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  avatarUrl?: string;
  harvestStages?: string[]; // 'Pre Harvest', 'Harvest', 'Post Harvest'
  assignedEmpEmail?: string;
  createdAt: string;
}

export interface RanchItem {
  id: string;
  entId?: string;
  name: string;
  county: string;
  ac: number;
  approvalStatus: string;
  customerId?: string;
  customerEmail?: string;
  entity?: { name: string };
  imageUrl?: string;
  hidden?: boolean;
  assignedEmpEmail?: string;
  pinX?: number; // 0-100% position on map
  pinY?: number; // 0-100% position on map
  tankSetups?: any[];
}

export interface TankItem {
  id: string;
  ranchId: string;
  capacity: number;
  location?: string;
  approvalStatus: string;
  currentLevelGal?: number;
  pinX?: number;
  pinY?: number;
  ranch?: any;
}

export interface OrderItem {
  id: string;
  orderId: string;
  customerEmail: string;
  product: string;
  qty: string;
  amt: number;
  status: 'PENDING' | 'ACCEPTED' | 'AWAITING_PAYMENT' | 'PAID' | 'DISPATCHED' | 'DELIVERED';
  date: string;
  paymentEmailSent?: boolean;
  trackingStep?: number; // 1: Order Placed, 2: Accepted & Payment Link Sent, 3: Paid & Blending, 4: In Transit, 5: Delivered
  trackingTimeline?: Array<{ title: string; desc: string; date: string; done: boolean }>;
  invoiceId?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerEmail: string;
  amount: number;
  status: 'PAID' | 'PENDING';
  date: string;
  product: string;
  qty: string;
  pdfUrl?: string;
}

export interface EmployeeTask {
  id: string;
  title: string;
  description: string;
  assignedToEmail: string;
  growerName?: string;
  ranchName?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface LabResult {
  id: string;
  ranchId: string;
  ranchName: string;
  growerEmail: string;
  pH: number;
  nitrogenPPM: number;
  moisturePercent: number;
  microbialScore: number;
  notes: string;
  recordedBy: string;
  date: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'TASK' | 'LAB' | 'RANCH';
  timestamp: string;
  read: boolean;
}


// Seed data — will be overwritten by persisted data if data_store.json exists
export const mockUsers: AppUser[] = [
  {
    id: 'mock-admin',
    email: 'admin@renu.com',
    password: 'admin',
    name: 'Admin Demo',
    role: 'admin',
    approvalStatus: 'APPROVED',
    avatarUrl: '',
    createdAt: new Date('2026-01-01T00:00:00Z').toISOString(),
  },
  {
    id: 'mock-emp',
    email: 'employee@renu.com',
    password: 'employee',
    name: 'Employee Demo',
    role: 'employee',
    approvalStatus: 'APPROVED',
    avatarUrl: '',
    createdAt: new Date('2026-01-02T00:00:00Z').toISOString(),
  },
  {
    id: 'mock-cust',
    email: 'customer@renu.com',
    password: 'customer',
    name: 'Customer Demo',
    role: 'Grower',
    approvalStatus: 'APPROVED',
    avatarUrl: '',
    createdAt: new Date('2026-01-03T00:00:00Z').toISOString(),
  },
];
// Restore persisted users (keep seed mock-* accounts, merge in persisted extras)
if (_persistedStore.users && Array.isArray(_persistedStore.users)) {
  for (const u of _persistedStore.users) {
    if (!mockUsers.some(m => m.email.toLowerCase() === u.email.toLowerCase())) {
      mockUsers.push(u);
    }
  }
}

export const mockRanches: RanchItem[] = (
  _persistedStore.ranches && _persistedStore.ranches.length > 3 ? _persistedStore.ranches : undefined
) || [
  {
    id: 'mock-ranch-p1',
    entId: 'mock-entity-1',
    name: 'Sierra Foothills Ranch',
    county: 'Fresno',
    ac: 85,
    approvalStatus: 'PENDING',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    entity: { name: 'Sierra Agri Group' }
  },
  {
    id: 'mock-ranch-p2',
    entId: 'mock-entity-2',
    name: 'Central Valley Almonds',
    county: 'Kern',
    ac: 140,
    approvalStatus: 'PENDING',
    customerId: 'mock-cust-2',
    customerEmail: 'john@grower.com',
    entity: { name: 'Valley Farm Co.' }
  },
  {
    id: 'mock-ranch-1',
    entId: 'mock-entity-1',
    name: 'Valley Green Ranch',
    county: 'Fresno',
    ac: 120,
    approvalStatus: 'APPROVED',
    customerId: 'mock-cust',
    customerEmail: 'customer@renu.com',
    entity: { name: 'Demo Entity' }
  }
];

export const mockTanks: TankItem[] = (
  _persistedStore.tanks && _persistedStore.tanks.length > 2 ? _persistedStore.tanks : undefined
) || [
  {
    id: 'mock-tank-p1',
    ranchId: 'mock-ranch-p1',
    capacity: 1000,
    location: 'North Field Injection Station',
    approvalStatus: 'PENDING',
    ranch: { name: 'Sierra Foothills Ranch' }
  },
  {
    id: 'mock-tank-p2',
    ranchId: 'mock-ranch-p2',
    capacity: 500,
    location: 'South Orchard Pump 2',
    approvalStatus: 'PENDING',
    ranch: { name: 'Central Valley Almonds' }
  },
  {
    id: 'mock-tank-1',
    ranchId: 'mock-ranch-1',
    capacity: 500,
    location: 'North Field Sector 3',
    approvalStatus: 'APPROVED'
  }
];

export const mockOrdersList: OrderItem[] = (
  _persistedStore.orders && _persistedStore.orders.length > 3 ? _persistedStore.orders : undefined
) || [
  { 
    id: 'ord-1', 
    orderId: 'ORD-1099', 
    customerEmail: 'customer@renu.com', 
    product: 'Biome Care', 
    qty: '10 Gal', 
    amt: 1240, 
    status: 'PENDING', 
    date: '2026-10-08',
    paymentEmailSent: false,
    trackingStep: 1,
    trackingTimeline: [
      { title: 'Order Placed', desc: 'Received and awaiting admin acceptance', date: '2026-10-08 14:20', done: true },
      { title: 'Accepted & Payment Sent', desc: 'Awaiting customer payment', date: 'Pending', done: false },
      { title: 'Payment Confirmed', desc: 'Invoice generated & blending initiated', date: 'Pending', done: false },
      { title: 'Dispatched', desc: 'Tank delivery in transit', date: 'Pending', done: false },
      { title: 'Delivered', desc: 'Injected into ranch tank', date: 'Pending', done: false },
    ]
  },
  { 
    id: 'ord-2', 
    orderId: 'ORD-1098', 
    customerEmail: 'john@grower.com', 
    product: 'N-CARE', 
    qty: '25 Gal', 
    amt: 6250, 
    status: 'PAID', 
    date: '2026-10-07',
    paymentEmailSent: true,
    invoiceId: 'inv-1',
    trackingStep: 3,
    trackingTimeline: [
      { title: 'Order Placed', desc: 'Order received', date: '2026-10-07 09:15', done: true },
      { title: 'Accepted & Payment Sent', desc: 'Payment link delivered via email', date: '2026-10-07 10:00', done: true },
      { title: 'Payment Confirmed', desc: 'Invoice INV-2026-001 issued. Blending batch in progress.', date: '2026-10-07 11:30', done: true },
      { title: 'Dispatched', desc: 'Scheduled delivery to Valley Farm Co.', date: 'Pending', done: false },
      { title: 'Delivered', desc: 'Tank injection completed', date: 'Pending', done: false },
    ]
  },
  { 
    id: 'ord-3', 
    orderId: 'ORD-1097', 
    customerEmail: 'sarah@farms.com', 
    product: 'K-RUSH', 
    qty: '5 Gal', 
    amt: 900, 
    status: 'PENDING', 
    date: '2026-10-06',
    paymentEmailSent: false,
    trackingStep: 1,
    trackingTimeline: [
      { title: 'Order Placed', desc: 'Order received', date: '2026-10-06 16:45', done: true },
      { title: 'Accepted & Payment Sent', desc: 'Pending admin review', date: 'Pending', done: false },
      { title: 'Payment Confirmed', desc: 'Pending', date: 'Pending', done: false },
      { title: 'Dispatched', desc: 'Pending', date: 'Pending', done: false },
      { title: 'Delivered', desc: 'Pending', date: 'Pending', done: false },
    ]
  },
];

export const mockInvoices: InvoiceItem[] = (
  _persistedStore.invoices && _persistedStore.invoices.length > 0 ? _persistedStore.invoices : undefined
) || [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    orderId: 'ORD-1098',
    customerEmail: 'customer@renu.com',
    amount: 6250,
    status: 'PAID',
    date: '2026-10-07',
    product: 'N-CARE',
    qty: '25 Gal',
    pdfUrl: 'https://renubiome.com/invoices/INV-2026-001.pdf'
  }
];

export const mockTasks: EmployeeTask[] = (
  _persistedStore.tasks && _persistedStore.tasks.length > 0 ? _persistedStore.tasks : undefined
) || [
  {
    id: 'task-1',
    title: 'Soil Microbial Sample Collection',
    description: 'Collect 5-point root zone samples across North Sector for microbial assay.',
    assignedToEmail: 'employee@renu.com',
    growerName: 'Sierra Agri Group',
    ranchName: 'Sierra Foothills Ranch',
    status: 'PENDING',
    priority: 'HIGH',
    createdAt: '2026-10-09T10:00:00Z'
  },
  {
    id: 'task-2',
    title: 'Fertilizer Injection Calibration',
    description: 'Calibrate pump pressure and verify 1000 Gal tank telemetry connection.',
    assignedToEmail: 'employee@renu.com',
    growerName: 'Valley Farm Co.',
    ranchName: 'Central Valley Almonds',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    createdAt: '2026-10-08T14:30:00Z'
  },
  {
    id: 'task-3',
    title: 'Seasonal Tank Maintenance & Flush',
    description: 'Inspect seals and filter mesh on South Orchard tank station.',
    assignedToEmail: 'employee@renu.com',
    growerName: 'Valley Green Ranch',
    ranchName: 'Sector 3',
    status: 'COMPLETED',
    priority: 'LOW',
    createdAt: '2026-10-07T09:15:00Z'
  }
];

export const mockLabResults: LabResult[] = (
  _persistedStore.labResults && _persistedStore.labResults.length > 0 ? _persistedStore.labResults : undefined
) || [
  {
    id: 'lab-1',
    ranchId: 'mock-ranch-p1',
    ranchName: 'Sierra Foothills Ranch',
    growerEmail: 'customer@renu.com',
    pH: 6.8,
    nitrogenPPM: 42,
    moisturePercent: 24.5,
    microbialScore: 92,
    notes: 'Optimal mycorrhizal colonization observed. Root vitality high.',
    recordedBy: 'employee@renu.com',
    date: '2026-10-09'
  }
];

export const mockNotifications: AdminNotification[] = (
  _persistedStore.notifications && _persistedStore.notifications.length > 0 ? _persistedStore.notifications : undefined
) || [
  {
    id: 'notif-1',
    title: 'Order Payment Completed',
    message: 'Customer customer@renu.com paid $1,240 for Order #ORD-1099. Invoice #INV-2026-002 generated and emailed.',
    type: 'PAYMENT',
    timestamp: '2026-10-09T21:40:00Z',
    read: false
  },
  {
    id: 'notif-2',
    title: 'Task Completed by Employee',
    message: 'Employee employee@renu.com completed task "Seasonal Tank Maintenance & Flush".',
    type: 'TASK',
    timestamp: '2026-10-09T20:15:00Z',
    read: false
  }
];

export function addAdminNotification(notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) {
  mockNotifications.unshift({
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...notif
  });
  saveStore();
}


export interface PlatformSettings {
  maintenanceMode: boolean;
  emailNotifications: boolean;
  orderAutoApprove: boolean;
  autoApproveLimit: number;
  lowTankAlertLevel: number;
  require2FAForAdmin: boolean;
  systemVersion: string;
}

export const mockPlatformSettings: PlatformSettings = {
  maintenanceMode: false,
  emailNotifications: true,
  orderAutoApprove: false,
  autoApproveLimit: 500,
  lowTankAlertLevel: 15,
  require2FAForAdmin: true,
  systemVersion: 'v2.4.0-production'
};

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  actor: string;
  category: 'SECURITY' | 'ORDERS' | 'RANCHES' | 'USERS' | 'SYSTEM';
  timestamp: string;
}

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    action: 'ORDER_ACCEPTED',
    details: 'Order #ORD-1098 ($6,250) approved and scheduled for delivery',
    actor: 'admin@renu.com',
    category: 'ORDERS',
    timestamp: '2026-10-09T18:24:00Z'
  },
  {
    id: 'log-2',
    action: 'USER_REGISTERED',
    details: 'New Grower account verified for customer@renu.com',
    actor: 'system',
    category: 'USERS',
    timestamp: '2026-10-09T16:12:00Z'
  },
  {
    id: 'log-3',
    action: 'RANCH_SUBMITTED',
    details: 'Sierra Foothills Ranch (85 ac) submitted for approval',
    actor: 'customer@renu.com',
    category: 'RANCHES',
    timestamp: '2026-10-09T14:45:00Z'
  },
  {
    id: 'log-4',
    action: 'SECURITY_CHECK',
    details: 'Admin session authenticated via SHA256 token verification',
    actor: 'admin@renu.com',
    category: 'SECURITY',
    timestamp: '2026-10-09T12:00:00Z'
  },
  {
    id: 'log-5',
    action: 'DATABASE_BACKUP',
    details: 'Automated snapshot backup completed successfully (24 records)',
    actor: 'system',
    category: 'SYSTEM',
    timestamp: '2026-10-09T08:00:00Z'
  }
];

export function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  mockAuditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry
  });
  // Audit logs are transient - not persisted to keep file size manageable
}


export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const normalized = email.trim().toLowerCase();
  const mock = mockUsers.find(u => u.email.toLowerCase() === normalized);
  if (mock) return mock;

  try {
    const dbUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (dbUser) {
      return {
        id: dbUser.id,
        email: dbUser.email,
        passwordHash: dbUser.passwordHash,
        name: dbUser.name,
        role: dbUser.role,
        approvalStatus: 'APPROVED',
        avatarUrl: dbUser.avatarUrl || '',
        createdAt: dbUser.createdAt ? new Date(dbUser.createdAt).toISOString() : new Date().toISOString()
      };
    }
  } catch (err: any) {
    console.warn('[DB Error] findUserByEmail fallback:', err.message);
  }

  return null;
}

export async function createNewUser(params: {
  email: string;
  password?: string;
  name?: string;
  role?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  harvestStages?: string[];
  assignedEmpEmail?: string;
}): Promise<AppUser> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const password = params.password || 'Customer123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name: string = (params.name && params.name.trim()) || normalizedEmail.split('@')[0] || 'User';
  const role: string = params.role || 'Grower';
  const approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = params.approvalStatus || 'PENDING';
  const harvestStages: string[] = params.harvestStages || ['Pre Harvest', 'Harvest', 'Post Harvest'];

  let userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  let createdAt = new Date().toISOString();

  try {
    const dbUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashedPassword,
        name,
        role
      }
    });
    if (dbUser?.id) {
      userId = dbUser.id;
      createdAt = new Date(dbUser.createdAt).toISOString();
      console.log(`[DB] Created user in MongoDB: ${normalizedEmail}`);
    }
  } catch (err: any) {
    console.warn(`[DB Warning] MongoDB insert skipped (${err.message}). Stored in persistent app memory.`);
  }

  const newUser: AppUser = {
    id: userId,
    email: normalizedEmail,
    password,
    passwordHash: hashedPassword,
    name,
    role,
    approvalStatus,
    avatarUrl: '',
    harvestStages,
    assignedEmpEmail: params.assignedEmpEmail || '',
    createdAt
  };

  const existingIdx = mockUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
  if (existingIdx >= 0) {
    mockUsers[existingIdx] = newUser;
  } else {
    mockUsers.unshift(newUser);
  }

  // Also create a pending ranch for this customer so it immediately shows up in admin pending approvals
  const existingRanch = mockRanches.find(r => r.customerId === userId || r.customerEmail === normalizedEmail);
  if (!existingRanch) {
    mockRanches.unshift({
      id: `ranch-${Date.now()}`,
      entId: 'mock-entity-1',
      name: `${name}'s Ranch`,
      county: 'Fresno',
      ac: 45,
      approvalStatus: 'PENDING',
      customerId: userId,
      customerEmail: normalizedEmail,
      imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400',
      pinX: 45,
      pinY: 40,
      entity: { name: `${name}'s Farm` }
    });
  }

  saveStore();
  return newUser;
}

export function updateCustomerApprovalStatus(id: string, status: 'APPROVED' | 'REJECTED'): AppUser | null {
  const user = mockUsers.find(u => u.id === id);
  if (user) {
    user.approvalStatus = status;
    // If approving customer, approve their ranches as well
    if (status === 'APPROVED') {
      mockRanches
        .filter(r => r.customerId === id || r.customerEmail === user.email)
        .forEach(r => { r.approvalStatus = 'APPROVED'; });
    }
    saveStore();
    return user;
  }
  return null;
}

export async function updateCustomerDetails(id: string, updates: {
  name?: string;
  email?: string;
  role?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  password?: string;
  harvestStages?: string[];
  assignedEmpEmail?: string;
}) {
  const normalizedEmail = updates.email ? updates.email.trim().toLowerCase() : undefined;
  let found = mockUsers.find(u => u.id === id || (normalizedEmail && u.email.toLowerCase() === normalizedEmail));
  if (found) {
    if (updates.name) found.name = updates.name.trim();
    if (updates.email) found.email = updates.email.trim().toLowerCase();
    if (updates.role) found.role = updates.role;
    if (updates.approvalStatus) found.approvalStatus = updates.approvalStatus;
    if (updates.harvestStages) found.harvestStages = updates.harvestStages;
    if (updates.assignedEmpEmail !== undefined) found.assignedEmpEmail = updates.assignedEmpEmail;
    if (updates.password) {
      found.passwordHash = await bcrypt.hash(updates.password, 10);
    }
    return found;
  }

  if (!id.startsWith('mock-')) {
    try {
      const data: any = {};
      if (updates.name) data.name = updates.name.trim();
      if (updates.email) data.email = updates.email.trim().toLowerCase();
      if (updates.role) data.role = updates.role;
      if (updates.password) {
        data.passwordHash = await bcrypt.hash(updates.password, 10);
      }
      const updatedDb = await prisma.user.update({
        where: { id },
        data
      });
      return updatedDb;
    } catch (err: any) {
      console.warn('[DB Error] updateCustomerDetails fallback:', err.message);
    }
  }

  return null;
}

// Order & Invoice Lifecycle Helpers
export function acceptOrderAndSendPaymentEmail(orderId: string) {
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return null;

  order.status = 'AWAITING_PAYMENT';
  order.paymentEmailSent = true;
  order.trackingStep = 2;
  if (!order.trackingTimeline) {
    order.trackingTimeline = [
      { title: 'Order Placed', desc: 'Order received', date: order.date, done: true },
      { title: 'Accepted & Payment Sent', desc: `Payment invoice request emailed to ${order.customerEmail}`, date: new Date().toISOString().replace('T', ' ').substring(0, 16), done: true },
      { title: 'Payment Confirmed', desc: 'Awaiting customer payment', date: 'Pending', done: false },
      { title: 'Dispatched', desc: 'In transit to ranch', date: 'Pending', done: false },
      { title: 'Delivered', desc: 'Delivered to injection tank', date: 'Pending', done: false },
    ];
  } else {
    order.trackingTimeline[1] = { title: 'Accepted & Payment Sent', desc: `Payment invoice request emailed to ${order.customerEmail}`, date: new Date().toISOString().replace('T', ' ').substring(0, 16), done: true };
  }

  addAdminNotification({
    title: 'Payment Request Emailed',
    message: `Order #${order.orderId} accepted. Invoice & secure payment link delivered to ${order.customerEmail}.`,
    type: 'ORDER'
  });

  addAuditLog({
    action: 'ORDER_PAYMENT_REQUESTED',
    details: `Order #${order.orderId} accepted and payment invoice request delivered to ${order.customerEmail}`,
    actor: 'admin@renu.com',
    category: 'ORDERS'
  });

  return order;
}

export function payOrderAndGenerateInvoice(orderId: string) {
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return null;

  order.status = 'PAID';
  order.trackingStep = 3;

  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const invoiceId = `inv-${Date.now()}`;
  order.invoiceId = invoiceId;

  const newInvoice: InvoiceItem = {
    id: invoiceId,
    invoiceNumber,
    orderId: order.orderId,
    customerEmail: order.customerEmail,
    amount: order.amt,
    status: 'PAID',
    date: new Date().toISOString().split('T')[0] || '2026-10-09',
    product: order.product,
    qty: order.qty,
    pdfUrl: `https://renubiome.com/invoices/${invoiceNumber}.pdf`
  };

  mockInvoices.unshift(newInvoice);

  if (order.trackingTimeline && order.trackingTimeline.length >= 3) {
    order.trackingTimeline[2] = {
      title: 'Payment Confirmed',
      desc: `Invoice #${invoiceNumber} issued ($${order.amt.toLocaleString()}). Biome batch scheduled for blending.`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      done: true
    };
  }

  addAdminNotification({
    title: 'Payment Received & Invoice Issued',
    message: `Payment of $${order.amt.toLocaleString()} received for #${order.orderId}. Invoice #${invoiceNumber} generated & emailed.`,
    type: 'PAYMENT'
  });

  addAuditLog({
    action: 'INVOICE_GENERATED',
    details: `Invoice #${invoiceNumber} ($${order.amt}) generated for Order #${order.orderId} and emailed to ${order.customerEmail}`,
    actor: order.customerEmail,
    category: 'ORDERS'
  });

  saveStore();
  return { order, invoice: newInvoice };
}

export function updateOrderTracking(orderId: string, status: OrderItem['status'], step: number) {
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return null;

  order.status = status;
  order.trackingStep = step;

  const timelineItem = order.trackingTimeline ? order.trackingTimeline[step - 1] : undefined;
  if (timelineItem) {
    timelineItem.done = true;
    timelineItem.date = new Date().toISOString().replace('T', ' ').substring(0, 16);
  }

  addAuditLog({
    action: 'ORDER_TRACKING_UPDATED',
    details: `Order #${order.orderId} updated to ${status} (Step ${step})`,
    actor: 'admin@renu.com',
    category: 'ORDERS'
  });

  saveStore();
  return order;
}

// Task & Employee Helpers
export function updateTaskStatus(taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED', empEmail?: string) {
  const task = mockTasks.find(t => t.id === taskId);
  if (!task) return null;

  task.status = status;

  if (status === 'COMPLETED') {
    addAdminNotification({
      title: 'Employee Task Completed',
      message: `Task "${task.title}" has been completed by ${empEmail || task.assignedToEmail}.`,
      type: 'TASK'
    });
  }

  addAuditLog({
    action: `TASK_${status}`,
    details: `Task "${task.title}" status changed to ${status}`,
    actor: empEmail || task.assignedToEmail,
    category: 'SYSTEM'
  });

  saveStore();
  return task;
}

export function createEmployeeTask(data: Partial<EmployeeTask>) {
  const newTask: EmployeeTask = {
    id: `task-${Date.now()}`,
    title: data.title || 'Agronomy Field Task',
    description: data.description || '',
    assignedToEmail: data.assignedToEmail || 'employee@renu.com',
    growerName: data.growerName || 'Assigned Grower',
    ranchName: data.ranchName || 'Main Ranch',
    status: data.status || 'PENDING',
    priority: data.priority || 'MEDIUM',
    createdAt: new Date().toISOString()
  };

  mockTasks.unshift(newTask);

  addAdminNotification({
    title: 'New Task Assigned',
    message: `Task "${newTask.title}" assigned to ${newTask.assignedToEmail}.`,
    type: 'TASK'
  });

  saveStore();
  return newTask;
}

// Lab Results Helpers
export function addLabResult(data: Partial<LabResult>) {
  const newLab: LabResult = {
    id: `lab-${Date.now()}`,
    ranchId: data.ranchId || 'mock-ranch-1',
    ranchName: data.ranchName || 'Assigned Ranch',
    growerEmail: data.growerEmail || 'customer@renu.com',
    pH: Number(data.pH) || 6.8,
    nitrogenPPM: Number(data.nitrogenPPM) || 35,
    moisturePercent: Number(data.moisturePercent) || 20,
    microbialScore: Number(data.microbialScore) || 85,
    notes: data.notes || '',
    recordedBy: data.recordedBy || 'employee@renu.com',
    date: data.date || new Date().toISOString().split('T')[0] || '2026-10-09'
  };

  mockLabResults.unshift(newLab);

  addAdminNotification({
    title: 'Lab Assay Results Submitted',
    message: `Agronomy lab results recorded for ${newLab.ranchName} by ${newLab.recordedBy}. pH: ${newLab.pH}, Microbial Score: ${newLab.microbialScore}.`,
    type: 'LAB'
  });

  addAuditLog({
    action: 'LAB_RESULTS_POSTED',
    details: `Lab results recorded for ${newLab.ranchName} (pH: ${newLab.pH}, Score: ${newLab.microbialScore})`,
    actor: newLab.recordedBy,
    category: 'RANCHES'
  });

  saveStore();
  return newLab;
}

// Ranch Visibility & Coordinates
export function toggleRanchHidden(ranchId: string, hidden: boolean) {
  const ranch = mockRanches.find(r => r.id === ranchId);
  if (ranch) {
    ranch.hidden = hidden;
    addAuditLog({
      action: hidden ? 'RANCH_HIDDEN' : 'RANCH_UNHIDDEN',
      details: `Ranch "${ranch.name}" visibility set to ${hidden ? 'Hidden' : 'Visible'}`,
      actor: 'employee@renu.com',
      category: 'RANCHES'
    });
    saveStore();
    return ranch;
  }
  return null;
}

export function assignGrowerToEmployee(customerId: string, employeeEmail: string) {
  const customer = mockUsers.find(u => u.id === customerId || u.email.toLowerCase() === customerId.toLowerCase());
  if (customer) {
    customer.assignedEmpEmail = employeeEmail;
    // Also assign all ranches owned by customer
    mockRanches
      .filter(r => r.customerId === customer.id || r.customerEmail?.toLowerCase() === customer.email.toLowerCase())
      .forEach(r => { r.assignedEmpEmail = employeeEmail; });

    addAdminNotification({
      title: 'Grower Assigned to Employee',
      message: `${customer.name} (${customer.email}) assigned to agronomist ${employeeEmail}.`,
      type: 'TASK'
    });

    addAuditLog({
      action: 'GROWER_ASSIGNED',
      details: `${customer.name} assigned to employee ${employeeEmail}`,
      actor: 'admin@renu.com',
      category: 'USERS'
    });

    saveStore();
    return customer;
  }
  return null;
}



export async function getAllCustomersList() {
  const usersMap = new Map<string, any>();

  // Add all mock users
  for (const u of mockUsers) {
    usersMap.set(u.email.toLowerCase(), {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      approvalStatus: u.approvalStatus || 'APPROVED',
      avatarUrl: u.avatarUrl || '',
      createdAt: u.createdAt,
      user_metadata: {
        full_name: u.name,
        role: u.role,
        approvalStatus: u.approvalStatus || 'APPROVED'
      }
    });
  }

  // Attempt to load from MongoDB
  try {
    const dbUsers = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    for (const u of dbUsers) {
      if (!usersMap.has(u.email.toLowerCase())) {
        usersMap.set(u.email.toLowerCase(), {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          approvalStatus: 'APPROVED',
          avatarUrl: u.avatarUrl || '',
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          user_metadata: {
            full_name: u.name,
            role: u.role,
            approvalStatus: 'APPROVED'
          }
        });
      }
    }
  } catch (err: any) {
    console.warn('[DB Warning] getAllCustomersList Prisma query fallback:', err.message);
  }

  return Array.from(usersMap.values());
}

export interface ProductItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  createdAt?: string;
}

export const mockProducts: ProductItem[] = (
  _persistedStore.products && _persistedStore.products.length > 4 ? _persistedStore.products : undefined
) || [
  { id: 'prod-1', name: 'Biome Care', description: 'Advanced bio-stimulant promoting beneficial fungal and microbial root flora.', price: 124.00, imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=300' },
  { id: 'prod-2', name: 'N-CARE', description: 'Green nitrification inhibitor that extends nitrogen shelf life and reduces leaching.', price: 250.00, imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=300' },
  { id: 'prod-3', name: 'K-RUSH', description: 'Specialized formula for frost prevention and enhancing fruit quality.', price: 180.00, imageUrl: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?w=300' },
  { id: 'prod-4', name: 'Bee Bloom', description: 'Pheromone blend to promote bee health and optimize pollination.', price: 85.00, imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300' }
];

