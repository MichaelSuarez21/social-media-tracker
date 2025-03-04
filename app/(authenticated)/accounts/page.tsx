'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaPinterest, FaExclamationTriangle, FaPlus } from 'react-icons/fa';
import { SiLinkedin, SiBluesky } from 'react-icons/si';
import { useAccountStatus, SocialAccountStatus } from '@/lib/useAccountStatus';
import { useToast } from '@/components/ui/Toast';

// Platform icons mapping
const platformIcons: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="text-2xl text-blue-400" />,
  instagram: <FaInstagram className="text-2xl text-pink-400" />,
  facebook: <FaFacebook className="text-2xl text-blue-500" />,
  youtube: <FaYoutube className="text-2xl text-red-500" />,
  tiktok: <FaTiktok className="text-2xl text-gray-200" />,
  pinterest: <FaPinterest className="text-2xl text-red-600" />,
  linkedin: <SiLinkedin className="text-2xl text-blue-700" />,
  bluesky: <SiBluesky className="text-2xl text-blue-400" />,
};

// Component to display an account status badge
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'connected') {
    return <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-700">Connected</span>;
  } else if (status === 'expired') {
    return <span className="text-xs px-2 py-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700">Token Expired</span>;
  } else {
    return <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700">Error</span>;
  }
};

export default function AccountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const reconnected = searchParams.get('reconnected');
  
  const { accounts, loading, error, fetchAccounts, disconnectAccount, reconnectAccount } = useAccountStatus();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { addToast } = useToast();
  
  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
    
    // Show success message if we just connected a platform
    if (connected) {
      const platform = connected.charAt(0).toUpperCase() + connected.slice(1);
      setSuccessMessage(`Successfully connected your ${platform} account!`);
      
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url);
      
      // Show toast
      addToast({
        type: 'success',
        message: `Successfully connected your ${platform} account!`
      });
    }

    // Show success message if we just reconnected a platform
    if (reconnected) {
      const platform = reconnected.charAt(0).toUpperCase() + reconnected.slice(1);
      setSuccessMessage(`Successfully reconnected your ${platform} account!`);
      addToast({
        type: 'success',
        message: `Successfully reconnected your ${platform} account!`
      });
      
      // Clear the URL parameter after showing the message
      const url = new URL(window.location.href);
      url.searchParams.delete('reconnected');
      window.history.replaceState({}, '', url);
    }
  }, [connected, reconnected, user, fetchAccounts, addToast]);

  // Clear success message after display
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Connected Accounts</h1>
        <Link
          href="/accounts/connect"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <FaPlus size={14} />
          <span>Connect Account</span>
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg text-green-300">
          {successMessage}
        </div>
      )}

      <div className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Social Media Accounts</h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 bg-dark-600 rounded-lg border border-dashed border-dark-300">
              <p className="text-gray-400 mb-4">You haven't connected any social accounts yet.</p>
              <Link
                href="/accounts/connect"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-flex"
              >
                <FaPlus size={14} />
                <span>Connect Your First Account</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="p-4 border border-dark-300 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="rounded-full bg-dark-600 p-3">
                        {platformIcons[account.platform]}
                      </div>
                      <div>
                        <h3 className="font-semibold capitalize">{account.platform}</h3>
                        <p className="text-gray-400 text-sm">Connected account</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* Account status badge */}
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={account.status} />
                      </div>
                      
                      {/* Account actions */}
                      <div className="flex space-x-2">
                        {account.status === 'expired' ? (
                          <button
                            onClick={() => reconnectAccount(account.platform)}
                            className="text-sm px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded"
                          >
                            Reconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => disconnectAccount(account.platform)}
                            className="text-sm text-blue-400 hover:text-blue-300"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 