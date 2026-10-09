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
