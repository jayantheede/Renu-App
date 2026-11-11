import { Platform } from 'react-native';

const PRODUCTION_BACKEND_URL = 'https://renu-app-backend.onrender.com';

const rawEnvUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_RENDER_BACKEND_URL;

const isLocalhost = rawEnvUrl ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(rawEnvUrl.trim()) : false;
const isProd = typeof __DEV__ !== 'undefined' ? !__DEV__ : process.env.NODE_ENV === 'production';

const API_URL =
  Platform.OS === 'web' && typeof window !== 'undefined' && window.location
    ? window.location.origin
    : (!rawEnvUrl || (isProd && isLocalhost) ? PRODUCTION_BACKEND_URL : rawEnvUrl).replace(/\/+$/, '');

export const fetchHomeData = async (entityId?: string) => {
  const url = entityId ? `${API_URL}/api/portal/home?entityId=${entityId}` : `${API_URL}/api/portal/home`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch home data');
  return res.json();
};

export const fetchEntities = async () => {
  const res = await fetch(`${API_URL}/api/portal/entities`);
  if (!res.ok) throw new Error('Failed to fetch entities');
  return res.json();
};

export const fetchRanches = async () => {
  const res = await fetch(`${API_URL}/api/portal/ranches`);
  if (!res.ok) throw new Error('Failed to fetch ranches');
  return res.json();
};

export const fetchRanch = async (id: string) => {
  const res = await fetch(`${API_URL}/api/portal/ranches/${id}`);
  if (!res.ok) throw new Error('Failed to fetch ranch');
  return res.json();
};

export const fetchInvoices = async () => {
  const res = await fetch(`${API_URL}/api/portal/invoices`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
};

export const fetchOrders = async () => {
  const res = await fetch(`${API_URL}/api/portal/orders`);
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
};

export const fetchMessages = async () => {
  const res = await fetch(`${API_URL}/api/portal/messages`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
};
