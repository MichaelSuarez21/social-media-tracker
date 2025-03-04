'use client';

import { create } from 'zustand';
import { SocialAccountStatus } from './useAccountStatus';

interface ExpiredAccountsState {
  expiredAccounts: SocialAccountStatus[];
  setExpiredAccounts: (accounts: SocialAccountStatus[]) => void;
  clearExpiredAccounts: () => void;
  hasExpiredAccounts: () => boolean;
}

export const useExpiredAccounts = create<ExpiredAccountsState>((set, get) => ({
  expiredAccounts: [],
  setExpiredAccounts: (accounts: SocialAccountStatus[]) => set({ expiredAccounts: accounts }),
  clearExpiredAccounts: () => set({ expiredAccounts: [] }),
  hasExpiredAccounts: () => get().expiredAccounts.length > 0,
})); 