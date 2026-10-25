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
    programs: mockPrograms,
    samples: mockSamples,
    featureFlags: mockFeatureFlags,
    platformSettings: mockPlatformSettings,
  };
  const payload = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(STORE_PATH, payload, 'utf-8');
  } catch (e: any) {
    console.warn('[Persist] Could not save data_store.json:', e.message);
  }

  // Also sync to MongoDB Atlas if connected
  prisma.appDataStore.upsert({
    where: { key: 'main_store' },
    update: { payload },
    create: { key: 'main_store', payload }
  }).catch(() => {
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
      // Only sync ranches if DB payload has blocks!
      if (Array.isArray(data.ranches) && data.ranches.some((r: any) => Array.isArray(r.blocks) && r.blocks.length > 0)) {
        mockRanches.length = 0;
        mockRanches.push(...data.ranches.map((r: any) => ({
          ...r,
          blocks: r.blocks || [],
          tanks: r.tanks || r.tankSetups || [],
          tankSetups: r.tanks || r.tankSetups || [],
          ac: (r.blocks || []).reduce((s: number, b: any) => s + (Number(b.acreage) || 0), 0)
        })));
      } else {
        saveStore();
      }

      if (Array.isArray(data.tanks) && data.tanks.length > 0) {
        mockTanks.length = 0;
        mockTanks.push(...data.tanks);
      }

      // Only sync orders if DB payload has modern DEL-101 schema
      if (Array.isArray(data.orders) && data.orders.some((o: any) => o.orderId === 'DEL-101')) {
        mockOrdersList.length = 0;
        mockOrdersList.push(...data.orders);
      } else {
        saveStore();
      }

      // Only sync invoices if DB payload has modern INV-2026-004 schema
      if (Array.isArray(data.invoices) && data.invoices.some((i: any) => i.invoiceNumber === 'INV-2026-004')) {
        mockInvoices.length = 0;
        mockInvoices.push(...data.invoices);
      } else {
        saveStore();
      }

      if (Array.isArray(data.products) && data.products.length >= 4) {
        mockProducts.length = 0;
        mockProducts.push(...data.products);
      }

      if (Array.isArray(data.programs)) {
        mockPrograms.length = 0;
        mockPrograms.push(...data.programs);
      }

      if (Array.isArray(data.samples)) {
        mockSamples.length = 0;
        mockSamples.push(...data.samples);
      }

      if (data.featureFlags) {
        Object.assign(mockFeatureFlags, data.featureFlags);
      }
      if (data.platformSettings) {
        Object.assign(mockPlatformSettings, data.platformSettings);
      }
    } else {
      saveStore();
    }
  } catch (err: any) {
    // Non-fatal if offline
  }
}

// Load persisted data on startup
const _persistedStore = loadStore();

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: string;
  phone?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  avatarUrl?: string;
  quickbooksCustomerId?: string;
  harvestStages?: string[];
  assignedEmpEmail?: string;
  mfaEnabled?: boolean;
  createdAt: string;
}

export interface BlockItem {
  id: string;
  blockId: string; // e.g. "N-4"
  ranchId: string;
  crop: string;
  variety: string;
  rootstock: string;
  acreage: number;
  plantingYear: number;
  irrigationType: string;
  fertigationSet: string;
  county: string;
  apns: string[];
  createdAt?: string;
}

export interface TankItem {
  id: string;
  ranchId: string;
  name: string;
  capacity: number;
  location: string;
  level?: string;
  pressure?: string;
  approvalStatus: string;
  ranch?: { name: string };
  otodataDeviceId?: string;
  levelPercent?: number;
  levelGallons?: number;
  weeklyUsageAvg?: number;
  daysToEmpty?: number;
  reorderThresholdPercent?: number;
  lastReadingTime?: string;
  status?: string;
}

export interface RanchItem {
  id: string;
  customerId?: string;
  customerEmail?: string;
  name: string;
  county: string;
  ac?: number; // Computed acreage = sum of its blocks
  approvalStatus: string;
  blocks: BlockItem[];
  tanks: TankItem[];
  tankSetups?: TankItem[]; // Alias for backward compatibility
  assignedEmpEmail?: string;
  hidden?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string; // e.g. "DEL-1041"
  customerId: string;
  customerEmail: string;
  customerName?: string;
  product: string;
  productName?: string;
  gallons: number;
  deliveredGallons?: number;
  deliveredDate?: string;
  ranchId: string;
  ranchName?: string;
  tankId: string;
  tankName?: string;
  blockIds: string[];
  deliveryWindow: string; // e.g. "2026-10-14 to 2026-10-15 (Morning)"
  gateCode?: string;
  contactOnArrival?: string;
  whoToCall?: string;
  notes?: string;
  status: 'Scheduled' | 'Out for delivery' | 'Delivered' | 'Cancelled';
  cancelReason?: string;
  invoiceId?: string;
  optimoRouteOrderId?: string;
  driverName?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  completedTime?: string;
  programId?: string;
  programName?: string;
  lbN?: number;
  lbK2O?: number;
  date: string;
  timeline: Array<{ stage: string; date: string; done: boolean }>;
  historical?: boolean;
  // Compatibility fields
  qty?: string;
  amt?: number;
  paymentEmailSent?: boolean;
  trackingStep?: number;
  trackingTimeline?: any[];
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  customerId: string;
  customerEmail: string;
  customerName?: string;
  deliveryId?: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: 'Open' | 'Overdue' | 'Paid' | 'Void';
  paidDate?: string;
  pdfData?: string;
  pdfFileName?: string;
  pdfUrl?: string;
  quickbooksInvoiceId?: string;
  product?: string;
  gallons?: number;
  blockIds?: string[];
}

export interface ProductItem {
  id: string;
  name: string;
  brandLabel?: string;
  description: string;
  analysis?: string;
  lbPerGal?: number;
  percentN?: number;
  percentP2O5?: number;
  percentK2O?: number;
  percentCa?: number;
  percentB?: number;
  percentZn?: number;
  countsTowardN?: boolean;
  omriCertified?: boolean;
  omriListed?: boolean;
  imageUrl?: string;
  createdAt?: string;
  price?: number; // Kept as optional for compatibility with legacy tests
}

export interface FeatureFlagsMap {
  ordering: boolean;
  payments: boolean;
  recommendations: boolean;
  labResults: boolean;
  documents: boolean;
  compliance: boolean;
  messaging: boolean;
  staffTasks: boolean;
  optimoroute: boolean;
  telemetry: boolean;
  quickbooks: boolean;
  map: boolean;
}

export interface FeatureFlagsConfig {
  global: FeatureFlagsMap;
  customerOverrides: Record<string, Partial<FeatureFlagsMap>>;
}

export interface ProgramLineItem {
  id: string;
  productId: string;
  productName: string;
  stageName: string;
  ratePerAcre: number;
  applicationsCount: number;
  plannedGallons: number;
  deliveredGallons: number;
  timingNote?: string;
  status?: 'Planned' | 'Active' | 'Completed';
}

export interface NutritionProgram {
  id: string;
  name: string;
  crop: string;
  seasonYear: number;
  ranchId: string;
  ranchName?: string;
  blocksCovered: string[];
  totalAcreage: number;
  targetN: number;
  targetK2O: number;
  nLossFactor: number;
  status: 'Planned' | 'Active' | 'Complete';
  stageWindow: string;
  notes?: string;
  lines: ProgramLineItem[];
  createdAt: string;
}

export interface LabSample {
  id: string;
  ranchId: string;
  ranchName: string;
  blockId: string;
  customerId: string;
  customerEmail: string;
  sampleType: 'soil' | 'leaf tissue' | 'petiole' | 'irrigation water';
  sampleDate: string;
  labName: string;
  status: 'Received' | 'Under review' | 'Recommended';
  customerNotes?: string;
  pdfData?: string;
  pdfFileName?: string;
  pdfUrl?: string;
  values?: Record<string, number>;
  recommendation?: {
    id: string;
    summary: string;
    sentDate: string;
    lines: Array<{
      productName: string;
      ratePerAcre: number;
      timing: string;
      blocks: string[];
    }>;
    savedAsProgram?: boolean;
    customerReplies?: Array<{
      question: string;
      date: string;
      reply?: string;
    }>;
  };
  createdAt: string;
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
  type: 'ORDER' | 'PAYMENT' | 'TASK' | 'LAB' | 'RANCH' | 'DELIVERY';
  timestamp: string;
  read: boolean;
}

