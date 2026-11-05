/**
 * OptimoRoute Integration Service
 * API credentials: Rgundavelli@gmail.com / Montiano5138#
 * Docs: https://optimoroute.com/api-documentation/
 */

import {
  OrderItem,
  mockOrdersList,
  updateDeliveryStatus,
  saveStore,
  addAuditLog,
  addAdminNotification,
  mockPlatformSettings
} from './usersStore';
import {
  sendDeliveryStatusEmailToCustomer,
  sendDeliveryCompletedEmailToAdmin
} from './orderEmailService';

const BASE_URL = process.env.OPTIMOROUTE_BASE_URL || 'https://api.optimoroute.com/v1';

export function getOptimoRouteApiKey(): string {
  return process.env.OPTIMOROUTE_API_KEY || '';
}

// ---------------------------------------------------------------------------
// Low-level HTTP helper
// ---------------------------------------------------------------------------
async function orFetch(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: object
): Promise<any> {
  const apiKey = getOptimoRouteApiKey();
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = apiKey
    ? `${BASE_URL}${endpoint}${sep}key=${encodeURIComponent(apiKey)}`
    : `${BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // OptimoRoute supports HTTP Basic Auth; key goes in the Authorization header
  if (apiKey) {
    headers['Authorization'] = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
  }

  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  let resp: Response;
  try {
    resp = await fetch(url, opts);
  } catch (err: any) {
    throw new Error(`[OptimoRoute] Network error: ${err.message}`);
  }

  const text = await resp.text();
  let json: any = {};
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!resp.ok) {
    throw new Error(`[OptimoRoute] ${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Types returned to callers
// ---------------------------------------------------------------------------
export interface OptimoRouteOrder {
  id: string;
  date?: string;
  orderNo?: string;
  status?: string;
  driverName?: string;
  driverPhone?: string;
  estimatedArrival?: string;
  completionTime?: string;
  raw?: any;
}

// ---------------------------------------------------------------------------
// 1. Create / schedule a delivery order in OptimoRoute
// ---------------------------------------------------------------------------
export async function createOptimoRouteOrder(order: OrderItem): Promise<OptimoRouteOrder | null> {
  if (!getOptimoRouteApiKey()) {
    console.warn('[OptimoRoute] OPTIMOROUTE_API_KEY not set – skipping order push');
    return null;
  }

  const payload = {
    operation: 'APPEND',
    orders: [
      {
        orderNo: order.orderId,
        date: order.deliveryWindow?.split(' ')[0] || new Date().toISOString().split('T')[0],
        timeWindow: {
          twFrom: '08:00',
          twTo: '17:00',
        },
        location: {
          address: order.deliveryAddress || `${order.ranchName || 'Ranch'}, CA`,
          // latitude / longitude can be added when geocoding is available
        },
        duration: 30, // estimated service duration in minutes
        priority: 'L', // L=Low, M=Medium, H=High
        notes: [
          order.notes,
          order.gateCode ? `Gate code: ${order.gateCode}` : null,
          order.contactOnArrival ? `Contact: ${order.contactOnArrival}` : null,
          order.contactPhone ? `Phone: ${order.contactPhone}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
        customField1: order.ranchName || '',
        customField2: order.tankName || '',
        customField3: `${order.gallons || 0} Gal – ${order.product}`,
      },
    ],
  };

  try {
    const result = await orFetch('/create_order', 'POST', payload);
    const created = result.orders?.[0] || result;
    console.log(`[OptimoRoute] Order created for ${order.orderId}:`, created);
    return {
      id: created.id || order.orderId,
      orderNo: order.orderId,
      status: 'scheduled',
      raw: created,
    };
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to create order:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. Get real-time status of an order from OptimoRoute
// ---------------------------------------------------------------------------
export async function getOptimoRouteOrderStatus(optimoRouteOrderId: string): Promise<OptimoRouteOrder | null> {
  if (!getOptimoRouteApiKey()) return null;
  try {
    const result = await orFetch(`/get_order_completion_details?includeOrderData=true`, 'POST', {
      orders: [{ orderNo: optimoRouteOrderId }],
    });
    const order = result.orders?.[0];
    if (!order) return null;
    return {
      id: order.id || optimoRouteOrderId,
      orderNo: order.orderNo || optimoRouteOrderId,
      status: order.status?.value,
      driverName: order.assignedTo?.name || order.driverName,
      driverPhone: order.assignedTo?.phone,
      estimatedArrival: order.scheduledAt,
      completionTime: order.completionDetails?.endTime,
      raw: order,
    };
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to get order status:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 3. Get all orders for a given date
// ---------------------------------------------------------------------------
export async function getOptimoRouteOrdersForDate(date: string): Promise<OptimoRouteOrder[]> {
  if (!getOptimoRouteApiKey()) return [];
  try {
    const result = await orFetch(`/search_orders?date=${date}`, 'GET');
    const list = result.orders || [];
    return list.map((o: any) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status?.value,
      driverName: o.assignedTo?.name,
      driverPhone: o.assignedTo?.phone,
      estimatedArrival: o.scheduledAt,
      raw: o,
    }));
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to list orders:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 4. Delete / cancel an order in OptimoRoute
// ---------------------------------------------------------------------------
export async function deleteOptimoRouteOrder(optimoRouteOrderId: string): Promise<boolean> {
  if (!getOptimoRouteApiKey()) return false;
  try {
    await orFetch(`/delete_order`, 'POST', { orderNo: optimoRouteOrderId });
    console.log(`[OptimoRoute] Order deleted: ${optimoRouteOrderId}`);
    return true;
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to delete order:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 5. Get list of available drivers / resources
// ---------------------------------------------------------------------------
export async function getOptimoRouteDrivers(): Promise<any[]> {
  if (!getOptimoRouteApiKey()) return [];
  try {
    const result = await orFetch('/get_drivers', 'GET');
    return result.drivers || [];
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to get drivers:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 6. Trigger route optimization for a given date
// ---------------------------------------------------------------------------
export async function optimizeRoutes(date: string): Promise<boolean> {
  if (!getOptimoRouteApiKey()) return false;
  try {
    await orFetch('/plan_routes', 'POST', { date, algorithm: 'OPTIMIZE' });
    console.log(`[OptimoRoute] Route optimization triggered for ${date}`);
    return true;
  } catch (err: any) {
    console.error('[OptimoRoute] Failed to optimize routes:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// 7. Scheduled sync for all open deliveries (every 5 minutes - Section 2.2)
// ---------------------------------------------------------------------------
export interface OptimoRouteSyncStatus {
  lastSyncTime: string;
  openDeliveriesChecked: number;
  deliveriesUpdated: number;
  errors: string[];
}

let lastOptimoSyncStatus: OptimoRouteSyncStatus = {
  lastSyncTime: new Date().toISOString(),
  openDeliveriesChecked: 0,
  deliveriesUpdated: 0,
  errors: []
};

export function getOptimoRouteSyncStatus(): OptimoRouteSyncStatus {
  return lastOptimoSyncStatus;
}

export async function syncOpenDeliveriesWithOptimoRoute(): Promise<OptimoRouteSyncStatus> {
  const syncTime = new Date().toISOString();
  const errors: string[] = [];
  let updatedCount = 0;

  // Filter open deliveries
  const openDeliveries = mockOrdersList.filter(
    o => o.status === 'Scheduled' || o.status === 'Out for delivery'
  );

  for (const delivery of openDeliveries) {
    if (!delivery.optimoRouteOrderId) continue;

    try {
      const orStatus = await getOptimoRouteOrderStatus(delivery.optimoRouteOrderId);
      if (!orStatus) continue;

      const currentStatus = delivery.status;
      const remoteStatus = (orStatus.status || '').toLowerCase();

      // Never overwrite manual Cancelled
      if (currentStatus === 'Cancelled') continue;

      if (remoteStatus.includes('out') || remoteStatus.includes('en_route') || remoteStatus.includes('started')) {
        if (currentStatus !== 'Out for delivery') {
          updateDeliveryStatus(delivery.id, 'Out for delivery');
          if (orStatus.driverName) delivery.driverName = orStatus.driverName;
          if (orStatus.driverPhone) delivery.driverPhone = orStatus.driverPhone;
          if (orStatus.estimatedArrival) delivery.estimatedArrival = orStatus.estimatedArrival;
          
          await sendDeliveryStatusEmailToCustomer(delivery, 'Out for delivery', delivery.estimatedArrival);
          updatedCount++;
        }
      } else if (remoteStatus.includes('deliver') || remoteStatus.includes('completed') || remoteStatus.includes('success')) {
        if (currentStatus !== 'Delivered') {
          updateDeliveryStatus(delivery.id, 'Delivered', {
            deliveredGallons: delivery.gallons,
            deliveredDate: orStatus.completionTime ? orStatus.completionTime.split('T')[0] : new Date().toISOString().split('T')[0]
          });
          if (orStatus.completionTime) delivery.completedTime = orStatus.completionTime;
          if (orStatus.driverName) delivery.driverName = orStatus.driverName;

          await sendDeliveryStatusEmailToCustomer(delivery, 'Delivered');
          await sendDeliveryCompletedEmailToAdmin(delivery);
          updatedCount++;
        }
      } else if (remoteStatus.includes('failed') || remoteStatus.includes('rejected')) {
        // Section 2.2: failed or rejected -> stays Out for delivery and raises admin alert with reason
        addAdminNotification({
          title: `⚠️ OptimoRoute Delivery Exception: ${delivery.orderId}`,
          message: `Stop failed or rejected in driver app. Reason: ${orStatus.raw?.reason || 'Access or road restriction'}. Order remains Out for Delivery.`,
          type: 'DELIVERY'
        });
      }
    } catch (e: any) {
      errors.push(`Order ${delivery.orderId} sync failed: ${e.message}`);
    }
  }

  saveStore();

  lastOptimoSyncStatus = {
    lastSyncTime: syncTime,
    openDeliveriesChecked: openDeliveries.length,
    deliveriesUpdated: updatedCount,
    errors
  };

  console.log(`[OptimoRoute] Sync completed at ${syncTime}. Checked: ${openDeliveries.length}, Updated: ${updatedCount}`);
  return lastOptimoSyncStatus;
}

