import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  apiClient,
  FALLBACK_PRODUCTION_BACKEND_URL,
  getApiBaseUrl,
  PRIMARY_PRODUCTION_BACKEND_URL,
  resetPinnedApiBaseUrl,
} from '../client';

describe('API client production resolution and failover', () => {
  const originalDev = (global as any).__DEV__;
  const originalEnv = { ...process.env };
  const originalPlatformOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    resetPinnedApiBaseUrl();
    process.env = { ...originalEnv };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    (global as any).__DEV__ = false;
  });

  afterAll(() => {
    (global as any).__DEV__ = originalDev;
    process.env = originalEnv;
    Object.defineProperty(Platform, 'OS', { value: originalPlatformOs, configurable: true });
  });

  it('ignores localhost env variables in native production builds and falls back to live HTTPS backend', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
    process.env.EXPO_PUBLIC_BACKEND_URL = 'http://127.0.0.1:3000';
    delete process.env.EXPO_PUBLIC_RENDER_BACKEND_URL;

    const url = await getApiBaseUrl();
    expect(url).toBe(`${PRIMARY_PRODUCTION_BACKEND_URL}/api`);
  });

  it('respects custom @custom_api_url override when configured', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(key === '@custom_api_url' ? 'https://custom.example.com/' : null)
    );

    const url = await getApiBaseUrl();
    expect(url).toBe('https://custom.example.com/api');
  });

  it('fails over cleanly to secondary production backend on native transport error and pins healthy host', async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
    delete process.env.EXPO_PUBLIC_RENDER_BACKEND_URL;

    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed: UnexpectedException: Could not connect to the server.'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ mfaRequired: true })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ token: 'jwt-ok', user: { id: '1' } })),
      });
    global.fetch = fetchMock as any;

    const loginRes = await apiClient('/auth/login', { method: 'POST', body: '{}' });
    expect(loginRes.mfaRequired).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe(`${PRIMARY_PRODUCTION_BACKEND_URL}/api/auth/login`);
    expect(fetchMock.mock.calls[1][0]).toBe(`${FALLBACK_PRODUCTION_BACKEND_URL}/api/auth/login`);

    // Subsequent MFA verification stays pinned to the failover host that generated the OTP
    const mfaRes = await apiClient('/auth/verify-mfa', { method: 'POST', body: '{}' });
    expect(mfaRes.token).toBe('jwt-ok');
    expect(fetchMock.mock.calls[2][0]).toBe(`${FALLBACK_PRODUCTION_BACKEND_URL}/api/auth/verify-mfa`);
  });

  it('does not fail over on HTTP 401 and surfaces backend error message cleanly', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ error: 'Invalid email or password' })),
    });
    global.fetch = fetchMock as any;

    await expect(apiClient('/auth/login', { method: 'POST', body: '{}' })).rejects.toThrow(
      'Invalid email or password'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles non-JSON plain text responses without crashing with JSON SyntaxError', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Too many requests from this IP, please try again later'),
    });
    global.fetch = fetchMock as any;

    await expect(apiClient('/auth/login', { method: 'POST', body: '{}' })).rejects.toThrow(
      'Too many requests from this IP, please try again later'
    );
  });
});