export const mockUsers: AppUser[] = (_persistedStore.users && _persistedStore.users.length > 0)
  ? _persistedStore.users
  : [
      {
        id: 'mock-admin',
        email: 'admin@renu.com',
        password: 'admin',
        name: 'Admin Demo',
        role: 'admin',
        phone: '(559) 555-0100',
        approvalStatus: 'APPROVED',
        avatarUrl: '',
        quickbooksCustomerId: '',
        createdAt: '2026-01-01T00:00:00.000Z'
      },
      {
        id: 'mock-emp',
        email: 'employee@renu.com',
        password: 'employee',
        name: 'Employee Demo',
        role: 'employee',
        phone: '(559) 555-0101',
        approvalStatus: 'APPROVED',
        avatarUrl: '',
        quickbooksCustomerId: '',
        createdAt: '2026-01-02T00:00:00.000Z'
      },
      {
        id: 'mock-cust-1',
        email: 'customer@renu.com',
        password: 'customer',
        name: 'Sierra Agri Group',
        role: 'Grower',
        phone: '(559) 555-0192',
        approvalStatus: 'APPROVED',
        avatarUrl: '',
        quickbooksCustomerId: 'QB-CUST-101',
        createdAt: '2026-01-03T00:00:00.000Z'
      },
      {
        id: 'mock-cust-2',
        email: 'john@grower.com',
        password: 'grower123',
        name: 'Valley Farm Co.',
        role: 'Grower',
        phone: '(661) 555-0144',
        approvalStatus: 'APPROVED',
        avatarUrl: '',
        quickbooksCustomerId: 'QB-CUST-102',
        createdAt: '2026-01-04T00:00:00.000Z'
      },
      {
        id: 'mock-cust-3',
        email: 'sarah@farms.com',
        password: 'farm123',
        name: 'San Joaquin Orchards',
        role: 'Grower',
        phone: '(559) 555-0177',
        approvalStatus: 'APPROVED',
        avatarUrl: '',
        quickbooksCustomerId: 'QB-CUST-103',
        createdAt: '2026-01-05T00:00:00.000Z'
      }
    ];

export const CANONICAL_RANCHES: RanchItem[] = [
  {
    id: 'ranch-1',
    name: 'Sierra Foothills Ranch',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    county: 'Fresno',
    approvalStatus: 'APPROVED',
    blocks: [
      {
        id: 'blk-1-1',
        blockId: 'N-4',
        ranchId: 'ranch-1',
        crop: 'Almond',
        variety: 'Nonpareil',
        rootstock: 'Nemaguard',
        acreage: 45,
        plantingYear: 2018,
        irrigationType: 'Drip',
        fertigationSet: 'Set 1-A',
        county: 'Fresno',
        apns: ['042-180-012', '042-180-013'],
        createdAt: '2026-01-10T08:00:00.000Z'
      },
      {
        id: 'blk-1-2',
        blockId: 'N-5',
        ranchId: 'ranch-1',
        crop: 'Pistachio',
        variety: 'Kerman',
        rootstock: 'Pioneer Gold',
        acreage: 40,
        plantingYear: 2019,
        irrigationType: 'Micro-sprinkler',
        fertigationSet: 'Valve 2-B',
        county: 'Fresno',
        apns: ['042-180-014'],
        createdAt: '2026-01-12T08:00:00.000Z'
      }
    ],
    tanks: [
      {
        id: 'tank-1-1',
        ranchId: 'ranch-1',
        name: 'Main Fertigation Tank (T-101)',
        capacity: 2500,
        location: 'North Pump Station',
        level: '78%',
        pressure: '32 PSI',
        approvalStatus: 'APPROVED'
      },
      {
        id: 'tank-1-2',
        ranchId: 'ranch-1',
        name: 'Secondary Holding Tank (T-102)',
        capacity: 1500,
        location: 'South Perimeter Pad',
        level: '45%',
        pressure: '28 PSI',
        approvalStatus: 'APPROVED'
      }
    ],
    ac: 85
  },
  {
    id: 'ranch-2',
    name: 'Valley Green Ranch',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    county: 'Fresno',
    approvalStatus: 'APPROVED',
    blocks: [
      {
        id: 'blk-2-1',
        blockId: 'VG-1',
        ranchId: 'ranch-2',
        crop: 'Almond',
        variety: 'Monterey',
        rootstock: 'Hansen',
        acreage: 120,
        plantingYear: 2016,
        irrigationType: 'Drip',
        fertigationSet: 'Set 3',
        county: 'Fresno',
        apns: ['025-110-045'],
        createdAt: '2026-01-15T08:00:00.000Z'
      },
      {
        id: 'blk-2-2',
        blockId: 'VG-2',
        ranchId: 'ranch-2',
        crop: 'Grape',
        variety: 'Thompson Seedless',
        rootstock: 'Freedom',
        acreage: 145,
        plantingYear: 2014,
        irrigationType: 'Drip',
        fertigationSet: 'Set 4',
        county: 'Fresno',
        apns: ['025-110-046'],
        createdAt: '2026-01-18T08:00:00.000Z'
      }
    ],
    tanks: [
      {
        id: 'tank-2-1',
        ranchId: 'ranch-2',
        name: 'Valley Primary Tank (T-201)',
        capacity: 5000,
        location: 'Central Injector Pad',
        level: '85%',
        pressure: '40 PSI',
        approvalStatus: 'APPROVED'
      }
    ],
    ac: 265
  },
  {
    id: 'ranch-3',
    name: 'Central Valley Almonds',
    customerId: 'mock-cust-2',
    customerEmail: 'john@grower.com',
    county: 'Kern',
    approvalStatus: 'APPROVED',
    blocks: [
      {
        id: 'blk-3-1',
        blockId: 'CV-1',
        ranchId: 'ranch-3',
        crop: 'Pistachio',
        variety: 'Lost Hills',
        rootstock: 'UCB-1',
        acreage: 400,
        plantingYear: 2017,
        irrigationType: 'Dual Drip',
        fertigationSet: 'Set A',
        county: 'Kern',
        apns: ['114-090-022'],
        createdAt: '2026-01-20T08:00:00.000Z'
      },
      {
        id: 'blk-3-2',
        blockId: 'CV-2',
        ranchId: 'ranch-3',
        crop: 'Almond',
        variety: 'Independence',
        rootstock: 'Nemaguard',
        acreage: 500,
        plantingYear: 2020,
        irrigationType: 'Micro-sprinkler',
        fertigationSet: 'Set B',
        county: 'Kern',
        apns: ['114-090-023'],
        createdAt: '2026-01-22T08:00:00.000Z'
      }
    ],
    tanks: [
      {
        id: 'tank-3-1',
        ranchId: 'ranch-3',
        name: 'Foothill Bulk Tank (T-301)',
        capacity: 10000,
        location: 'East Pump House',
        level: '92%',
        pressure: '45 PSI',
        approvalStatus: 'APPROVED'
      }
    ],
    ac: 900
  }
];

export const CANONICAL_TANKS: TankItem[] = CANONICAL_RANCHES.flatMap(r => r.tanks);

