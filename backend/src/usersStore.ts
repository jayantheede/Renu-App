import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  passwordHash?: string;
  name: string;
  role: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  avatarUrl?: string;
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
  tankSetups?: any[];
}

export interface TankItem {
  id: string;
  ranchId: string;
  capacity: number;
  location?: string;
  approvalStatus: string;
  ranch?: any;
}

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

export const mockRanches: RanchItem[] = [
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

export const mockTanks: TankItem[] = [
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

export const mockOrdersList = [
  { id: 'ord-1', orderId: 'ORD-1099', customerEmail: 'customer@renu.com', product: 'Biome Care', qty: '10 Gal', amt: 1240, status: 'PENDING', date: '2026-10-08' },
  { id: 'ord-2', orderId: 'ORD-1098', customerEmail: 'john@grower.com', product: 'N-CARE', qty: '25 Gal', amt: 6250, status: 'ACCEPTED', date: '2026-10-07' },
  { id: 'ord-3', orderId: 'ORD-1097', customerEmail: 'sarah@farms.com', product: 'K-RUSH', qty: '5 Gal', amt: 900, status: 'PENDING', date: '2026-10-06' },
];

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
}): Promise<AppUser> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const password = params.password || 'Customer123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const name: string = (params.name && params.name.trim()) || normalizedEmail.split('@')[0] || 'User';
  const role: string = params.role || 'Grower';
  const approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = params.approvalStatus || 'PENDING';

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
      entity: { name: `${name}'s Farm` }
    });
  }

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
}) {
  const normalizedEmail = updates.email ? updates.email.trim().toLowerCase() : undefined;
  let found = mockUsers.find(u => u.id === id || (normalizedEmail && u.email.toLowerCase() === normalizedEmail));
  if (found) {
    if (updates.name) found.name = updates.name.trim();
    if (updates.email) found.email = updates.email.trim().toLowerCase();
    if (updates.role) found.role = updates.role;
    if (updates.approvalStatus) found.approvalStatus = updates.approvalStatus;
    if (updates.password) {
      found.passwordHash = await bcrypt.hash(updates.password, 10);
    }
    return found;
  }

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
