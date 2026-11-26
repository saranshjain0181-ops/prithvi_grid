import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HQUser } from '@/types';

interface AuthState {
  user: HQUser | null;
  isAuthenticated: boolean;
  login: (user: HQUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'hq-auth',
    },
  ),
);
