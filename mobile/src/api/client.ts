import AsyncStorage from '@react-native-async-storage/async-storage';

const RAW_URL = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API_BASE_URL = RAW_URL.endsWith('/api') ? RAW_URL : `${RAW_URL}/api`;

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('@auth_token');
  
  const headers: Record<string, any> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error: any) {
    console.error(`[Network Error] Failed to reach ${API_BASE_URL}${endpoint}:`, error.message);
    throw new Error(
      `Cannot connect to backend server at ${API_BASE_URL}.\n\nPlease ensure your Android phone is on the SAME Wi-Fi network as your Mac, and that your Mac's Firewall is turned OFF (System Settings > Network > Firewall).`
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
export const fetchProducts = () => apiClient('/app/products');

// Admin Methods
export const fetchAdminApprovals = () => apiClient('/app/admin/approvals');
export const approveCustomer = (id: string, status: string) => apiClient(`/app/admin/approvals/customer/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveRanch = (id: string, status: string) => apiClient(`/app/admin/approvals/ranch/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const approveTank = (id: string, status: string) => apiClient(`/app/admin/approvals/tank/${id}`, { method: 'POST', body: JSON.stringify({ status }) });
export const acceptAdminOrder = (id: string) => apiClient(`/app/admin/orders/${id}/accept`, { method: 'POST' });
export const submitProduct = (data: any) => apiClient('/app/admin/products', { method: 'POST', body: JSON.stringify(data) });
export const deleteProduct = (id: string) => apiClient(`/app/admin/products/${id}`, { method: 'DELETE' });
export const fetchPlatformSettings = () => apiClient('/app/admin/settings');
export const savePlatformSettings = (settings: any) => apiClient('/app/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
export const fetchAuditLogs = () => apiClient('/app/admin/audit-logs');
export const resetSystemCache = () => apiClient('/app/admin/reset-cache', { method: 'POST' });
export const updateCustomer = (id: string, data: any) => apiClient(`/app/admin/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) });


