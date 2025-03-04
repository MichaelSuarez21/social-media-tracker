'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import TwitterMetrics from '@/components/TwitterMetrics';
import TwitterEngagementAnalytics from '@/components/TwitterEngagementAnalytics';
import { FaTwitter, FaPlus, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';

export default function TwitterDashboard() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { supabase, user } = useSupabase();

  useEffect(() => {
    // Check if user has connected Twitter account
    const checkTwitterAccount = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform', 'twitter')
          .single();
        
        if (error) {
          console.error('Error fetching Twitter account:', error);
          setConnected(false);
        } else if (data) {
          setConnected(true);
          setAccountData(data);
        } else {
          setConnected(false);
        }
      } catch (err) {
        console.error('Error checking Twitter account:', err);
        setError('Failed to check Twitter connection status');
      } finally {
        setLoading(false);
      }
    };
    
    checkTwitterAccount();
  }, [user, supabase]);
  
  const handleConnect = () => {
    router.push('/api/social/twitter/login');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Twitter Analytics" 
          icon={<FaTwitter className="text-blue-400" />}
          description="Track and analyze your Twitter performance"
        />
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Twitter Analytics" 
          icon={<FaTwitter className="text-blue-400" />}
          description="Track and analyze your Twitter performance"
        />
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-4 rounded-lg flex items-start mb-6">
          <FaExclamationTriangle className="mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Twitter Analytics" 
          icon={<FaTwitter className="text-blue-400" />}
          description="Track and analyze your Twitter performance"
        />
        
        <div className="bg-dark-500 rounded-lg p-8 text-center border border-dark-400">
          <FaTwitter className="text-blue-400 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Connect Your Twitter Account</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Connect your Twitter account to track engagement metrics, analyze performance trends, and gain insights into your Twitter presence.
          </p>
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center mx-auto"
          >
            <FaPlus className="mr-2" />
            Connect Twitter
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Twitter Analytics" 
        icon={<FaTwitter className="text-blue-400" />}
        description={`Tracking metrics for @${accountData?.username || 'your account'}`}
        actions={
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-dark-600 hover:bg-dark-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
            >
              <FaChartLine className="mr-2" />
              Overview
            </button>
          </div>
        }
      />
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Performance</h2>
        <TwitterMetrics userId={user?.id || ''} />
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Advanced Engagement Analytics</h2>
        <TwitterEngagementAnalytics userId={user?.id || ''} />
      </div>
    </div>
  );
} 