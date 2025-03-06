'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TwitterMetrics from '@/components/TwitterMetrics';
import TwitterEngagementAnalytics from '@/components/TwitterEngagementAnalytics';
import { FaTwitter, FaPlus, FaChartLine, FaExclamationTriangle, FaExchangeAlt } from 'react-icons/fa';

// Create a type for the Twitter account data
interface TwitterAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_username: string;
  platform_user_id: string;
  metadata?: {
    name?: string;
    profile_image_url?: string;
    followers_count?: number;
    [key: string]: any;
  };
  created_at: string;
}

export default function TwitterDashboard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<TwitterAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<TwitterAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { supabase, user } = useSupabase();

  useEffect(() => {
    // Check if user has connected Twitter account(s)
    const checkTwitterAccounts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'twitter');
        
        if (error) {
          console.error('Error fetching Twitter accounts:', error);
          setConnected(false);
        } else if (data && data.length > 0) {
          setConnected(true);
          setAccounts(data);
          setSelectedAccount(data[0]); // Default to first account
        } else {
          setConnected(false);
        }
      } catch (err) {
        console.error('Error checking Twitter accounts:', err);
        setError('Failed to check Twitter connection status');
      } finally {
        setLoading(false);
      }
    };

    checkTwitterAccounts();
  }, [user, supabase]);

  const handleConnect = () => {
    router.push('/accounts/connect');
  };

  const handleAccountSwitch = (account: TwitterAccount) => {
    setSelectedAccount(account);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Twitter Analytics"
          icon={<FaTwitter className="text-blue-400" />}
          description="View and analyze your Twitter profile performance"
        />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Twitter Analytics"
        icon={<FaTwitter className="text-blue-400" />}
        description="View and analyze your Twitter profile performance"
      />

      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <FaExclamationTriangle className="mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!connected ? (
        <div className="bg-dark-500 rounded-lg border border-dark-400 p-8 text-center">
          <FaTwitter className="text-blue-400 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Twitter Account</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Connect your Twitter account to view analytics, track growth, and monitor engagement.
          </p>
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <FaPlus className="mr-2" /> Connect Twitter Account
          </button>
        </div>
      ) : (
        <div>
          {accounts.length > 1 && (
            <div className="mb-6">
              <div className="flex items-center justify-between bg-dark-500 p-4 rounded-lg">
                <div className="flex items-center">
                  <span className="text-gray-400 mr-3">Account:</span>
                  <span className="font-medium text-white">
                    {selectedAccount?.metadata?.name || selectedAccount?.platform_username}
                  </span>
                </div>
                <div className="relative">
                  <button
                    className="px-3 py-1.5 bg-dark-400 rounded-lg text-gray-300 hover:text-white flex items-center"
                    onClick={() => document.getElementById('account-dropdown')?.classList.toggle('hidden')}
                  >
                    <FaExchangeAlt className="mr-2" /> Switch Account
                  </button>
                  <div id="account-dropdown" className="absolute right-0 mt-2 w-48 bg-dark-500 border border-dark-400 rounded-lg shadow-lg z-10 hidden">
                    <ul className="py-1">
                      {accounts.map((account) => (
                        <li key={account.id}>
                          <button
                            onClick={() => {
                              handleAccountSwitch(account);
                              document.getElementById('account-dropdown')?.classList.add('hidden');
                            }}
                            className={`block w-full text-left px-4 py-2 hover:bg-dark-400 ${
                              selectedAccount?.id === account.id ? 'bg-primary-600 text-white' : 'text-gray-300'
                            }`}
                          >
                            {account.metadata?.name || account.platform_username}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pass the selected account to the components */}
          <TwitterMetrics userId={user?.id || ''} />
          <TwitterEngagementAnalytics userId={user?.id || ''} />
        </div>
      )}
    </div>
  );
} 