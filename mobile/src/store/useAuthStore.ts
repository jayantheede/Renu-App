import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'client' | 'admin' | 'employee' | 'Grower' | string;

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  avatarUrl?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    approvalStatus?: string;
  };
}

interface AuthState {
  user: User | null;
  session: { user: User } | null;
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
  session: null,
  token: null,
  role: 'client',
  isLoggedIn: false,

  setSession: async (user, token) => {
    // Ensure user_metadata exists for legacy screen access
    const enrichedUser: User = {
      ...user,
      user_metadata: user.user_metadata || {
        full_name: user.name,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    };
    await AsyncStorage.multiSet([
      ['@auth_token', token],
      ['@auth_user', JSON.stringify(enrichedUser)]
    ]);
    set({
      user: enrichedUser,
      session: { user: enrichedUser },
      token,
      isLoggedIn: true,
      role: enrichedUser.role
    });
  },

  updateUser: async (updates) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updates };
      AsyncStorage.setItem('@auth_user', JSON.stringify(newUser)).catch(console.error);
      return { user: newUser, session: { user: newUser } };
    });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['@auth_token', '@auth_user']);
    set({ user: null, session: null, token: null, isLoggedIn: false, role: 'client' });
  },

  initialize: async () => {
    try {
      const [[, token], [, userStr]] = await AsyncStorage.multiGet(['@auth_token', '@auth_user']);
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({
          user,
          session: { user },
          token,
          isLoggedIn: true,
          role: user.role
        });
      }
    } catch (error) {
      console.error('Failed to load auth state', error);
    }
  }
}));