const _todayStr = new Date().toISOString().split('T')[0];
const _tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export const CANONICAL_ORDERS: OrderItem[] = [
  {
    id: 'del-101',
    orderId: 'DEL-101',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    product: 'ReNu N-32% K-28% Blend',
    gallons: 500,
    ranchId: 'ranch-1',
    tankId: 'tank-1-1',
    blockIds: ['blk-1-1', 'blk-1-2'],
    deliveryWindow: `Tomorrow (${_tomorrowStr}) 8:00 AM - 12:00 PM`,
    gateCode: '#4821',
    contactOnArrival: 'Joe Miller (559-555-0199)',
    notes: 'Leave at main fertigation pad near north pump station',
    status: 'Scheduled',
    date: _tomorrowStr,
    timeline: [
      { stage: 'Scheduled', date: _todayStr, done: true },
      { stage: 'Out for delivery', date: '', done: false },
      { stage: 'Delivered', date: '', done: false }
    ]
  },
  {
    id: 'del-102',
    orderId: 'DEL-102',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    product: 'ReNu N-32% K-24% Blend',
    gallons: 750,
    ranchId: 'ranch-1',
    tankId: 'tank-1-1',
    blockIds: ['blk-1-1'],
    deliveryWindow: `Today (${_todayStr}) 1:00 PM - 5:00 PM`,
    gateCode: '#4821',
    contactOnArrival: 'Joe Miller (559-555-0199)',
    notes: 'Driver call 30 mins prior to arrival',
    status: 'Out for delivery',
    date: _todayStr,
    timeline: [
      { stage: 'Scheduled', date: _todayStr, done: true },
      { stage: 'Out for delivery', date: _todayStr, done: true },
      { stage: 'Delivered', date: '', done: false }
    ]
  },
  {
    id: 'del-103',
    orderId: 'DEL-103',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    product: 'ReNu N-32% K-28% Blend',
    gallons: 600,
    deliveredGallons: 600,
    deliveredDate: '2026-03-15',
    ranchId: 'ranch-1',
    tankId: 'tank-1-1',
    blockIds: ['blk-1-1', 'blk-1-2'],
    deliveryWindow: '2026-03-15 (Morning)',
    gateCode: '#4821',
    contactOnArrival: 'Joe Miller',
    notes: 'Offload completed into primary holding tank',
    status: 'Delivered',
    invoiceId: 'INV-2026-001',
    date: '2026-03-15',
    timeline: [
      { stage: 'Scheduled', date: '2026-03-12', done: true },
      { stage: 'Out for delivery', date: '2026-03-15', done: true },
      { stage: 'Delivered', date: '2026-03-15', done: true }
    ]
  },
  {
    id: 'del-104',
    orderId: 'DEL-104',
    customerId: 'mock-cust-2',
    customerEmail: 'john@grower.com',
    product: 'ReNu 0-0-29 Potassium Acetate',
    gallons: 800,
    deliveredGallons: 800,
    deliveredDate: '2026-03-20',
    ranchId: 'ranch-3',
    tankId: 'tank-3-1',
    blockIds: ['blk-3-1', 'blk-3-2'],
    deliveryWindow: '2026-03-20',
    gateCode: '#9012',
    contactOnArrival: 'Carlos Ruiz (661-555-0188)',
    notes: 'Direct injection to bulk tank',
    status: 'Delivered',
    invoiceId: 'INV-2026-002',
    date: '2026-03-20',
    timeline: [
      { stage: 'Scheduled', date: '2026-03-18', done: true },
      { stage: 'Out for delivery', date: '2026-03-20', done: true },
      { stage: 'Delivered', date: '2026-03-20', done: true }
    ]
  },
  {
    id: 'del-105',
    orderId: 'DEL-105',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    product: 'Bee Bloom',
    gallons: 500,
    ranchId: 'ranch-2',
    tankId: 'tank-2-1',
    blockIds: ['blk-2-1'],
    deliveryWindow: '2026-04-05',
    gateCode: '#3321',
    contactOnArrival: 'Frank Woods',
    notes: 'Cancelled due to severe rainstorm and impassable orchard service roads',
    status: 'Cancelled',
    cancelReason: 'Heavy rainstorm flooded orchard access road; delivery rescheduled for next dry spray window',
    date: '2026-04-05',
    timeline: [
      { stage: 'Scheduled', date: '2026-04-03', done: true },
      { stage: 'Cancelled', date: '2026-04-05', done: true }
    ]
  }
];

export const CANONICAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-001',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    deliveryId: 'DEL-103',
    invoiceDate: '2026-03-16',
    dueDate: '2026-04-15',
    amount: 6250.00,
    status: 'Paid',
    paidDate: '2026-03-28',
    quickbooksInvoiceId: 'QB-10842',
    product: 'ReNu N-32% K-28% Blend',
    gallons: 600,
    blockIds: ['blk-1-1', 'blk-1-2']
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-002',
    customerId: 'mock-cust-2',
    customerEmail: 'john@grower.com',
    deliveryId: 'DEL-104',
    invoiceDate: '2026-03-21',
    dueDate: '2026-04-20',
    amount: 8400.00,
    status: 'Paid',
    paidDate: '2026-04-02',
    quickbooksInvoiceId: 'QB-10865',
    product: 'ReNu 0-0-29 Potassium Acetate',
    gallons: 800,
    blockIds: ['blk-3-1', 'blk-3-2']
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-003',
    customerId: 'mock-cust-1',
    customerEmail: 'customer@renu.com',
    deliveryId: 'DEL-102',
    invoiceDate: '2026-10-01',
    dueDate: '2026-11-01',
    amount: 5100.00,
    status: 'Open',
    quickbooksInvoiceId: 'QB-10902',
    product: 'ReNu N-32% K-24% Blend',
    gallons: 750,
    blockIds: ['blk-1-1']
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-004',
    customerId: 'mock-cust-3',
    customerEmail: 'sarah@farms.com',
    invoiceDate: '2026-02-15',
    dueDate: '2026-03-15',
    amount: 4350.00,
    status: 'Overdue',
    quickbooksInvoiceId: 'QB-10779',
    product: 'Bee Bloom',
    gallons: 400
  }
];

export const CANONICAL_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'ReNu N-32%, K-28% Blend',
    brandLabel: 'Biome-Care Soil Blend (1st - 4th Application)',
    description: 'Primary high-efficiency biological soil blend supplying active microbial nitrogen and potassium with calcium.',
    analysis: '32-0-28 with 15% Ca (13.98 lb/gal)',
    lbPerGal: 13.98,
    percentN: 32.0,
    percentP2O5: 0.0,
    percentK2O: 28.0,
    percentCa: 15.0,
    percentB: 0.0,
    percentZn: 0.0,
    countsTowardN: true,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-2',
    name: 'ReNu N-32%, K-24% Blend (K acetate)',
    brandLabel: 'N-Care 3rd Application Blend',
    description: 'Biological nitrogen blend buffered with fast-acting potassium acetate for maximum mid-season nutrient translocation.',
    analysis: '32-0-24 with 10% Ca (13.98 lb/gal)',
    lbPerGal: 13.98,
    percentN: 32.0,
    percentP2O5: 0.0,
    percentK2O: 24.0,
    percentCa: 10.0,
    percentB: 0.0,
    percentZn: 0.0,
    countsTowardN: true,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-3',
    name: 'ReNu N-32%, K-28% Blend + B, Zn',
    brandLabel: '4th Application Micronutrient Fortified',
    description: 'Late spring biological soil blend with organic boron and zinc co-factors for nut fill, hull split, and embryo vigor.',
    analysis: '32-0-28 + 0.2% B, 0.5% Zn, 20% Ca (14.12 lb/gal)',
    lbPerGal: 14.12,
    percentN: 32.0,
    percentP2O5: 0.0,
    percentK2O: 28.0,
    percentCa: 20.0,
    percentB: 0.2,
    percentZn: 0.5,
    countsTowardN: true,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-4',
    name: 'ReNu Fruit Care',
    brandLabel: 'Sea Biolife Fruit Care Shot',
    description: 'Targeted biological biostimulant shot designed to sustain photosynthetic capacity and root vigor under intense heat.',
    analysis: '32-0-28 with 12% Ca (13.97 lb/gal)',
    lbPerGal: 13.97,
    percentN: 32.0,
    percentP2O5: 0.0,
    percentK2O: 28.0,
    percentCa: 12.0,
    percentB: 0.0,
    percentZn: 0.0,
    countsTowardN: true,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-5',
    name: 'ReNu 0-0-29 Potassium Acetate',
    brandLabel: 'K-Rush Soil / Foliar Acetate',
    description: 'Zero-chloride ultra-pure potassium acetate providing instantaneous plant assimilation through drip or foliar spray.',
    analysis: '0-0-29 (12.25 lb/gal)',
    lbPerGal: 12.25,
    percentN: 0.0,
    percentP2O5: 0.0,
    percentK2O: 29.0,
    percentCa: 0.0,
    percentB: 0.0,
    percentZn: 0.0,
    countsTowardN: false,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-6',
    name: 'ReNu N-6%, K-16%, Ca-20% Blend',
    brandLabel: 'Post-Harvest Restorative Program',
    description: 'Post-harvest restorative blend designed to recharge tree carbohydrates, spur root flush, and set winter bud hardiness.',
    analysis: '6-0-16 with 20% Ca (11.00 lb/gal)',
    lbPerGal: 11.00,
    percentN: 6.0,
    percentP2O5: 0.0,
    percentK2O: 16.0,
    percentCa: 20.0,
    percentB: 0.1,
    percentZn: 0.2,
    countsTowardN: true,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'prod-7',
    name: 'Bloom foliars + boron',
    brandLabel: 'Bee Bloom & Pollination Foliar',
    description: 'Bloom, dormant, and petal-fall natural foliar stimulant with organic boron for bee visitation and flower set.',
    analysis: '0-0-0 with biological stimulants & B (9.80 lb/gal)',
    lbPerGal: 9.80,
    percentN: 0.0,
    percentP2O5: 0.0,
    percentK2O: 0.0,
    percentCa: 0.0,
    percentB: 0.5,
    percentZn: 0.2,
    countsTowardN: false,
    omriCertified: true,
    omriListed: true,
    imageUrl: '',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

