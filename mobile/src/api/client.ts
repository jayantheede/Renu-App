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

  // React Native app: use EXPO_PUBLIC_RENDER_BACKEND_URL if set, else EXPO_PUBLIC_API_URL
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
    console.error(`[Network Error] Failed to reach ${baseUrl}${endpoint}:`, error.message);
    throw new Error(
      `Cannot connect to backend server at ${baseUrl}.\n\nPlease ensure your local backend is running on port 3000, or verify the deployed server URL.`
    );
  }

  if (response.status === 401) {
    // Handle token expiration globally (e.g., clear storage, trigger logout)
    await AsyncStorage.removeItem('@auth_token');
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || 'API Request Failed');
  }

  return data;
};

// Phase 2: Auth Methods
export const login = async (email: string, password: string) => {
  const res = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (res.token) {
    await AsyncStorage.setItem('userToken', res.token);
  }
  return res;
};

// Phase 4: Dashboard Methods
export const fetchGrowerDashboard = () => apiClient('/app/grower/dashboard');
export const fetchManagerDashboard = () => apiClient('/app/manager/dashboard');
export const fetchOwnerDashboard = () => apiClient('/app/owner/dashboard');
export const fetchCEODashboard = () => apiClient('/app/ceo/dashboard');

// Phase 8: Invoice Methods
export const fetchInvoices = () => apiClient('/app/invoices');

export const fetchRanches = () => apiClient('/app/ranches');
export const submitRanch = (data: any) => apiClient('/app/ranches', { method: 'POST', body: JSON.stringify(data) });

export const submitTankSetup = (data: any) => apiClient('/app/tank-setups', { method: 'POST', body: JSON.stringify(data) });

export const updateProfile = (data: any) => apiClient('/app/profile', { method: 'PUT', body: JSON.stringify(data) });

export const fetchOrders = () => apiClient('/app/orders');
export const submitOrder = (data: any) => apiClient('/app/orders', { method: 'POST', body: JSON.stringify(data) });

export const fetchMessages = () => apiClient('/app/messages');
export const sendMessage = (data: { title: string; body: string; toEmail?: string }) =>
  apiClient('/app/messages', { method: 'POST', body: JSON.stringify(data) });
export const fetchProducts = () => apiClient('/app/products');

// Admin Methods
export const fetchAdminApprovals = () => apiClient('/app/admin/approvals');
export const approveCustomer = (id: string, status: string) => apiClient(`/app/admin/approvals/customer/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveRanch = (id: string, status: string) => apiClient(`/app/admin/approvals/ranch/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveTank = (id: string, status: string) => apiClient(`/app/admin/approvals/tank/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const acceptAdminOrder = (id: string) => apiClient(`/app/admin/orders/${id}/accept`, { method: 'POST' });
export const acceptOrderAndEmail = (id: string) => apiClient(`/app/admin/orders/${id}/accept-and-email`, { method: 'POST' });
export const payOrder = (id: string) => apiClient(`/app/orders/${id}/pay`, { method: 'POST' });
export const updateOrderTracking = (id: string, status: string, step: number) => apiClient(`/app/admin/orders/${id}/tracking`, { method: 'PUT', body: JSON.stringify({ status, step }) });

export const submitProduct = (data: any) => apiClient('/app/admin/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (id: string, data: any) => apiClient(`/app/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const updateProductPrice = (id: string, price: number) => apiClient(`/app/admin/products/${id}`, { method: 'PUT', body: JSON.stringify({ price }) });
export const deleteProduct = (id: string) => apiClient(`/app/admin/products/${id}`, { method: 'DELETE' });
export const fetchPlatformSettings = () => apiClient('/app/admin/settings');
export const savePlatformSettings = (settings: any) => apiClient('/app/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
export const fetchAuditLogs = () => apiClient('/app/admin/audit-logs');
export const resetSystemCache = () => apiClient('/app/admin/reset-cache', { method: 'POST' });
export const updateCustomer = (id: string, data: any) => apiClient(`/app/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// Tasks & Agronomy Field Operations
export const fetchTasks = () => apiClient('/app/tasks');
export const createAdminTask = (data: any) => apiClient('/app/admin/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTaskStatus = (id: string, status: string, empEmail?: string) => apiClient(`/app/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, empEmail }) });

// Lab Results & Grower Assignments
export const fetchLabResults = () => apiClient('/app/lab-results');
export const submitLabResult = (data: any) => apiClient('/app/lab-results', { method: 'POST', body: JSON.stringify(data) });
export const assignGrowerToEmployee = (customerId: string, employeeEmail: string) => apiClient('/app/admin/assign-grower', { method: 'POST', body: JSON.stringify({ customerId, employeeEmail }) });
export const toggleRanchVisibility = (ranchId: string, hidden: boolean) => apiClient(`/app/ranches/${ranchId}/visibility`, { method: 'PUT', body: JSON.stringify({ hidden }) });

// Notifications
export const fetchAdminNotifications = () => apiClient('/app/admin/notifications');
export const markNotificationsRead = () => apiClient('/app/admin/notifications/mark-read', { method: 'POST' });

// Universal Export / Import
export const exportData = (entity: string) => apiClient(`/app/export/${entity}`);
export const importData = (entity: string, items: any[]) => apiClient(`/app/import/${entity}`, { method: 'POST', body: JSON.stringify({ items }) });



