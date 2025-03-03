'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaPinterest } from 'react-icons/fa';
import { SiLinkedin, SiBluesky } from 'react-icons/si';

// Define our connected account type
interface ConnectedAccount {
  id: string;
  platform: string;
  platform_username: string;
  platform_user_id: string;
  metadata?: {
    name?: string;
    profile_image_url?: string;
    [key: string]: any;
  };
  created_at: string;
}

// Platform icon mapping
const PlatformIcons: Record<string, React.ReactNode> = {
  twitter: <FaTwitter className="text-2xl text-blue-400" />,
  instagram: <FaInstagram className="text-2xl text-pink-500" />,
  facebook: <FaFacebook className="text-2xl text-blue-600" />,
  youtube: <FaYoutube className="text-2xl text-red-600" />,
  tiktok: <FaTiktok className="text-2xl" />,
  pinterest: <FaPinterest className="text-2xl text-red-500" />,
  linkedin: <SiLinkedin className="text-2xl text-blue-700" />,
  bluesky: <SiBluesky className="text-2xl text-blue-400" />,
};

export default function AccountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get('connected');
  
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load accounts and handle success messages
  useEffect(() => {
    if (!user) return;
    
    // Show success message if we just connected a platform
    if (justConnected) {
      const platformName = justConnected.charAt(0).toUpperCase() + justConnected.slice(1);
      setSuccessMessage(`Successfully connected ${platformName}`);
      
      // Clear the URL parameter after showing the message
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('connected');
      window.history.replaceState({}, '', newUrl.toString());
      
      // Clear the message after a few seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [justConnected]);
  
  // Fetch connected accounts
  useEffect(() => {
    if (!user) return;
    
    const fetchAccounts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/social/accounts');
        const data = await res.json();
        
        if (data.accounts) {
          setAccounts(data.accounts);
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAccounts();
  }, [user]);

  // Handle disconnecting an account
  const disconnectAccount = async (platform: string, username: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform} account @${username}?`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/social/accounts?platform=${platform}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        // Remove the account from the list
        setAccounts(accounts.filter(acc => acc.platform !== platform));
        setSuccessMessage(`Successfully disconnected ${platform}`);
        
        // Clear the message after a few seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      } else {
        alert('Failed to disconnect account. Please try again.');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('An error occurred while disconnecting the account.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Accounts</h1>
        <p className="text-gray-400">Manage your connected social media accounts</p>
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-900/50 text-green-300 rounded-md">
          {successMessage}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Social Media Accounts</h2>
        <Link
          href="/accounts/connect"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add Account
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : accounts.length > 0 ? (
        <div className="space-y-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-dark-500 rounded-lg p-4 border border-dark-400">
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  {PlatformIcons[account.platform] || <div className="w-8 h-8 bg-blue-500 rounded-full" />}
                </div>
                <div>
                  <h3 className="font-semibold capitalize">{account.platform}</h3>
                  <p className="text-gray-400">@{account.platform_username}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="px-2 py-1 rounded text-xs bg-green-900/30 text-green-400">
                  Connected
                </span>
                <button
                  onClick={() => disconnectAccount(account.platform, account.platform_username)}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-dark-500 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-4">You haven't connected any social media accounts yet.</p>
          <Link
            href="/accounts/connect"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Connect Your First Account
          </Link>
        </div>
      )}
    </div>
  );
} 