const hasModernRanches = Array.isArray(_persistedStore.ranches) && _persistedStore.ranches.some((r: any) => Array.isArray(r.blocks) && r.blocks.length > 0);
export const mockRanches: RanchItem[] = hasModernRanches
  ? _persistedStore.ranches.map((r: any) => ({
      ...r,
      blocks: r.blocks || [],
      tanks: r.tanks || r.tankSetups || [],
      tankSetups: r.tanks || r.tankSetups || [],
      ac: (r.blocks || []).reduce((s: number, b: any) => s + (Number(b.acreage) || 0), 0)
    }))
  : JSON.parse(JSON.stringify(CANONICAL_RANCHES));

export const mockTanks: TankItem[] = (_persistedStore.tanks && _persistedStore.tanks.length > 0)
  ? _persistedStore.tanks
  : JSON.parse(JSON.stringify(CANONICAL_TANKS));

const hasModernOrders = Array.isArray(_persistedStore.orders) && _persistedStore.orders.some((o: any) => o.orderId === 'DEL-101');
export const mockOrdersList: OrderItem[] = hasModernOrders
  ? _persistedStore.orders
  : JSON.parse(JSON.stringify(CANONICAL_ORDERS));

const hasModernInvoices = Array.isArray(_persistedStore.invoices) && _persistedStore.invoices.some((i: any) => i.invoiceNumber === 'INV-2026-001' || i.invoiceNumber === 'INV-2026-004');
export const mockInvoices: InvoiceItem[] = hasModernInvoices
  ? _persistedStore.invoices
  : JSON.parse(JSON.stringify(CANONICAL_INVOICES));

export const mockProducts: ProductItem[] = (_persistedStore.products && _persistedStore.products.length >= 4)
  ? _persistedStore.products
  : JSON.parse(JSON.stringify(CANONICAL_PRODUCTS));

export const mockPrograms: NutritionProgram[] = _persistedStore.programs || [];
export const mockSamples: LabSample[] = _persistedStore.samples || [];

export const mockFeatureFlags: FeatureFlagsConfig = _persistedStore.featureFlags || {
  global: {
    ordering: false,
    payments: false,
    recommendations: true,
    labResults: true,
    documents: false,
    compliance: true,
    messaging: false,
    staffTasks: false,
    optimoroute: true,
    telemetry: true,
    quickbooks: false,
    map: false
  },
  customerOverrides: {}
};

export const mockTasks: EmployeeTask[] = _persistedStore.tasks || [];
export const mockLabResults: LabResult[] = _persistedStore.labResults || [];
export const mockNotifications: AdminNotification[] = _persistedStore.notifications || [];

export interface PlatformSettings {
  maintenanceMode: boolean;
  emailNotifications: boolean;
  orderAutoApprove: boolean;
  autoApproveLimit: number;
  lowTankAlertLevel: number;
  require2FAForAdmin: boolean;
  systemVersion: string;
}

export const mockPlatformSettings: PlatformSettings = _persistedStore.platformSettings || {
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

export const mockAuditLogs: AuditLogEntry[] = [];

export function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  mockAuditLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...entry
  });
}

export function addAdminNotification(notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) {
  mockNotifications.unshift({
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...notif
  });
  saveStore();
}

// -----------------------------------------------------------------------
// Helper: Compute Ranch Acreage (Strictly computed from its blocks!)
// -----------------------------------------------------------------------
export function computeRanchAcreage(ranch: RanchItem): number {
  if (!ranch.blocks || !Array.isArray(ranch.blocks)) return 0;
  return ranch.blocks.reduce((sum, b) => sum + (Number(b.acreage) || 0), 0);
}

// -----------------------------------------------------------------------
// Customer Helpers
// -----------------------------------------------------------------------
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
    // Non-fatal if offline
  }
  return null;
}

export function updateUserProfile(idOrEmail: string, updates: { name?: string; avatarUrl?: string; phone?: string; address?: string }) {
  const normalized = idOrEmail.toLowerCase().trim();
  const u = mockUsers.find(user => user.id.toLowerCase() === normalized || user.email.toLowerCase() === normalized);
  if (u) {
    if (updates.name !== undefined && updates.name.trim()) u.name = updates.name.trim();
    if (updates.avatarUrl !== undefined) u.avatarUrl = updates.avatarUrl;
    if (updates.phone !== undefined) u.phone = updates.phone;
    saveStore();
    return u;
  }
  return null;
}

export async function createNewUser(params: {
  email: string;
  password?: string;
  name?: string;
  role?: string;
  phone?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  harvestStages?: string[];
  assignedEmpEmail?: string;
}): Promise<AppUser> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const password = params.password || 'Customer123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name: string = (params.name && params.name.trim()) || normalizedEmail.split('@')[0] || 'Customer';
  const role: string = params.role || 'Grower';
  const approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = params.approvalStatus || 'APPROVED';

  const userId = `cust-${Date.now()}`;
  const createdAt = new Date().toISOString();

  const newUser: AppUser = {
    id: userId,
    email: normalizedEmail,
    password,
    passwordHash: hashedPassword,
    name,
    role,
    phone: params.phone || '',
    approvalStatus,
    avatarUrl: '',
    quickbooksCustomerId: '',
    harvestStages: params.harvestStages || ['Pre Harvest', 'Harvest', 'Post Harvest'],
    assignedEmpEmail: params.assignedEmpEmail || '',
    createdAt
  };

  const existingIdx = mockUsers.findIndex(u => u.email.toLowerCase() === normalizedEmail);
  if (existingIdx >= 0) {
    mockUsers[existingIdx] = newUser;
  } else {
    mockUsers.unshift(newUser);
  }

  saveStore();
  return newUser;
}

export function updateCustomerApprovalStatus(id: string, status: 'APPROVED' | 'REJECTED'): AppUser | null {
  const user = mockUsers.find(u => u.id === id);
  if (user) {
    user.approvalStatus = status;
    saveStore();
    return user;
  }
  return null;
}

export async function updateCustomerDetails(id: string, updates: {
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  password?: string;
  quickbooksCustomerId?: string;
}) {
  const user = mockUsers.find(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  if (user) {
    if (updates.name) user.name = updates.name.trim();
    if (updates.email) user.email = updates.email.trim().toLowerCase();
    if (updates.role) user.role = updates.role;
    if (updates.phone !== undefined) user.phone = updates.phone;
    if (updates.approvalStatus) user.approvalStatus = updates.approvalStatus;
    if (updates.quickbooksCustomerId !== undefined) user.quickbooksCustomerId = updates.quickbooksCustomerId;
    if (updates.password) {
      user.password = updates.password;
      user.passwordHash = await bcrypt.hash(updates.password, 10);
    }
    saveStore();
    return user;
  }
  return null;
}

// -----------------------------------------------------------------------
// Customers List for Admin: includes ranches count, computed acreage,
// year-to-date gallons, and open balance
// -----------------------------------------------------------------------
export async function getAllCustomersList() {
  const currentYear = new Date().getFullYear();

  return mockUsers
    .filter(u => u.role !== 'admin' && u.role !== 'employee')
    .map(u => {
      // Find ranches belonging to this customer
      const userRanches = mockRanches.filter(
        r => r.customerId === u.id || r.customerEmail?.toLowerCase() === u.email.toLowerCase()
      );

      // Compute total acreage across all ranches
      const totalAcres = userRanches.reduce((sum, r) => sum + computeRanchAcreage(r), 0);

      // Compute YTD delivered gallons
      const ytdGallons = mockOrdersList
        .filter(o => (o.customerId === u.id || o.customerEmail?.toLowerCase() === u.email.toLowerCase()))
        .filter(o => o.status === 'Delivered')
        .filter(o => o.date && o.date.startsWith(`${currentYear}`))
        .reduce((sum, o) => sum + (Number(o.deliveredGallons || o.gallons) || 0), 0);

      // Compute open invoice balance
      const openBalance = mockInvoices
        .filter(i => (i.customerId === u.id || i.customerEmail?.toLowerCase() === u.email.toLowerCase()))
        .filter(i => i.status === 'Open' || i.status === 'Overdue')
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone: u.phone || '',
        approvalStatus: u.approvalStatus || 'APPROVED',
        avatarUrl: u.avatarUrl || '',
        quickbooksCustomerId: u.quickbooksCustomerId || '',
        createdAt: u.createdAt,
        ranchesCount: userRanches.length,
        totalAcres,
        ytdGallons,
        openBalance,
        user_metadata: {
          full_name: u.name,
          role: u.role,
          phone: u.phone,
          approvalStatus: u.approvalStatus || 'APPROVED'
        }
      };
    });
}

