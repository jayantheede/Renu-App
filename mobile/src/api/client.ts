import AsyncStorage from '@react-native-async-storage/async-storage';

// Known production mapping: Render frontend → Render backend
const RENDER_BACKEND_URL = 'https://renu-app-backend.onrender.com';
const RENDER_FRONTEND_HOSTS = ['renu-app-1.onrender.com', 'renu-app.onrender.com'];

export const getApiBaseUrl = async (): Promise<string> => {
  try {
    const custom = await AsyncStorage.getItem('@custom_api_url');
    if (custom && custom.trim()) {
      const clean = custom.trim().replace(/\/+$/, '');
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
  } catch (e) {}

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // On Render production frontend → use Render backend
    if (RENDER_FRONTEND_HOSTS.some(h => hostname === h || hostname.endsWith('.onrender.com'))) {
      return `${RENDER_BACKEND_URL}/api`;
    }
    // Local dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
  }

  const RENDER_URL = process.env.EXPO_PUBLIC_RENDER_BACKEND_URL;
  const RAW_URL = (RENDER_URL || process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return RAW_URL.endsWith('/api') ? RAW_URL : `${RAW_URL}/api`;
};

export const setCustomApiUrl = async (url: string) => {
  if (!url || !url.trim()) {
    await AsyncStorage.removeItem('@custom_api_url');
  } else {
    await AsyncStorage.setItem('@custom_api_url', url.trim());
  }
};

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('@auth_token');
  const baseUrl = await getApiBaseUrl();

  const headers: Record<string, any> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error: any) {
    console.warn(`[Network Offline / Error] ${endpoint}:`, error.message);
    throw error;
  }

  if (response.status === 401) {
    await AsyncStorage.removeItem('@auth_token');
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API Request Failed');
  }

  return data;
};

// -----------------------------------------------------------------------
// Offline Caching Helper
// -----------------------------------------------------------------------
async function getCachedOrFetch<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const result = await fetcher();
    if (result) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(result)).catch(() => {});
    }
    return result;
  } catch (err) {
    // Attempt to load from offline cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (cacheErr) {}
    throw err;
  }
}

// -----------------------------------------------------------------------
// Auth Methods
// -----------------------------------------------------------------------
export const login = async (email: string, password: string) => {
  const res = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    await AsyncStorage.setItem('@auth_token', res.token);
    await AsyncStorage.setItem('userToken', res.token);
  }
  return res;
};

