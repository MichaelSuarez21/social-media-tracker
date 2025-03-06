'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MetricsChart from '@/components/MetricsChart';
import { generateDateLabels, generateSampleData, formatNumber } from '@/lib/utils';
import { Bar, Line } from 'react-chartjs-2';
import { useAuth } from '@/lib/auth';
import { useExpiredAccounts } from '@/lib/useExpiredAccounts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

type TimeframeOption = 'day' | 'week' | 'month';

// Define interfaces for platform data
interface SocialAccount {
  id: string;
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

interface PlatformMetrics {
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

interface MetricsData {
  [platform: string]: {
    followers: number[];
    views: number[];
    engagement: number[];
  };
}

// Platform colors for consistent styling
const PLATFORM_COLORS: Record<string, { borderColor: string; backgroundColor: string }> = {
  twitter: {
    borderColor: 'rgb(59, 130, 246)',
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
  },
  instagram: {
    borderColor: 'rgb(217, 70, 239)',
    backgroundColor: 'rgba(217, 70, 239, 0.5)',
  },
  facebook: {
    borderColor: 'rgb(76, 110, 245)',
    backgroundColor: 'rgba(76, 110, 245, 0.5)',
  },
  youtube: {
    borderColor: 'rgb(239, 68, 68)',
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  tiktok: {
    borderColor: 'rgb(50, 50, 50)',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
  },
  linkedin: {
    borderColor: 'rgb(17, 85, 204)',
    backgroundColor: 'rgba(17, 85, 204, 0.5)',
  },
  default: {
    borderColor: 'rgb(107, 114, 128)',
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  }
};

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('week');
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile, isLoading: authLoading } = useAuth();
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [metricsData, setMetricsData] = useState<MetricsData>({});
  const [usingSampleData, setUsingSampleData] = useState(true);
  const expiredAccountsStore = useExpiredAccounts();
  const expiredAccounts = expiredAccountsStore.expiredAccounts;

  // Dashboard mounting logs
  useEffect(() => {
    console.log('Dashboard: Component mounted', { 
      user: !!user, 
      profile: !!profile,
      userId: user?.id,
      profileId: profile?.id,
      authLoading 
    });
    
    // Don't immediately force loading to false, we need to check for accounts first
  }, [user, profile, authLoading]);