// -----------------------------------------------------------------------
// Ranch, Block & Tank Operations
// -----------------------------------------------------------------------
export function getRanchesForCustomer(customerIdOrEmail: string, role?: string): RanchItem[] {
  let list = mockRanches;
  if (role !== 'admin') {
    const norm = customerIdOrEmail.toLowerCase().trim();
    list = mockRanches.filter(
      r => (r.customerId && r.customerId.toLowerCase() === norm) ||
           (r.customerEmail && r.customerEmail.toLowerCase() === norm)
    );
  }

  // Ensure computed acreage is attached
  return list.map(r => ({
    ...r,
    ac: computeRanchAcreage(r),
    tankSetups: r.tanks || []
  }));
}

export function createRanch(params: {
  name: string;
  county: string;
  customerId?: string;
  customerEmail?: string;
}): RanchItem {
  const newRanch: RanchItem = {
    id: `ranch-${Date.now()}`,
    customerId: params.customerId || 'mock-cust-1',
    customerEmail: params.customerEmail || 'customer@renu.com',
    name: params.name.trim(),
    county: params.county.trim(),
    approvalStatus: 'APPROVED',
    blocks: [],
    tanks: [],
    tankSetups: []
  };
  newRanch.ac = 0;
  mockRanches.push(newRanch);
  saveStore();
  return newRanch;
}

export function addBlockToRanch(ranchId: string, blockData: Partial<BlockItem>): BlockItem | null {
  const ranch = mockRanches.find(r => r.id === ranchId);
  if (!ranch) return null;

  if (!ranch.blocks) ranch.blocks = [];

  const newBlock: BlockItem = {
    id: `blk-${Date.now()}`,
    ranchId,
    blockId: (blockData.blockId || 'B-1').trim(),
    crop: (blockData.crop || 'Almond').trim(),
    variety: (blockData.variety || 'Nonpareil').trim(),
    rootstock: (blockData.rootstock || 'Nemaguard').trim(),
    acreage: Number(blockData.acreage) || 0,
    plantingYear: Number(blockData.plantingYear) || new Date().getFullYear(),
    irrigationType: (blockData.irrigationType || 'Drip').trim(),
    fertigationSet: (blockData.fertigationSet || 'Set 1').trim(),
    county: (blockData.county || ranch.county || 'Fresno').trim(),
    apns: Array.isArray(blockData.apns) ? blockData.apns : (blockData.apns ? [String(blockData.apns)] : []),
    createdAt: new Date().toISOString()
  };

  ranch.blocks.push(newBlock);
  ranch.ac = computeRanchAcreage(ranch);
  saveStore();
  return newBlock;
}

export function updateBlock(blockId: string, updates: Partial<BlockItem>): BlockItem | null {
  for (const ranch of mockRanches) {
    const bIdx = (ranch.blocks || []).findIndex(b => b.id === blockId);
    if (bIdx >= 0) {
      const block = ranch.blocks[bIdx];
      if (updates.blockId) block.blockId = updates.blockId.trim();
      if (updates.crop) block.crop = updates.crop.trim();
      if (updates.variety) block.variety = updates.variety.trim();
      if (updates.rootstock) block.rootstock = updates.rootstock.trim();
      if (updates.acreage !== undefined) block.acreage = Number(updates.acreage) || 0;
      if (updates.plantingYear !== undefined) block.plantingYear = Number(updates.plantingYear) || block.plantingYear;
      if (updates.irrigationType) block.irrigationType = updates.irrigationType.trim();
      if (updates.fertigationSet) block.fertigationSet = updates.fertigationSet.trim();
      if (updates.county) block.county = updates.county.trim();
      if (updates.apns) block.apns = Array.isArray(updates.apns) ? updates.apns : [String(updates.apns)];
      ranch.ac = computeRanchAcreage(ranch);
      saveStore();
      return block;
    }
  }
  return null;
}

export function deleteBlock(blockId: string): boolean {
  for (const ranch of mockRanches) {
    const bIdx = (ranch.blocks || []).findIndex(b => b.id === blockId);
    if (bIdx >= 0) {
      ranch.blocks.splice(bIdx, 1);
      ranch.ac = computeRanchAcreage(ranch);
      saveStore();
      return true;
    }
  }
  return false;
}

export function addTankToRanch(ranchId: string, tankData: Partial<TankItem>): TankItem | null {
  const ranch = mockRanches.find(r => r.id === ranchId);
  if (!ranch) return null;

  if (!ranch.tanks) ranch.tanks = [];

  const newTank: TankItem = {
    id: `tank-${Date.now()}`,
    ranchId,
    name: (tankData.name || 'Station Tank').trim(),
    capacity: Number(tankData.capacity) || 1000,
    location: (tankData.location || 'Ranch Pump Station').trim(),
    level: tankData.level || '80%',
    pressure: tankData.pressure || '40 PSI',
    approvalStatus: 'APPROVED'
  };

  ranch.tanks.push(newTank);
  ranch.tankSetups = ranch.tanks;
  mockTanks.push(newTank);
  saveStore();
  return newTank;
}

export function updateTank(tankId: string, updates: Partial<TankItem>): TankItem | null {
  for (const ranch of mockRanches) {
    const tIdx = (ranch.tanks || []).findIndex(t => t.id === tankId);
    if (tIdx >= 0) {
      const tank = ranch.tanks[tIdx];
      if (updates.name) tank.name = updates.name.trim();
      if (updates.capacity !== undefined) tank.capacity = Number(updates.capacity) || tank.capacity;
      if (updates.location) tank.location = updates.location.trim();
      if (updates.level) tank.level = updates.level;
      if (updates.pressure) tank.pressure = updates.pressure;
      saveStore();
      return tank;
    }
  }
  return null;
}

