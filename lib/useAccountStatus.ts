'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { useExpiredAccounts } from './useExpiredAccounts';

export interface SocialAccountStatus {
  id: string;
  platform: string;
  platformUserId: string | null;
  status: 'connected' | 'expired' | 'error';
  lastUpdated: string;
}

export function useAccountStatus() {
  const [accounts, setAccounts] = useState<SocialAccountStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const router = useRouter();
  const { setExpiredAccounts } = useExpiredAccounts();
  const hasShownWarning = useRef(false);
  
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/accounts?includeStatus=true');
      
      if (!response.ok) {
        throw new Error(`Error fetching accounts: ${response.status}`);
      }
      
      const data = await response.json();
      setAccounts(data.accounts || []);
      
      // Check for expired tokens
      const expiredAccounts = data.accounts?.filter(
        (account: SocialAccountStatus) => account.status === 'expired'
      ) || [];
      
      // Update the global state for expired accounts
      setExpiredAccounts(expiredAccounts);
      
      // Only show the toast on the accounts page to avoid duplicate notifications
      // And only show it once per component mount
      if (expiredAccounts.length > 0 && 
          window.location.pathname.includes('/accounts') && 
          !hasShownWarning.current) {
        
        hasShownWarning.current = true;
        
        const platforms = expiredAccounts
          .map((account: SocialAccountStatus) => account.platform.charAt(0).toUpperCase() + account.platform.slice(1))
          .join(', ');
          
        const message = expiredAccounts.length === 1
          ? `Your ${platforms} account token has expired. Please reconnect it to continue receiving metrics.`
          : `${expiredAccounts.length} account tokens have expired (${platforms}). Please reconnect them to continue receiving metrics.`;
          
        addToast({
          type: 'warning',
          message,
          duration: 10000
        });
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load account status');
      
      if (!hasShownWarning.current) {
        hasShownWarning.current = true;
        addToast({
          type: 'error',
          message: 'Failed to load account status'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [addToast, setExpiredAccounts]);

  const disconnectAccount = useCallback(async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
      return false;
    }
    
    try {
      const response = await fetch(`/api/social/accounts`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ platform })
      });
      
      if (!response.ok) {
        throw new Error(`Error disconnecting account: ${response.status}`);
      }
      
      addToast({
        type: 'success',
        message: `Successfully disconnected ${platform} account`
      });
      
      // Refresh accounts list
      hasShownWarning.current = false; // Reset when we deliberately change accounts
      fetchAccounts();
      return true;
    } catch (err) {
      console.error(`Error disconnecting ${platform} account:`, err);
      addToast({
        type: 'error',
        message: `Failed to disconnect ${platform} account`
      });
      return false;
    }
  }, [addToast, fetchAccounts]);

  const reconnectAccount = useCallback((platform: string) => {
    router.push(`/accounts/connect?platform=${platform}&reconnect=true`);
  }, [router]);
  
  useEffect(() => {
    fetchAccounts();
    
    // Reset the warning flag when the component unmounts
    return () => {
      hasShownWarning.current = false;
    };
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    fetchAccounts,
    disconnectAccount,
    reconnectAccount
  };
} 