export const verifyMfa = async (email: string, code: string) => {
  const res = await apiClient('/auth/verify-mfa', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  if (res.token) {
    await AsyncStorage.setItem('@auth_token', res.token);
    await AsyncStorage.setItem('userToken', res.token);
  }
  return res;
};

export const resendMfa = (email: string) => apiClient('/auth/resend-mfa', {
  method: 'POST',
  body: JSON.stringify({ email }),
});

export const toggleMfa = (email: string, enabled: boolean) => apiClient('/auth/toggle-mfa', {
  method: 'POST',
  body: JSON.stringify({ email, enabled }),
});

export const requestPasswordReset = (email: string) => apiClient('/auth/forgot-password', {
  method: 'POST',
  body: JSON.stringify({ email }),
});

export const updateProfile = (data: any) => apiClient('/app/profile', { method: 'PUT', body: JSON.stringify(data) });

// -----------------------------------------------------------------------
// Dashboards
// -----------------------------------------------------------------------
export const fetchGrowerDashboard = () => apiClient('/app/grower/dashboard');
export const fetchAdminDashboard = () => apiClient('/app/admin/dashboard');

// -----------------------------------------------------------------------
// Ranches, Blocks & Tanks (with offline cache)
// -----------------------------------------------------------------------
export const fetchRanches = async () => {
  return getCachedOrFetch('@cache_ranches', () => apiClient('/app/ranches'));
};

export const submitRanch = async (data: any) => {
  const res = await apiClient('/app/ranches', { method: 'POST', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const updateRanch = async (id: string, data: any) => {
  const res = await apiClient(`/app/ranches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const deleteRanch = async (id: string) => {
  const res = await apiClient(`/app/ranches/${id}`, { method: 'DELETE' });
  fetchRanches().catch(() => {});
  return res;
};

// Blocks
export const submitBlock = async (ranchId: string, blockData: any) => {
  const res = await apiClient(`/app/ranches/${ranchId}/blocks`, { method: 'POST', body: JSON.stringify(blockData) });
  fetchRanches().catch(() => {});
  return res;
};

export const updateBlock = async (blockId: string, blockData: any) => {
  const res = await apiClient(`/app/blocks/${blockId}`, { method: 'PUT', body: JSON.stringify(blockData) });
  fetchRanches().catch(() => {});
  return res;
};

export const deleteBlock = async (blockId: string) => {
  const res = await apiClient(`/app/blocks/${blockId}`, { method: 'DELETE' });
  fetchRanches().catch(() => {});
  return res;
};

// Tanks
export const submitTankSetup = async (data: any) => {
  const res = await apiClient(`/app/ranches/${data.ranchId}/tanks`, { method: 'POST', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const updateTank = async (tankId: string, data: any) => {
  const res = await apiClient(`/app/tanks/${tankId}`, { method: 'PUT', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const deleteTank = async (tankId: string) => {
  const res = await apiClient(`/app/tanks/${tankId}`, { method: 'DELETE' });
  fetchRanches().catch(() => {});
  return res;
};

export const addTankMedicine = async (tankId: string, data: any) => {
  const res = await apiClient(`/app/tanks/${tankId}/medicines`, { method: 'POST', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const deleteTankMedicine = async (tankId: string, medId: string) => {
  const res = await apiClient(`/app/tanks/${tankId}/medicines/${medId}`, { method: 'DELETE' });
  fetchRanches().catch(() => {});
  return res;
};

export const updateTankTracker = async (tankId: string, data: any) => {
  const res = await apiClient(`/app/tanks/${tankId}/trackers`, { method: 'POST', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const addTankReport = async (tankId: string, data: any) => {
  const res = await apiClient(`/app/tanks/${tankId}/reports`, { method: 'POST', body: JSON.stringify(data) });
  fetchRanches().catch(() => {});
  return res;
};

export const deleteTankReport = async (tankId: string, reportId: string) => {
  const res = await apiClient(`/app/tanks/${tankId}/reports/${reportId}`, { method: 'DELETE' });
  fetchRanches().catch(() => {});
  return res;
};

// -----------------------------------------------------------------------
// Deliveries (with offline cache)
// -----------------------------------------------------------------------
export const fetchDeliveries = async () => {
  return getCachedOrFetch('@cache_deliveries', () => apiClient('/app/deliveries'));
};

export const fetchOrders = fetchDeliveries; // Backward compatibility alias

export const submitDelivery = async (data: any) => {
  const res = await apiClient('/app/deliveries', { method: 'POST', body: JSON.stringify(data) });
  fetchDeliveries().catch(() => {});
  return res;
};

export const submitOrder = submitDelivery; // Backward compatibility alias

export const updateDeliveryStatus = async (
  id: string,
  status: 'Scheduled' | 'Out for delivery' | 'Delivered' | 'Cancelled',
  extra?: { deliveredGallons?: number; deliveredDate?: string; cancelReason?: string; optimoroute?: any }
) => {
  const res = await apiClient(`/app/deliveries/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, ...extra })
  });
  fetchDeliveries().catch(() => {});
  return res;
};

export const updateDelivery = async (id: string, data: any) => {
  const res = await apiClient(`/app/deliveries/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  fetchDeliveries().catch(() => {});
  return res;
};

export const fetchAdminOrders = fetchDeliveries;

// -----------------------------------------------------------------------
// Invoices (Hand-entered from QuickBooks, with offline cache)
// -----------------------------------------------------------------------
export const fetchInvoices = async () => {
  return getCachedOrFetch('@cache_invoices', () => apiClient('/app/invoices'));
};

export const submitInvoice = async (data: any) => {
  const res = await apiClient('/app/invoices', { method: 'POST', body: JSON.stringify(data) });
  fetchInvoices().catch(() => {});
  return res;
};

export const markInvoicePaid = async (id: string, paymentDate?: string) => {
  const res = await apiClient(`/app/invoices/${id}/pay`, {
    method: 'PUT',
    body: JSON.stringify({ paymentDate })
  });
  fetchInvoices().catch(() => {});
  return res;
};

export const voidInvoice = async (id: string) => {
  const res = await apiClient(`/app/invoices/${id}/void`, { method: 'PUT' });
  fetchInvoices().catch(() => {});
  return res;
};

export const updateInvoice = async (id: string, data: any) => {
  const res = await apiClient(`/app/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  fetchInvoices().catch(() => {});
  return res;
};

// -----------------------------------------------------------------------
// Year-End Purchase Summary & Reports
// -----------------------------------------------------------------------
export const fetchYearEndSummary = async (year: number, customerId?: string) => {
  const q = customerId ? `?year=${year}&customerId=${encodeURIComponent(customerId)}` : `?year=${year}`;
  return apiClient(`/app/reports/year-end-summary${q}`);
};

export const exportReportCsv = async (type: 'deliveries' | 'invoices', startDate: string, endDate: string) => {
  const baseUrl = await getApiBaseUrl();
  const token = await AsyncStorage.getItem('@auth_token');
  const url = `${baseUrl}/app/reports/csv?type=${type}&startDate=${startDate}&endDate=${endDate}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  return res.text();
};

// -----------------------------------------------------------------------
// Feature Flags
// -----------------------------------------------------------------------
export const fetchFeatureFlags = async (customerId?: string) => {
  const q = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
  return getCachedOrFetch(`@cache_feature_flags_${customerId || 'global'}`, () =>
    apiClient(`/app/feature-flags${q}`)
  );
};

export const saveFeatureFlags = async (data: { global?: any; customerId?: string; customerOverrides?: any }) => {
  return apiClient('/app/feature-flags', { method: 'POST', body: JSON.stringify(data) });
};

// -----------------------------------------------------------------------
// Admin Customer Management
// -----------------------------------------------------------------------
export const fetchAdminCustomers = async () => {
  return apiClient('/app/admin/customers');
};

export const createAdminCustomer = async (data: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
}) => {
  return apiClient('/app/admin/customers', { method: 'POST', body: JSON.stringify(data) });
};

export const resetCustomerPassword = async (id: string, password: string) => {
  return apiClient(`/app/admin/customers/${id}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({ password })
  });
};