export function deleteTank(tankId: string): boolean {
  for (const ranch of mockRanches) {
    const tIdx = (ranch.tanks || []).findIndex(t => t.id === tankId);
    if (tIdx >= 0) {
      ranch.tanks.splice(tIdx, 1);
      ranch.tankSetups = ranch.tanks;
      saveStore();
      return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------
// Deliveries Lifecycle Helpers
// -----------------------------------------------------------------------
export function createDeliveryOrder(params: {
  customerId: string;
  customerEmail: string;
  product: string;
  gallons: number;
  ranchId: string;
  tankId: string;
  blockIds: string[];
  deliveryWindow: string;
  gateCode?: string;
  contactOnArrival?: string;
  notes?: string;
}): OrderItem {
  const orderId = `DEL-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  const newDelivery: OrderItem = {
    id: `del-${Date.now()}`,
    orderId,
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    product: params.product,
    gallons: Number(params.gallons) || 0,
    ranchId: params.ranchId,
    tankId: params.tankId,
    blockIds: Array.isArray(params.blockIds) ? params.blockIds : [],
    deliveryWindow: params.deliveryWindow || 'Tomorrow (Morning)',
    gateCode: params.gateCode || '',
    contactOnArrival: params.contactOnArrival || '',
    notes: params.notes || '',
    status: 'Scheduled',
    optimoRouteOrderId: `OPT-${Math.floor(10000 + Math.random() * 90000)}`,
    date: now.split('T')[0],
    timeline: [
      { stage: 'Scheduled', date: now.replace('T', ' ').substring(0, 16), done: true },
      { stage: 'Out for delivery', date: 'Pending', done: false },
      { stage: 'Delivered', date: 'Pending', done: false }
    ],
    // Legacy support
    qty: `${params.gallons} Gal`,
    amt: 0
  };

  mockOrdersList.unshift(newDelivery);
  saveStore();
  return newDelivery;
}

export function updateDeliveryStatus(
  deliveryId: string,
  status: 'Scheduled' | 'Out for delivery' | 'Delivered' | 'Cancelled',
  extra?: { deliveredGallons?: number; deliveredDate?: string; cancelReason?: string }
): OrderItem | null {
  const delivery = mockOrdersList.find(d => d.id === deliveryId || d.orderId === deliveryId);
  if (!delivery) return null;

  delivery.status = status;
  const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (!delivery.timeline) {
    delivery.timeline = [
      { stage: 'Scheduled', date: delivery.date, done: true },
      { stage: 'Out for delivery', date: 'Pending', done: false },
      { stage: 'Delivered', date: 'Pending', done: false }
    ];
  }

  if (status === 'Out for delivery') {
    delivery.timeline[1] = { stage: 'Out for delivery', date: nowStr, done: true };
  } else if (status === 'Delivered') {
    delivery.timeline[1] = { stage: 'Out for delivery', date: delivery.timeline[1].date !== 'Pending' ? delivery.timeline[1].date : nowStr, done: true };
    delivery.timeline[2] = { stage: 'Delivered', date: extra?.deliveredDate || nowStr, done: true };
    delivery.deliveredGallons = extra?.deliveredGallons || delivery.gallons;
    delivery.deliveredDate = extra?.deliveredDate || new Date().toISOString().split('T')[0];
  } else if (status === 'Cancelled') {
    delivery.cancelReason = extra?.cancelReason || 'Cancelled by office administration';
    delivery.timeline.push({
      stage: 'Cancelled',
      date: nowStr,
      done: true
    });
  }

  saveStore();
  return delivery;
}

// -----------------------------------------------------------------------
// Invoices Lifecycle Helpers (Hand-entered from QuickBooks)
// -----------------------------------------------------------------------
export function getInvoicesList(customerIdOrEmail?: string, role?: string): InvoiceItem[] {
  const today = new Date().toISOString().split('T')[0];

  // Dynamically update Overdue status if dueDate < today and status is Open
  for (const inv of mockInvoices) {
    if (inv.status === 'Open' && inv.dueDate && inv.dueDate < today) {
      inv.status = 'Overdue';
    }
  }

  if (role === 'admin' || !customerIdOrEmail) {
    return mockInvoices;
  }

  const norm = customerIdOrEmail.toLowerCase().trim();
  return mockInvoices.filter(
    i => (i.customerId && i.customerId.toLowerCase() === norm) ||
         (i.customerEmail && i.customerEmail.toLowerCase() === norm)
  );
}

export function createHandEnteredInvoice(params: {
  invoiceNumber: string;
  customerId: string;
  customerEmail: string;
  deliveryId?: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  pdfData?: string;
  pdfFileName?: string;
  quickbooksInvoiceId?: string;
}): InvoiceItem {
  // If deliveryId is provided, get product/gallons/block info
  let product = 'ReNu-Biome Product';
  let gallons = 0;
  let blockIds: string[] = [];

  if (params.deliveryId) {
    const delivery = mockOrdersList.find(d => d.id === params.deliveryId || d.orderId === params.deliveryId);
    if (delivery) {
      product = delivery.product;
      gallons = delivery.deliveredGallons || delivery.gallons;
      blockIds = delivery.blockIds || [];
      delivery.invoiceId = `inv-${Date.now()}`;
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const isPastDue = params.dueDate < today;

  const newInvoice: InvoiceItem = {
    id: `inv-${Date.now()}`,
    invoiceNumber: params.invoiceNumber.trim(),
    customerId: params.customerId,
    customerEmail: params.customerEmail,
    deliveryId: params.deliveryId || '',
    invoiceDate: params.invoiceDate || today,
    dueDate: params.dueDate,
    amount: Number(params.amount) || 0,
    status: isPastDue ? 'Overdue' : 'Open',
    pdfData: params.pdfData || '',
    pdfFileName: params.pdfFileName || `${params.invoiceNumber.trim()}.pdf`,
    quickbooksInvoiceId: params.quickbooksInvoiceId || '',
    product,
    gallons,
    blockIds
  };

  mockInvoices.unshift(newInvoice);
  saveStore();
  return newInvoice;
}

export function markInvoicePaid(invoiceId: string, paymentDate?: string): InvoiceItem | null {
  const inv = mockInvoices.find(i => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv) return null;

  inv.status = 'Paid';
  inv.paidDate = paymentDate || new Date().toISOString().split('T')[0];
  saveStore();
  return inv;
}

export function voidInvoice(invoiceId: string): InvoiceItem | null {
  const inv = mockInvoices.find(i => i.id === invoiceId || i.invoiceNumber === invoiceId);
  if (!inv) return null;

  inv.status = 'Void';
  saveStore();
  return inv;
}

// -----------------------------------------------------------------------
// Year-End Purchase Summary: deliveries & invoices for chosen year
// -----------------------------------------------------------------------
export function getCustomerYearEndSummary(customerIdOrEmail: string, year: number) {
  const norm = customerIdOrEmail.toLowerCase().trim();
  const yearStr = String(year);

  const customer = mockUsers.find(
    u => u.id.toLowerCase() === norm || u.email.toLowerCase() === norm
  );

  const deliveries = mockOrdersList
    .filter(d => (d.customerId && d.customerId.toLowerCase() === norm) || (d.customerEmail && d.customerEmail.toLowerCase() === norm))
    .filter(d => d.date && d.date.startsWith(yearStr));

  const invoices = mockInvoices
    .filter(i => (i.customerId && i.customerId.toLowerCase() === norm) || (i.customerEmail && i.customerEmail.toLowerCase() === norm))
    .filter(i => (i.invoiceDate && i.invoiceDate.startsWith(yearStr)) || (i.paidDate && i.paidDate.startsWith(yearStr)));

  const totalGallons = deliveries.reduce((s, d) => s + (Number(d.deliveredGallons || d.gallons) || 0), 0);
  const totalInvoiced = invoices.filter(i => i.status !== 'Void').reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0);

  return {
    year,
    customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } : { id: norm, name: norm, email: norm },
    deliveries,
    invoices,
    totals: {
      deliveriesCount: deliveries.length,
      totalGallons,
      invoicesCount: invoices.length,
      totalInvoiced,
      totalPaid
    }
  };
}

// -----------------------------------------------------------------------
// Feature Flags Helpers (All off by default)
// -----------------------------------------------------------------------
export function getFeatureFlagsForCustomer(customerIdOrEmail?: string): FeatureFlagsMap {
  const base = { ...mockFeatureFlags.global };
  if (!customerIdOrEmail) return base;

  const norm = customerIdOrEmail.toLowerCase().trim();
  const override = mockFeatureFlags.customerOverrides[norm] || {};
  return { ...base, ...override };
}

export function updateGlobalFeatureFlags(flags: Partial<FeatureFlagsMap>) {
  Object.assign(mockFeatureFlags.global, flags);
  saveStore();
  return mockFeatureFlags.global;
}

export function updateCustomerFeatureFlagOverride(customerIdOrEmail: string, flags: Partial<FeatureFlagsMap>) {
  const norm = customerIdOrEmail.toLowerCase().trim();
  if (!mockFeatureFlags.customerOverrides[norm]) {
    mockFeatureFlags.customerOverrides[norm] = {};
  }
  Object.assign(mockFeatureFlags.customerOverrides[norm], flags);
  saveStore();
  return mockFeatureFlags.customerOverrides[norm];
}

// -----------------------------------------------------------------------
// Legacy aliases retained for backwards compatibility
// -----------------------------------------------------------------------
export const mockMessages: any[] = [];
export function acceptOrderAndSendPaymentEmail(orderId: string) {
  return updateDeliveryStatus(orderId, 'Out for delivery');
}
export function payOrderAndGenerateInvoice(orderId: string) {
  const order = mockOrdersList.find(o => o.id === orderId || o.orderId === orderId);
  if (!order) return null;
  const invoice = createHandEnteredInvoice({
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    customerId: order.customerId,
    customerEmail: order.customerEmail,
    deliveryId: order.id,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    amount: 1000
  });
  updateDeliveryStatus(order.id, 'Delivered', { deliveredGallons: order.gallons });
  return { order, invoice };
}
export function updateOrderTracking(orderId: string, status: any, step: number) {
  return updateDeliveryStatus(orderId, status);
}
export function cancelOrderWithRefund(orderId: string, reason: string) {
  const order = updateDeliveryStatus(orderId, 'Cancelled', { cancelReason: reason });
  return { order, refunded: false, refundAmount: 0 };
}
export function updateTaskStatus(taskId: string, status: any, empEmail?: string) {
  const task = mockTasks.find(t => t.id === taskId);
  if (task) { task.status = status; saveStore(); return task; }
  return null;
}
export function createEmployeeTask(data: any) {
  const newTask: EmployeeTask = {
    id: `task-${Date.now()}`,
    title: data.title || 'Task',
    description: data.description || '',
    assignedToEmail: data.assignedToEmail || 'employee@renu.com',
    status: data.status || 'PENDING',
    priority: data.priority || 'MEDIUM',
    createdAt: new Date().toISOString()
  };
  mockTasks.unshift(newTask);
  saveStore();
  return newTask;
}
export function addLabResult(data: any) {
  const newLab: LabResult = {
    id: `lab-${Date.now()}`,
    ranchId: data.ranchId || 'ranch-1',
    ranchName: data.ranchName || 'Sierra Foothills Ranch',
    growerEmail: data.growerEmail || 'customer@renu.com',
    pH: Number(data.pH) || 6.8,
    nitrogenPPM: Number(data.nitrogenPPM) || 35,
    moisturePercent: Number(data.moisturePercent) || 20,
    microbialScore: Number(data.microbialScore) || 85,
    notes: data.notes || '',
    recordedBy: data.recordedBy || 'employee@renu.com',
    date: data.date || new Date().toISOString().split('T')[0]
  };
  mockLabResults.unshift(newLab);
  saveStore();
  return newLab;
}
export function toggleRanchHidden(ranchId: string, hidden: boolean) {
  const ranch = mockRanches.find(r => r.id === ranchId);
  if (ranch) { ranch.hidden = hidden; saveStore(); return ranch; }
  return null;
}
export function assignGrowerToEmployee(customerId: string, employeeEmail: string) {
  const customer = mockUsers.find(u => u.id === customerId);
  if (customer) { customer.assignedEmpEmail = employeeEmail; saveStore(); return customer; }
  return null;
}

// -----------------------------------------------------------------------
// Delivery Enrichment (Resolves Finding 1: customer, ranch, and tank names)
// -----------------------------------------------------------------------
export function enrichDelivery(d: OrderItem): OrderItem {
  const customer = mockUsers.find(
    u => u.id.toLowerCase() === (d.customerId || '').toLowerCase() ||
         u.email.toLowerCase() === (d.customerEmail || '').toLowerCase()
  );
  const ranch = mockRanches.find(r => r.id === d.ranchId);
  const tank = ranch ? (ranch.tanks || []).find(t => t.id === d.tankId) : null;
  const productObj = mockProducts.find(p => p.name.toLowerCase() === (d.product || '').toLowerCase());

  // Compute lbN and lbK2O if not already explicitly stored
  let lbN = d.lbN;
  let lbK2O = d.lbK2O;
  const gallons = d.deliveredGallons || d.gallons || 0;
  if ((lbN === undefined || lbK2O === undefined) && productObj && gallons > 0) {
    const lbPerGal = productObj.lbPerGal || 13.98;
    const totalPounds = gallons * lbPerGal;
    lbN = Math.round(totalPounds * ((productObj.percentN || 0) / 100));
    lbK2O = Math.round(totalPounds * ((productObj.percentK2O || 0) / 100));
  }

  return {
    ...d,
    customerName: customer?.name || d.customerName || d.customerEmail || 'Customer',
    ranchName: ranch?.name || d.ranchName || 'Ranch',
    tankName: tank?.name || d.tankName || 'Tank',
    lbN,
    lbK2O,
  };
}

// -----------------------------------------------------------------------
// Nutrition Programs Helpers (Phase 2 - Section 4 & 9.2)
// -----------------------------------------------------------------------
export function getProgramsForRanch(ranchId?: string): NutritionProgram[] {
  if (!ranchId) return mockPrograms;
  return mockPrograms.filter(p => p.ranchId === ranchId);
}

export function createProgram(data: any): NutritionProgram {
  const ranch = mockRanches.find(r => r.id === data.ranchId);
  const totalAcreage = data.totalAcreage || (ranch ? computeRanchAcreage(ranch) : 650);

  const newProgram: NutritionProgram = {
    id: `prog-${Date.now()}`,
    name: data.name || 'Almond Nutrition Program',
    crop: data.crop || 'Almond',
    seasonYear: Number(data.seasonYear) || new Date().getFullYear(),
    ranchId: data.ranchId,
    ranchName: ranch?.name || data.ranchName || 'Ranch',
    blocksCovered: Array.isArray(data.blocksCovered) ? data.blocksCovered : (ranch?.blocks || []).map(b => b.blockId),
    totalAcreage,
    targetN: Number(data.targetN) || 165,
    targetK2O: Number(data.targetK2O) || 135,
    nLossFactor: 0.06,
    status: data.status || 'Active',
    stageWindow: data.stageWindow || 'Full Season',
    notes: data.notes || '',
    lines: Array.isArray(data.lines) ? data.lines : [],
    createdAt: new Date().toISOString()
  };

  mockPrograms.unshift(newProgram);
  saveStore();
  return newProgram;
}

export function updateProgram(id: string, updates: any): NutritionProgram | null {
  const idx = mockPrograms.findIndex(p => p.id === id);
  if (idx < 0) return null;
  mockPrograms[idx] = { ...mockPrograms[idx], ...updates };
  saveStore();
  return mockPrograms[idx];
}

export function deleteProgram(id: string): boolean {
  const idx = mockPrograms.findIndex(p => p.id === id);
  if (idx >= 0) {
    mockPrograms.splice(idx, 1);
    saveStore();
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------
// Soil & Tissue Samples Helpers (Phase 2 - Section 5)
// -----------------------------------------------------------------------
export function getSamplesList(ranchId?: string, blockId?: string): LabSample[] {
  return mockSamples.filter(s => {
    if (ranchId && s.ranchId !== ranchId) return false;
    if (blockId && s.blockId !== blockId) return false;
    return true;
  });
}

export function createSample(data: any): LabSample {
  const ranch = mockRanches.find(r => r.id === data.ranchId);
  const newSample: LabSample = {
    id: `SMP-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
    ranchId: data.ranchId || 'ranch-1',
    ranchName: ranch?.name || data.ranchName || 'Sierra Foothills Ranch',
    blockId: data.blockId || 'N-4',
    customerId: data.customerId || 'mock-cust-1',
    customerEmail: data.customerEmail || 'customer@renu.com',
    sampleType: data.sampleType || 'leaf tissue',
    sampleDate: data.sampleDate || new Date().toISOString().split('T')[0],
    labName: data.labName || 'Deng Agronomics Lab',
    status: 'Received',
    customerNotes: data.customerNotes || data.notes || '',
    pdfData: data.pdfData || 'JVBERi0xLjQKJeLjz9MKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCg==',
    pdfFileName: data.pdfFileName || 'Lab_Assay_Report.pdf',
    createdAt: new Date().toISOString()
  };

  mockSamples.unshift(newSample);
  saveStore();
  return newSample;
}

export function updateSampleValues(id: string, values: Record<string, number>): LabSample | null {
  const sample = mockSamples.find(s => s.id === id);
  if (!sample) return null;
  sample.values = { ...(sample.values || {}), ...values };
  sample.status = 'Under review';
  saveStore();
  return sample;
}

export function createRecommendation(sampleId: string, recData: any): LabSample | null {
  const sample = mockSamples.find(s => s.id === sampleId);
  if (!sample) return null;

  sample.status = 'Recommended';
  sample.recommendation = {
    id: `REC-${Date.now()}`,
    summary: recData.summary || 'Custom agronomic recommendation based on lab findings.',
    sentDate: new Date().toISOString().split('T')[0],
    lines: Array.isArray(recData.lines) ? recData.lines : [],
    savedAsProgram: Boolean(recData.savedAsProgram),
    customerReplies: []
  };

  // If savedAsProgram is true, also create or append to ranch program
  if (recData.savedAsProgram && sample.ranchId) {
    const existingProg = mockPrograms.find(p => p.ranchId === sample.ranchId && p.status === 'Active');
    if (existingProg) {
      recData.lines.forEach((l: any) => {
        existingProg.lines.push({
          id: `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: 'prod-5',
          productName: l.productName || 'ReNu 0-0-29 Potassium Acetate',
          stageName: 'Custom Lab Recommendation',
          ratePerAcre: Number(l.ratePerAcre) || 3.5,
          applicationsCount: 1,
          plannedGallons: Math.round((Number(l.ratePerAcre) || 3.5) * (existingProg.totalAcreage || 650)),
          deliveredGallons: 0,
          timingNote: l.timing || 'Immediate application per lab recommendation',
          status: 'Planned'
        });
      });
    }
  }

  saveStore();
  return sample;
}

export function replyToRecommendation(sampleId: string, question: string): LabSample | null {
  const sample = mockSamples.find(s => s.id === sampleId);
  if (!sample || !sample.recommendation) return null;

  if (!Array.isArray(sample.recommendation.customerReplies)) {
    sample.recommendation.customerReplies = [];
  }

  sample.recommendation.customerReplies.push({
    question,
    date: new Date().toISOString()
  });

  saveStore();
  return sample;
}

// -----------------------------------------------------------------------
// Otodata Telemetry Helpers (Phase 2 - Section 3)
// -----------------------------------------------------------------------
export function updateTankTelemetry(tankId: string, data: any) {
  for (const ranch of mockRanches) {
    const tank = (ranch.tanks || []).find(t => t.id === tankId);
    if (tank) {
      if (data.otodataDeviceId !== undefined) tank.otodataDeviceId = data.otodataDeviceId;
      if (data.levelPercent !== undefined) tank.levelPercent = Number(data.levelPercent);
      if (data.levelGallons !== undefined) tank.levelGallons = Number(data.levelGallons);
      if (data.weeklyUsageAvg !== undefined) tank.weeklyUsageAvg = Number(data.weeklyUsageAvg);
      if (data.daysToEmpty !== undefined) tank.daysToEmpty = Number(data.daysToEmpty);
      if (data.reorderThresholdPercent !== undefined) tank.reorderThresholdPercent = Number(data.reorderThresholdPercent);
      if (data.status !== undefined) tank.status = data.status;
      tank.lastReadingTime = new Date().toISOString();
      saveStore();
      return tank;
    }
  }
  return null;
}

// -----------------------------------------------------------------------
// Monthly Reports Helper (Section A6.7)
// -----------------------------------------------------------------------
export function getMonthlyReports(period?: string) {
  const filterYear = period ? period.split('-')[0] : '2026';

  // 1. Sales by Customer (invoice totals)
  const salesByCustomerMap: Record<string, { customerName: string; totalInvoiced: number; totalPaid: number; openBalance: number; invoiceCount: number }> = {};
  mockInvoices.forEach(inv => {
    if (inv.status === 'Void') return;
    const name = inv.customerName || inv.customerEmail || 'Customer';
    if (!salesByCustomerMap[name]) {
      salesByCustomerMap[name] = { customerName: name, totalInvoiced: 0, totalPaid: 0, openBalance: 0, invoiceCount: 0 };
    }
    const amt = Number(inv.amount) || 0;
    salesByCustomerMap[name].totalInvoiced += amt;
    salesByCustomerMap[name].invoiceCount += 1;
    if (inv.status === 'Paid') {
      salesByCustomerMap[name].totalPaid += amt;
    } else {
      salesByCustomerMap[name].openBalance += amt;
    }
  });

  // 2. Sales by Product (gallons & invoice totals)
  const salesByProductMap: Record<string, { productName: string; totalGallons: number; estimatedRevenue: number; deliveryCount: number }> = {};
  mockOrdersList.forEach(del => {
    if (del.status === 'Cancelled') return;
    const prod = del.productName || del.product || 'Standard Blend';
    if (!salesByProductMap[prod]) {
      salesByProductMap[prod] = { productName: prod, totalGallons: 0, estimatedRevenue: 0, deliveryCount: 0 };
    }
    const gal = Number(del.deliveredGallons || del.gallons) || 0;
    salesByProductMap[prod].totalGallons += gal;
    salesByProductMap[prod].deliveryCount += 1;
  });

  // 3. Receivables Aging (Current, 30, 60, 90+ days)
  const now = Date.now();
  const aging = {
    current: 0,
    days30: 0,
    days60: 0,
    days90Plus: 0,
    totalOverdue: 0
  };
  mockInvoices.forEach(inv => {
    if (inv.status === 'Open' || inv.status === 'Overdue') {
      const amt = Number(inv.amount) || 0;
      const dueTime = new Date(inv.dueDate).getTime();
      const diffDays = Math.floor((now - dueTime) / (86400000));
      if (diffDays <= 0) {
        aging.current += amt;
      } else if (diffDays <= 30) {
        aging.days30 += amt;
        aging.totalOverdue += amt;
      } else if (diffDays <= 60) {
        aging.days60 += amt;
        aging.totalOverdue += amt;
      } else {
        aging.days90Plus += amt;
        aging.totalOverdue += amt;
      }
    }
  });

  // 4. Gallons by Month (by product and crop)
  const gallonsByMonth: Record<string, { month: string; gallons: number; products: Record<string, number> }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthNames.forEach(m => {
    gallonsByMonth[m] = { month: m, gallons: 0, products: {} };
  });

  mockOrdersList.forEach(del => {
    if (del.status === 'Cancelled') return;
    const dStr = del.deliveredDate || del.date;
    if (dStr && dStr.includes('-')) {
      const parts = dStr.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        const mName = monthNames[monthIdx];
        const gal = Number(del.deliveredGallons || del.gallons) || 0;
        gallonsByMonth[mName].gallons += gal;
        const pName = del.productName || del.product;
        gallonsByMonth[mName].products[pName] = (gallonsByMonth[mName].products[pName] || 0) + gal;
      }
    }
  });

  return {
    period: filterYear,
    salesByCustomer: Object.values(salesByCustomerMap),
    salesByProduct: Object.values(salesByProductMap),
    receivablesAging: aging,
    gallonsByMonth: Object.values(gallonsByMonth)
  };
}

// -----------------------------------------------------------------------
// Spreadsheet Import & Export of Blocks (Section A11)
// -----------------------------------------------------------------------
export function importBlocksToRanch(ranchId: string, blocksRaw: any[]) {
  const ranch = mockRanches.find(r => r.id === ranchId);
  if (!ranch) throw new Error('Ranch not found');

  const imported: BlockItem[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  blocksRaw.forEach((row: any, idx: number) => {
    const rowNum = idx + 1;
    const blockId = String(row.blockId || row['Block ID'] || row.id || '').trim();
    const acreage = Number(row.acreage || row['Acreage'] || row.acres || 0);

    if (!blockId) {
      errors.push({ row: rowNum, reason: 'Missing Block ID' });
      return;
    }
    if (isNaN(acreage) || acreage <= 0) {
      errors.push({ row: rowNum, reason: `Invalid acreage "${row.acreage || row['Acreage']}"` });
      return;
    }

    const apnsRaw = row.apns || row['APNs'] || row.apn || '';
    const apns = Array.isArray(apnsRaw)
      ? apnsRaw
      : String(apnsRaw).split(/[,;]/).map(a => a.trim()).filter(Boolean);

    const newBlock: BlockItem = {
      id: `blk-${Date.now()}-${idx}`,
      blockId,
      ranchId,
      crop: String(row.crop || row['Crop'] || 'Almond').trim(),
      variety: String(row.variety || row['Variety'] || 'Nonpareil').trim(),
      rootstock: String(row.rootstock || row['Rootstock'] || 'Nemaguard').trim(),
      acreage,
      plantingYear: parseInt(String(row.plantingYear || row['Planting Year'] || 2020), 10) || 2020,
      irrigationType: String(row.irrigationType || row['Irrigation Type'] || 'Drip').trim(),
      fertigationSet: String(row.fertigationSet || row['Fertigation Set'] || 'Set 1').trim(),
      county: String(row.county || row['County'] || ranch.county || 'Fresno County').trim(),
      apns: apns.length > 0 ? apns : ['045-120-001'],
      createdAt: new Date().toISOString()
    };

    ranch.blocks.push(newBlock);
    imported.push(newBlock);
  });

  // Recompute ranch acreage
  ranch.ac = computeRanchAcreage(ranch);
  saveStore();

  return {
    success: true,
    importedCount: imported.length,
    errorCount: errors.length,
    errors,
    ranchAcreage: ranch.ac
  };
}

export function exportBlocksFromRanches(ranchId?: string): string {
  const targetRanches = ranchId ? mockRanches.filter(r => r.id === ranchId) : mockRanches;
  let csv = 'Ranch Name,Block ID,Crop,Variety,Rootstock,Acreage,Planting Year,Irrigation Type,Fertigation Set,County,APNs\n';

  targetRanches.forEach(r => {
    (r.blocks || []).forEach(b => {
      const apnsStr = (b.apns || []).join('; ');
      csv += `"${r.name}","${b.blockId}","${b.crop}","${b.variety}","${b.rootstock}",${b.acreage},${b.plantingYear},"${b.irrigationType}","${b.fertigationSet}","${b.county}","${apnsStr}"\n`;
    });
  });

  return csv;
}
