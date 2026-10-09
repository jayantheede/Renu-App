import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'client' | 'admin' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  isLoggedIn: boolean;
  setSession: (user: User, token: string) => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  role: 'client',
  isLoggedIn: false,

  setSession: async (user, token) => {
    await AsyncStorage.multiSet([
      ['@auth_token', token],
      ['@auth_user', JSON.stringify(user)]
    ]);
    set({ user, token, isLoggedIn: true, role: user.role });
  },

  updateUser: async (updates) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updates };
      AsyncStorage.setItem('@auth_user', JSON.stringify(newUser)).catch(console.error);
      return { user: newUser };
    });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['@auth_token', '@auth_user']);
    set({ user: null, token: null, isLoggedIn: false, role: 'client' });
  },

  initialize: async () => {
    try {
      const [[, token], [, userStr]] = await AsyncStorage.multiGet(['@auth_token', '@auth_user']);
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isLoggedIn: true, role: user.role });
      }
    } catch (error) {
      console.error('Failed to load auth state', error);
    }
  }
}));