export const updateCustomer = async (id: string, data: any) => {
  return apiClient(`/app/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

// -----------------------------------------------------------------------
// Products (NO PRICE)
// -----------------------------------------------------------------------
export const fetchProducts = async () => {
  return apiClient('/app/products');
};

export const submitProduct = async (data: {
  name: string;
  description: string;
  analysis?: string;
  brandLabel?: string;
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
}) => {
  return apiClient('/app/admin/products', { method: 'POST', body: JSON.stringify(data) });
};

export const updateProduct = async (id: string, data: any) => {
  return apiClient(`/app/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const deleteProduct = async (id: string) => {
  return apiClient(`/app/admin/products/${id}`, { method: 'DELETE' });
};

// -----------------------------------------------------------------------
// Nutrition Programs (Phase 2 - Section 4)
// -----------------------------------------------------------------------
export const fetchPrograms = async (ranchId?: string) => {
  const q = ranchId ? `?ranchId=${encodeURIComponent(ranchId)}` : '';
  return getCachedOrFetch(`@cache_programs_${ranchId || 'all'}`, () =>
    apiClient(`/app/programs${q}`)
  );
};

export const submitProgram = async (data: any) => {
  const res = await apiClient('/app/programs', { method: 'POST', body: JSON.stringify(data) });
  fetchPrograms().catch(() => {});
  return res;
};

export const updateProgram = async (id: string, data: any) => {
  const res = await apiClient(`/app/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  fetchPrograms().catch(() => {});
  return res;
};

export const deleteProgram = async (id: string) => {
  const res = await apiClient(`/app/programs/${id}`, { method: 'DELETE' });
  fetchPrograms().catch(() => {});
  return res;
};

// -----------------------------------------------------------------------
// Soil & Tissue Samples and Custom Recommendations (Phase 2 - Section 5)
// -----------------------------------------------------------------------
export const fetchSamples = async (ranchId?: string, blockId?: string) => {
  const params = new URLSearchParams();
  if (ranchId) params.append('ranchId', ranchId);
  if (blockId) params.append('blockId', blockId);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiClient(`/app/samples${q}`);
};

export const submitSample = async (data: any) => {
  return apiClient('/app/samples', { method: 'POST', body: JSON.stringify(data) });
};

export const updateSampleValues = async (id: string, values: any) => {
  return apiClient(`/app/samples/${id}/values`, { method: 'PUT', body: JSON.stringify(values) });
};

export const submitRecommendation = async (sampleId: string, data: any) => {
  return apiClient(`/app/samples/${sampleId}/recommendation`, { method: 'POST', body: JSON.stringify(data) });
};

export const replyToRecommendation = async (sampleId: string, question: string) => {
  return apiClient(`/app/samples/${sampleId}/reply`, { method: 'POST', body: JSON.stringify({ question }) });
};

// -----------------------------------------------------------------------
// Otodata Tank Telemetry (Phase 2 - Section 3)
// -----------------------------------------------------------------------
export const fetchTankTelemetry = async (tankId: string) => {
  return apiClient(`/app/tanks/${tankId}/telemetry`);
};

export const updateTankTelemetry = async (tankId: string, data: any) => {
  return apiClient(`/app/tanks/${tankId}/telemetry`, { method: 'PUT', body: JSON.stringify(data) });
};

// -----------------------------------------------------------------------
// Monthly Reports (Section A6.7)
// -----------------------------------------------------------------------
export const fetchMonthlyReports = async (monthOrYear: string) => {
  return apiClient(`/app/reports/monthly?period=${encodeURIComponent(monthOrYear)}`);
};

// -----------------------------------------------------------------------
// Block Import / Export (Section A11)
// -----------------------------------------------------------------------
export const importBlocks = async (ranchId: string, blocks: any[]) => {
  return apiClient(`/app/ranches/${ranchId}/blocks/import`, {
    method: 'POST',
    body: JSON.stringify({ blocks })
  });
};

export const exportBlocks = async (ranchId?: string) => {
  const q = ranchId ? `?ranchId=${encodeURIComponent(ranchId)}` : '';
  return apiClient(`/app/blocks/export${q}`);
};

// -----------------------------------------------------------------------
// Admin Approvals, Notifications & Misc
// -----------------------------------------------------------------------
export const fetchCustomers = fetchAdminCustomers;
export const fetchAdminApprovals = () => apiClient('/app/admin/approvals');
export const approveCustomer = (id: string, status: string) => apiClient(`/app/admin/approvals/customer/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveRanch = (id: string, status: string) => apiClient(`/app/admin/approvals/ranch/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveTank = (id: string, status: string) => apiClient(`/app/admin/approvals/tank/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const fetchAdminNotifications = () => apiClient('/app/admin/notifications');
export const markNotificationsRead = () => apiClient('/app/admin/notifications/mark-read', { method: 'POST' });
export const exportData = (entity: string) => apiClient(`/app/export/${entity}`);
export const importData = (entity: string, items: any[]) => apiClient(`/app/import/${entity}`, { method: 'POST', body: JSON.stringify({ items }) });

// Backward compatibility stubs for legacy screens
export const payOrder = (id: string) => updateDeliveryStatus(id, 'Delivered');
export const cancelOrder = (id: string, reason: string) => updateDeliveryStatus(id, 'Cancelled', { cancelReason: reason });
export const updateOrderTracking = (id: string, status: any, step: number) => updateDeliveryStatus(id, status);
export const acceptAdminOrder = (id: string) => apiClient(`/app/admin/orders/${id}/accept`, { method: 'POST' });
export const acceptOrderAndEmail = acceptAdminOrder;
export const confirmDeliveryDetails = (id: string, details: {
  deliveryAddress: string;
  gateCode?: string;
  contactOnArrival?: string;
  contactPhone?: string;
  deliveryWindow?: string;
  notes?: string;
}) => apiClient(`/app/orders/${id}/confirm-delivery`, { method: 'POST', body: JSON.stringify(details) });
export const submitApplicationLog = (data: any) => apiClient('/app/utilization', { method: 'POST', body: JSON.stringify(data) });
export const fetchTasks = () => apiClient('/app/tasks');
export const createAdminTask = (data: any) => apiClient('/app/admin/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTaskStatus = (id: string, status: string, empEmail?: string) => apiClient(`/app/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, empEmail }) });
export const fetchLabResults = () => apiClient('/app/lab-results');
export const submitLabResult = (data: any) => apiClient('/app/lab-results', { method: 'POST', body: JSON.stringify(data) });
export const assignGrowerToEmployee = (customerId: string, employeeEmail: string) => apiClient('/app/admin/assign-grower', { method: 'POST', body: JSON.stringify({ customerId, employeeEmail }) });
export const toggleRanchVisibility = (ranchId: string, hidden: boolean) => apiClient(`/app/ranches/${ranchId}/visibility`, { method: 'PUT', body: JSON.stringify({ hidden }) });
export const fetchPlatformSettings = () => apiClient('/app/admin/settings');
export const savePlatformSettings = (settings: any) => apiClient('/app/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
export const fetchAuditLogs = () => apiClient('/app/admin/audit-logs');
export const resetSystemCache = () => apiClient('/app/admin/reset-cache', { method: 'POST' });
export const fetchMessages = () => apiClient('/app/messages');
export const sendMessage = (data: any) => apiClient('/app/messages', { method: 'POST', body: JSON.stringify(data) });
export const markMessageRead = (id: string) => apiClient(`/app/messages/${id}/read`, { method: 'PUT' });

// -----------------------------------------------------------------------
// Deferred Launch Capabilities API Methods
// -----------------------------------------------------------------------
export const fetchDocuments = () => apiClient('/app/documents');
export const uploadDocument = (data: any) => apiClient('/app/documents/upload', { method: 'POST', body: JSON.stringify(data) });
export const deleteDocument = (id: string) => apiClient(`/app/documents/${id}`, { method: 'DELETE' });
export const signContract = (documentId: string, signatureName: string) => apiClient('/app/documents/sign', { method: 'POST', body: JSON.stringify({ documentId, signatureName }) });
export const fetchAuditPack = () => apiClient('/app/documents/audit-pack');

export const fetchComplianceReport = (season?: number) => apiClient(`/app/compliance/nitrogen-report?season=${season || 2026}`);
export const updateBlockYield = (blockId: string, yieldPerAcre: number) => apiClient('/app/compliance/yield', { method: 'PUT', body: JSON.stringify({ blockId, yieldPerAcre }) });

export const fetchQuickBooksStatus = () => apiClient('/app/quickbooks/status');
export const syncQuickBooks = () => apiClient('/app/quickbooks/sync', { method: 'POST' });

export const payInvoiceOnline = (invoiceId: string, paymentData: { paymentMethod: string; paymentDetails?: any; paymentDate?: string }) =>
  apiClient(`/app/invoices/${invoiceId}/pay`, { method: 'PUT', body: JSON.stringify(paymentData) });

export const submitOrderRequest = (data: {
  productId: string;
  product: string;
  gallons: number;
  ranchId: string;
  ranchName: string;
  tankId?: string;
  tankName?: string;
  deliveryWindow?: string;
  notes?: string;
}) => apiClient('/app/orders', { method: 'POST', body: JSON.stringify(data) });