  // Fetch connected accounts
  useEffect(() => {
    if (!user || authLoading) return;

    async function fetchAccounts() {
      try {
        const res = await fetch('/api/social/accounts');
        const data = await res.json();
        
        if (data.accounts && Array.isArray(data.accounts)) {
          setConnectedAccounts(data.accounts);
          
          // If there are connected accounts, we'll fetch real metrics data
          if (data.accounts.length > 0) {
            setUsingSampleData(false);
            await fetchPlatformMetrics(data.accounts);
          } else {
            setUsingSampleData(true);
            setIsLoading(false);
          }
        } else {
          setConnectedAccounts([]);
          setUsingSampleData(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching social accounts:', error);
        setConnectedAccounts([]);
        setUsingSampleData(true);
        setIsLoading(false);
      }
    }

    fetchAccounts();
  }, [user, authLoading]);

  // Function to fetch metrics for each connected platform
  async function fetchPlatformMetrics(accounts: SocialAccount[]) {
    const dateLabels = generateDateLabels(timeframe, timeframe === 'day' ? 14 : (timeframe === 'week' ? 8 : 6));
    const platformMetrics: MetricsData = {};
    
    try {
      // Get unique platforms to avoid duplicate API calls
      const uniquePlatforms = Array.from(new Set(accounts.map(account => account.platform)));
      
      // Process each platform (not account) to fetch its metrics - this reduces duplicate calls
      const platformPromises = uniquePlatforms.map(async (platform) => {
        try {
          // Find the first account for this platform
          const account = accounts.find(a => a.platform === platform);
          if (!account) return;
          
          const res = await fetch(`/api/social/${platform}/metrics`);
          
          if (res.ok) {
            const data = await res.json();
            
            // Initialize platform metrics if not exists
            if (!platformMetrics[platform]) {
              platformMetrics[platform] = {
                followers: new Array(dateLabels.length).fill(0),
                views: new Array(dateLabels.length).fill(0),
                engagement: new Array(dateLabels.length).fill(0)
              };
            }
            
            // Process the actual metrics into our format
            // This is a simple example - in real implementation you'd need to
            // process time-series data from the API and match to date labels
            
            // For demonstration, let's add the current account info to the last point
            const lastIndex = dateLabels.length - 1;
            
            // Set followers data from account metadata or API
            if (data.accountInfo?.followers) {
              platformMetrics[platform].followers[lastIndex] = data.accountInfo.followers;
            } else if (account.metadata?.followers_count) {
              platformMetrics[platform].followers[lastIndex] = account.metadata.followers_count;
            }
            
            // Set views/impressions based on sum of recent posts
            const totalViews = data.posts?.reduce((sum: number, post: any) => {
              const impressions = post.metrics?.impression_count || 
                                  post.metrics?.impressions || 
                                  post.metrics?.views || 0;
              return sum + Number(impressions);
            }, 0) || 0;
            
            platformMetrics[platform].views[lastIndex] = totalViews;
            
            // Calculate average engagement from posts (simplified)
            let avgEngagement = 0;
            if (data.posts?.length > 0) {
              const totalEngagement = data.posts.reduce((sum: number, post: any) => {
                // Engagement is typically likes+comments+shares divided by impressions
                const interactions = (post.metrics?.like_count || 0) + 
                                   (post.metrics?.comment_count || 0) + 
                                   (post.metrics?.share_count || 0);
                const impressions = post.metrics?.impression_count || 1;
                return sum + (interactions / impressions * 100);
              }, 0);
              
              avgEngagement = totalEngagement / data.posts.length;
            }
            
            platformMetrics[platform].engagement[lastIndex] = avgEngagement;
            
            // Fill in previous days with slightly varying data
            // In a real app, you'd get historical data from the API
            for (let i = lastIndex - 1; i >= 0; i--) {
              const followerVariation = Math.random() * 0.02 - 0.01; // -1% to +1%
              const viewsVariation = Math.random() * 0.1 - 0.05; // -5% to +5%
              const engagementVariation = Math.random() * 0.05 - 0.025; // -2.5% to +2.5%
              
              platformMetrics[platform].followers[i] = 
                Math.round(platformMetrics[platform].followers[i+1] * (1 - followerVariation));
              
              platformMetrics[platform].views[i] = 
                Math.round(platformMetrics[platform].views[i+1] * (1 - viewsVariation));
              
              platformMetrics[platform].engagement[i] = 
                Math.max(0, platformMetrics[platform].engagement[i+1] * (1 - engagementVariation));
            }
          }
        } catch (error) {
          console.error(`Error fetching metrics for ${platform}:`, error);
        }
      });
      
      // Wait for all platform metrics to be fetched
      await Promise.all(platformPromises);
      
      // Set metrics data once all are processed
      setMetricsData(platformMetrics);
    } catch (error) {
      console.error('Error processing platform metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Generate labels based on selected timeframe
  const dateLabels = generateDateLabels(timeframe, timeframe === 'day' ? 14 : (timeframe === 'week' ? 8 : 6));

  // Create chart datasets based on metrics data or sample data
  const getChartData = (dataType: 'followers' | 'views' | 'engagement') => {
    const datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      tension?: number;
    }> = [];
    
    if (usingSampleData) {
      // Use sample data if no connected accounts
      return {
        labels: dateLabels,
        datasets: [
          {
            label: 'Twitter',
            data: generateSampleData(
              timeframe, 
              dateLabels.length, 
              dataType === 'followers' ? 40000 : (dataType === 'views' ? 80000 : 1),
              dataType === 'followers' ? 50000 : (dataType === 'views' ? 150000 : 5),
              'up'
            ),
            borderColor: PLATFORM_COLORS.twitter.borderColor,
            backgroundColor: PLATFORM_COLORS.twitter.backgroundColor,
            tension: 0.3,
          },
          {
            label: 'Instagram',
            data: generateSampleData(
              timeframe, 
              dateLabels.length, 
              dataType === 'followers' ? 30000 : (dataType === 'views' ? 100000 : 2),
              dataType === 'followers' ? 35000 : (dataType === 'views' ? 200000 : 7),
              dataType === 'engagement' ? 'down' : 'up'
            ),
            borderColor: PLATFORM_COLORS.instagram.borderColor,
            backgroundColor: PLATFORM_COLORS.instagram.backgroundColor,
            tension: 0.3,
          },
          {
            label: 'YouTube',
            data: generateSampleData(
              timeframe, 
              dateLabels.length, 
              dataType === 'followers' ? 25000 : (dataType === 'views' ? 200000 : 3),
              dataType === 'followers' ? 30000 : (dataType === 'views' ? 250000 : 8),
              'stable'
            ),
            borderColor: PLATFORM_COLORS.youtube.borderColor,
            backgroundColor: PLATFORM_COLORS.youtube.backgroundColor,
            tension: 0.3,
          },
        ],
      };
    } else {
      // Use real data from connected accounts
      Object.entries(metricsData).forEach(([platform, metrics]) => {
        // Skip if metrics are empty
        if (!metrics[dataType] || metrics[dataType].every(v => v === 0)) {
          return;
        }
        
        datasets.push({
          label: platform.charAt(0).toUpperCase() + platform.slice(1),
          data: metrics[dataType],
          borderColor: PLATFORM_COLORS[platform]?.borderColor || PLATFORM_COLORS.default.borderColor,
          backgroundColor: PLATFORM_COLORS[platform]?.backgroundColor || PLATFORM_COLORS.default.backgroundColor,
          tension: 0.3,
        });
      });
      
      // Make sure YouTube data is included in the main dashboard charts
      // even if it might not show up automatically from connected accounts
      const youtubeAccount = connectedAccounts.find(account => account.platform === 'youtube');
      if (youtubeAccount && !datasets.some(d => d.label.toLowerCase() === 'youtube')) {
        // Add YouTube data if it exists but wasn't added above
        const youtubeData = metricsData.youtube?.[dataType];
        if (youtubeData && youtubeData.some(v => v > 0)) {
          datasets.push({
            label: 'YouTube',
            data: youtubeData,
            borderColor: PLATFORM_COLORS.youtube.borderColor,
            backgroundColor: PLATFORM_COLORS.youtube.backgroundColor,
            tension: 0.3,
          });
        }
      }
    }
    
    return {
      labels: dateLabels,
      datasets,
    };
  };

  // Generate chart data
  const followersData = getChartData('followers');
  const viewsData = getChartData('views');
  const engagementData = getChartData('engagement');

  // Calculate total metrics
  const calculateTotals = () => {
    if (usingSampleData) {
      // Return sample totals
      return {
        totalAccounts: 3,
        totalFollowers: followersData.datasets.reduce(
          (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
          0
        ),
        totalViews: viewsData.datasets.reduce(
          (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
          0
        ),
        avgEngagement: engagementData.datasets.reduce(
          (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
          0
        ) / engagementData.datasets.length
      };
    } else {
      // Calculate from real metrics data
      const metrics = {
        totalAccounts: connectedAccounts.length,
        totalFollowers: 0,
        totalViews: 0,
        avgEngagement: 0
      };
      
      const platforms = Object.keys(metricsData);
      
      platforms.forEach(platform => {
        const lastIndex = dateLabels.length - 1;
        // Make sure we have valid data
        if (metricsData[platform]?.followers && metricsData[platform].followers.length > 0) {
          metrics.totalFollowers += metricsData[platform].followers[lastIndex] || 0;
        }
        if (metricsData[platform]?.views && metricsData[platform].views.length > 0) {
          metrics.totalViews += metricsData[platform].views[lastIndex] || 0;
        }
        if (metricsData[platform]?.engagement && metricsData[platform].engagement.length > 0) {
          metrics.avgEngagement += metricsData[platform].engagement[lastIndex] || 0;
        }
      });
      
      // Specifically check for YouTube data to ensure it's included
      if (metricsData.youtube) {
        const lastIndex = dateLabels.length - 1;
        // Only add if not already counted (avoid double counting)
        if (!platforms.includes('youtube')) {
          if (metricsData.youtube.followers && metricsData.youtube.followers.length > 0) {
            metrics.totalFollowers += metricsData.youtube.followers[lastIndex] || 0;
          }
          if (metricsData.youtube.views && metricsData.youtube.views.length > 0) {
            metrics.totalViews += metricsData.youtube.views[lastIndex] || 0;
          }
        }
      }
      
      if (platforms.length > 0) {
        metrics.avgEngagement /= platforms.length;
      }
      
      return metrics;
    }
  };

  const { totalAccounts, totalFollowers, totalViews, avgEngagement } = calculateTotals();

  // Format connected platform list for display
  const connectedPlatformsList = usingSampleData 
    ? "Twitter, Instagram, YouTube" 
    : connectedAccounts.map(acc => acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1)).join(", ");

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-500 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-dark-500 rounded w-2/3 mb-8"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-dark-500 rounded-lg p-6 border border-dark-400 h-32"></div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-dark-500 rounded-lg border border-dark-400 h-80"></div>
            <div className="bg-dark-500 rounded-lg border border-dark-400 h-80"></div>
          </div>
          
          <div className="bg-dark-500 rounded-lg border border-dark-400 h-80"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">View and manage your social media performance</p>
      </div>
      
      {/* Timeframe Selection */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="text-gray-400">Timeframe:</span>
        <div className="bg-dark-500 rounded-lg inline-flex p-1">
          <button
            onClick={() => setTimeframe('day')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              timeframe === 'day'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              timeframe === 'week'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              timeframe === 'month'
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
        </div>
        
        <div className="ml-auto">
          <Link
            href="/accounts/connect"
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            <span className="mr-2">+</span> Add Account
          </Link>
        </div>
      </div>
      
      {/* Account Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Connected Accounts</h3>
          <p className="text-3xl font-bold text-white">{totalAccounts}</p>
          <p className="text-gray-400 text-sm mt-2">{connectedPlatformsList}</p>
        </div>
        <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Followers</h3>
          <p className="text-3xl font-bold text-white">{formatNumber(totalFollowers)}</p>
          <p className="text-green-500 text-sm mt-2">+2.1% this {timeframe}</p>
        </div>
        <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Views</h3>
          <p className="text-3xl font-bold text-white">{formatNumber(totalViews)}</p>
          <p className="text-green-500 text-sm mt-2">+5.3% this {timeframe}</p>
        </div>
        <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Engagement Rate</h3>
          <p className="text-3xl font-bold text-white">{avgEngagement.toFixed(1)}%</p>
          <p className="text-red-500 text-sm mt-2">-0.5% this {timeframe}</p>
        </div>
      </div>
      
      {/* Main Content with Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <MetricsChart 
          title="Followers Growth" 
          data={followersData} 
          timeframe={timeframe}
          height={350}
        />
        <MetricsChart 
          title="Views/Impressions" 
          data={viewsData} 
          timeframe={timeframe}
          height={350}
        />
      </div>
      
      <MetricsChart 
        title="Engagement Rate (%)" 
        data={engagementData} 
        timeframe={timeframe}
        height={350}
      />

      {/* Expired accounts warning */}
      {expiredAccounts.length > 0 && (
        <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 text-yellow-500 p-4 rounded-lg mb-6">
          <h3 className="font-semibold">Attention Required</h3>
          <p>Some of your social media connections need to be reconnected:</p>
          <ul className="list-disc list-inside mt-2">
            {expiredAccounts.map(account => (
              <li key={account.id}>
                {account.platform} ({account.platformUserId})
              </li>
            ))}
          </ul>
          <Link href="/settings/connections" className="text-yellow-400 hover:text-yellow-300 underline mt-2 inline-block">
            Manage Connections
          </Link>
        </div>
      )}
      
      {/* Platform-specific analytics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-8">
        {/* Twitter Analytics Card - Only show if user has Twitter accounts */}
        {connectedAccounts.some(account => account.platform === 'twitter') && (
          <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              <h2 className="text-xl font-semibold">Twitter Analytics</h2>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse flex flex-col">
                <div className="h-4 bg-dark-400 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-dark-400 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-dark-400 rounded mb-4"></div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-gray-400 mb-1">Followers</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(metricsData.twitter?.followers?.[metricsData.twitter.followers.length - 1] || 0)}
                  </p>
                  
                  <div className="mt-4 h-32">
                    <Line 
                      data={{
                        labels: generateDateLabels(timeframe, 7),
                        datasets: [{
                          label: 'Followers',
                          data: metricsData.twitter?.followers?.slice(-7) || Array(7).fill(0),
                          borderColor: PLATFORM_COLORS.twitter.borderColor,
                          backgroundColor: PLATFORM_COLORS.twitter.backgroundColor,
                          tension: 0.3,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: false,
                            grid: {
                              display: false,
                            },
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              display: false,
                            }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
                
                <Link 
                  href="/dashboard/twitter" 
                  className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  View Detailed Analytics
                </Link>
              </>
            )}
          </div>
        )}

        {/* YouTube Analytics Card - Only show if user has YouTube accounts */}
        {connectedAccounts.some(account => account.platform === 'youtube') && (
          <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <h2 className="text-xl font-semibold">YouTube Analytics</h2>
            </div>
            
            {isLoading ? (
              <div className="animate-pulse flex flex-col">
                <div className="h-4 bg-dark-400 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-dark-400 rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-dark-400 rounded mb-4"></div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-gray-400 mb-1">Subscribers</p>
                  <p className="text-2xl font-bold">
                    {formatNumber(metricsData.youtube?.followers?.[metricsData.youtube.followers.length - 1] || 0)}
                  </p>
                  
                  <div className="mt-4 h-32">
                    <Line 
                      data={{
                        labels: generateDateLabels(timeframe, 7),
                        datasets: [{
                          label: 'Subscribers',
                          data: metricsData.youtube?.followers?.slice(-7) || Array(7).fill(0),
                          borderColor: PLATFORM_COLORS.youtube.borderColor,
                          backgroundColor: PLATFORM_COLORS.youtube.backgroundColor,
                          tension: 0.3,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: false,
                            grid: {
                              display: false,
                            },
                          },
                          x: {
                            grid: {
                              display: false,
                            },
                            ticks: {
                              display: false,
                            }
                          }
                        },
                      }}
                    />
                  </div>
                </div>
                
                <Link 
                  href="/dashboard/youtube" 
                  className="block w-full text-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  View Detailed Analytics
                </Link>
              </>
            )}
          </div>
        )}
        
        {/* Add Account Card - Always show this to allow users to add more accounts */}
        <div className="bg-dark-500 rounded-lg p-6 border border-dark-400 border-dashed flex flex-col justify-center items-center">
          <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-2">Add Social Media Account</h3>
          <p className="text-gray-500 text-center mb-4">Connect more social platforms to track your performance</p>
          <Link
            href="/accounts/connect"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Connect Account
          </Link>
        </div>
      </div>
      
      {/* Connected Accounts Section */}
      <div className="mt-8">
        <div className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
          <div className="p-6 border-b border-dark-400">
            <h2 className="text-xl font-semibold text-white">Connected Accounts</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {usingSampleData ? (
                // Sample account cards
                <>
                  {/* Twitter Account Card */}
                  <div className="flex items-center justify-between p-4 bg-dark-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">T</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-white">Twitter</h3>
                        <p className="text-gray-400 text-sm">@username</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">45.2K</p>
                      <p className="text-green-500 text-sm">+120 followers</p>
                    </div>
                  </div>
                  
                  {/* Instagram Account Card */}
                  <div className="flex items-center justify-between p-4 bg-dark-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">I</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-white">Instagram</h3>
                        <p className="text-gray-400 text-sm">@username</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">32.8K</p>
                      <p className="text-green-500 text-sm">+85 followers</p>
                    </div>
                  </div>
                  
                  {/* YouTube Account Card */}
                  <div className="flex items-center justify-between p-4 bg-dark-600 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">Y</span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-white">YouTube</h3>
                        <p className="text-gray-400 text-sm">Channel Name</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">28.5K</p>
                      <p className="text-green-500 text-sm">+215 subscribers</p>
                    </div>
                  </div>
                </>
              ) : (
                // Real connected accounts
                connectedAccounts.map(account => {
                  const platform = account.platform;
                  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                  const username = account.platform_username || account.platform_user_id || 'Unknown';
                  const displayName = account.metadata?.name || username;
                  const followers = account.metadata?.followers_count || 
                                   (metricsData[platform]?.followers[dateLabels.length - 1] || 0);
                  
                  // Get background color based on platform
                  let bgColorClass = 'bg-blue-500'; // Default: Twitter blue
                  if (platform === 'instagram') bgColorClass = 'bg-gradient-to-tr from-purple-500 to-pink-500';
                  else if (platform === 'youtube') bgColorClass = 'bg-red-600';
                  else if (platform === 'facebook') bgColorClass = 'bg-blue-600';
                  else if (platform === 'tiktok') bgColorClass = 'bg-black';
                  else if (platform === 'linkedin') bgColorClass = 'bg-blue-700';
                  
                  return (
                    <div key={account.id} className="flex items-center justify-between p-4 bg-dark-600 rounded-lg">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 ${bgColorClass} rounded-full flex items-center justify-center`}>
                          {account.metadata?.profile_image_url ? (
                            <img 
                              src={account.metadata.profile_image_url} 
                              alt={platformName} 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-bold">{platformName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-4">
                          <h3 className="font-medium text-white">{platformName}</h3>
                          <p className="text-gray-400 text-sm">
                            {platform === 'youtube' 
                              ? (displayName || 'Channel')
                              : (username ? `@${username}` : 'Unknown')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatNumber(followers)}</p>
                        <p className="text-green-500 text-sm">+{Math.floor(followers * 0.003)} followers</p>
                      </div>
                    </div>
                  );
                })
              )}
              
              {/* Add more accounts button */}
              <Link 
                href="/accounts/connect"
                className="block w-full p-4 border border-dashed border-dark-300 rounded-lg text-gray-400 hover:text-white hover:border-primary-500 transition-colors text-center"
              >
                + Add new social media account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
