'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTiktok } from 'react-icons/fa';
import { SiLinkedin } from 'react-icons/si';

interface SocialMetricsProps {
  platform: 'twitter' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin';
}

interface SocialAccount {
  platform: string;
  platform_username: string;
  platform_user_id: string;
  metadata?: Record<string, any>;
}

interface SocialMetricsData {
  accountInfo: {
    username: string;
    displayName: string;
    followers: number;
    following?: number;
    profileImageUrl?: string;
  };
  posts: Array<{
    id: string;
    text?: string;
    imageUrl?: string;
    createdAt: Date;
    metrics: Record<string, any>;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

// Icon map for different platforms
const PlatformIcons = {
  twitter: FaTwitter,
  instagram: FaInstagram,
  facebook: FaFacebook,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  linkedin: SiLinkedin,
};

// Color map for different platforms
const PlatformColors = {
  twitter: 'text-blue-400',
  instagram: 'text-pink-500',
  facebook: 'text-blue-600',
  youtube: 'text-red-600',
  tiktok: 'text-black',
  linkedin: 'text-blue-700',
};

export default function SocialMetrics({ platform }: SocialMetricsProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SocialMetricsData | null>(null);
  const [account, setAccount] = useState<SocialAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const PlatformIcon = PlatformIcons[platform] || FaTwitter;
  const platformColor = PlatformColors[platform] || 'text-blue-400';
  
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);

  // Check if the user has connected this platform
  useEffect(() => {
    if (!user) return;

    const checkConnection = async () => {
      try {
        setIsLoading(true);
        
        // First, check if this social account exists
        const res = await fetch('/api/social/accounts');
        const data = await res.json();
        
        if (data.accounts) {
          const platformAccount = data.accounts.find(
            (acc: SocialAccount) => acc.platform === platform
          );
          
          if (platformAccount) {
            setAccount(platformAccount);
            setIsConnected(true);
            
            // If connected, fetch metrics
            const metricsRes = await fetch(`/api/social/${platform}/metrics`);
            
            if (!metricsRes.ok) {
              throw new Error(`Failed to fetch ${platformName} metrics`);
            }
            
            const metricsData = await metricsRes.json();
            setMetrics(metricsData);
          } else {
            setIsConnected(false);
          }
        }
      } catch (err) {
        console.error(`Error fetching ${platform} metrics:`, err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [user, platform, platformName]);

  // Display loading state
  if (isLoading) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <PlatformIcon className={`${platformColor} text-2xl mr-3`} />
          <h2 className="text-xl font-semibold">{platformName} Metrics</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // If not connected
  if (!isConnected && !isLoading) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <PlatformIcon className={`${platformColor} text-2xl mr-3`} />
          <h2 className="text-xl font-semibold">{platformName} Metrics</h2>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            {error || `Connect your ${platformName} account to see your metrics`}
          </p>
          <Link
            href={`/accounts/connect?platform=${platform}`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block"
          >
            Connect {platformName}
          </Link>
        </div>
      </div>
    );
  }

  // If connected but no metrics or no posts
  if (isConnected && (!metrics || metrics.posts.length === 0)) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <PlatformIcon className={`${platformColor} text-2xl mr-3`} />
          <h2 className="text-xl font-semibold">{platformName} Metrics</h2>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-400">
            {account ? (
              `No recent posts found for @${account.platform_username}`
            ) : (
              `No ${platformName} account data available`
            )}
          </p>
        </div>
      </div>
    );
  }

  // Display metrics
  return (
    <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
      <div className="flex items-center mb-4">
        <PlatformIcon className={`${platformColor} text-2xl mr-3`} />
        <h2 className="text-xl font-semibold">{platformName} Metrics</h2>
      </div>
      
      {metrics && (
        <>
          {/* Account Summary */}
          <div className="flex items-center mb-6 p-4 bg-dark-600 rounded-lg">
            {metrics.accountInfo.profileImageUrl && (
              <img 
                src={metrics.accountInfo.profileImageUrl} 
                alt={metrics.accountInfo.username}
                className="w-12 h-12 rounded-full mr-4"
              />
            )}
            <div>
              <h3 className="font-semibold">{metrics.accountInfo.displayName}</h3>
              <p className="text-gray-400">@{metrics.accountInfo.username}</p>
              <div className="flex mt-1 space-x-4 text-sm">
                <span>{metrics.accountInfo.followers.toLocaleString()} followers</span>
                {metrics.accountInfo.following !== undefined && (
                  <span>{metrics.accountInfo.following.toLocaleString()} following</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Recent Posts */}
          <h3 className="text-lg font-medium mb-3">Recent Posts</h3>
          <div className="space-y-4">
            {metrics.posts.map((post) => (
              <div key={post.id} className="p-4 bg-dark-600 rounded-lg">
                {post.text && <p className="mb-3">{post.text}</p>}
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className="mb-3 rounded-md max-h-48 object-cover"
                  />
                )}
                <div className="text-gray-400 text-sm mb-2">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {Object.entries(post.metrics).map(([key, value]) => (
                    <div key={key} className="bg-dark-700 p-2 rounded">
                      <div className="text-gray-400 capitalize">{key}</div>
                      <div className="font-medium">{Number(value).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
} 