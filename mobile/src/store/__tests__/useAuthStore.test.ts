import { useAuthStore } from '../useAuthStore';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isLoggedIn: false,
      role: 'client'
    });
  });

  it('should start with logged out state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('should set session correctly', async () => {
    await useAuthStore.getState().setSession({ id: 'cust_123', email: 'test@test.com', role: 'client', name: 'John Grower' }, 'mock_token');
    const state = useAuthStore.getState();
    
    expect(state.user).not.toBeNull();
    expect(state.token).toBe('mock_token');
    expect(state.user?.name).toBe('John Grower');
    expect(state.isLoggedIn).toBe(true);
  });

  it('should logout correctly', async () => {
    // Login first
    await useAuthStore.getState().setSession({ id: 'cust_123', email: 'test@test.com', role: 'client', name: 'John Grower' }, 'mock_token');
    
    // Then logout
    await useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });
});
