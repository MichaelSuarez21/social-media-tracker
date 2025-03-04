'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTwitter, FaSync, FaEye, FaRetweet, FaHeart, FaComment, FaLink, FaUser, FaImage, FaChartBar, FaExpand } from 'react-icons/fa';

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
  non_public_metrics?: {
    impression_count: number;
    user_profile_clicks: number;
    url_link_clicks: number;
  };
  organic_metrics?: {
    impression_count: number;
    user_profile_clicks: number;
    url_link_clicks: number;
    retweet_count: number;
    reply_count: number;
    like_count: number;
  };
  // Enhanced metrics from historical data
  metrics?: {
    impressions: number;
    retweets: number;
    replies: number;
    likes: number;
    quotes: number;
    engagements?: number;
    profileVisits?: number;
    linkClicks?: number;
    mediaViews?: number;
    mediaEngagements?: number;
    detailExpands?: number;
    userProfileClicks?: number;
  };
}

interface TwitterMetricsProps {
  userId: string;
}

export default function TwitterMetrics({ userId }: TwitterMetricsProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Function to fetch Twitter metrics with useCallback to prevent recreation
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/twitter/metrics');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 404) {
          setIsConnected(false);
          setError('Twitter account not connected');
        } else if (response.status === 401) {
          setIsConnected(false);
          setError('Twitter authorization expired. Please reconnect your account.');
        } else {
          setError(errorData.error || 'Failed to fetch Twitter metrics');
        }
        
        setTweets([]);
        return;
      }
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        setTweets(data.data);
        setIsConnected(true);
      } else if (data.posts && Array.isArray(data.posts)) {
        // Handle the new format where data is in the posts field
        setTweets(data.posts.map((post: any) => ({
          id: post.id,
          text: post.text,
          created_at: post.createdAt,
          public_metrics: {
            retweet_count: post.metrics.retweets || 0,
            reply_count: post.metrics.replies || 0,
            like_count: post.metrics.likes || 0,
            quote_count: post.metrics.quotes || 0,
          },
          metrics: post.metrics
        })));
        setIsConnected(true);
      } else {
        setTweets([]);
        setError('No tweets found');
      }
    } catch (err) {
      console.error('Error fetching Twitter metrics:', err);
      setError('Failed to fetch Twitter metrics');
      setTweets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);  // Empty dependency array since it doesn't depend on props/state

  // Fetch metrics on component mount
  useEffect(() => {
    fetchMetrics();
    
    // Add visibility change listener to handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch data when tab becomes visible again
        fetchMetrics();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMetrics]);  // Include fetchMetrics in dependency array

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Calculate engagement rate
  const calculateEngagementRate = (tweet: Tweet) => {
    // If we have the engagements value from the historical metrics, use it
    if (tweet.metrics?.engagements && tweet.metrics?.impressions) {
      return ((tweet.metrics.engagements / tweet.metrics.impressions) * 100).toFixed(2);
    }
    
    // Fall back to calculating from public metrics
    const impressions = tweet.metrics?.impressions || 
                        tweet.non_public_metrics?.impression_count || 
                        tweet.organic_metrics?.impression_count || 0;
    
    if (impressions === 0) return '0.00';
    
    const interactions = (tweet.public_metrics.like_count || 0) + 
                        (tweet.public_metrics.retweet_count || 0) + 
                        (tweet.public_metrics.reply_count || 0) + 
                        (tweet.public_metrics.quote_count || 0);
    
    return ((interactions / impressions) * 100).toFixed(2);
  };

  // If Twitter is not connected
  if (!isConnected && !isLoading) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Metrics</h2>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">
            {error || 'Connect your Twitter account to see your metrics'}
          </p>
          <a
            href="/accounts/connect?platform=twitter"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md inline-block"
          >
            Connect Twitter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Metrics</h2>
        </div>
        
        <button
          onClick={fetchMetrics}
          disabled={isLoading}
          className="text-gray-400 hover:text-white"
          title="Refresh metrics"
        >
          <FaSync className={`${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-blue-400">Loading metrics...</div>
        </div>
      ) : error ? (
        <div className="text-center py-6">
          <p className="text-red-400">{error}</p>
        </div>
      ) : tweets.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400">No tweets found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {tweets.map((tweet) => (
            <div key={tweet.id} className="border border-dark-400 rounded-lg p-4 hover:border-blue-500 transition-colors">
              <p className="mb-3 text-white">{tweet.text}</p>
              
              <div className="text-sm text-gray-400 mb-3">
                {formatDate(tweet.created_at)}
              </div>
              
              {/* Primary metrics in a grid layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="bg-dark-600 p-3 rounded-lg flex flex-col items-center">
                  <FaEye className="text-blue-400 mb-1" />
                  <span className="font-bold text-white">
                    {(tweet.metrics?.impressions || 
                     tweet.non_public_metrics?.impression_count || 
                     tweet.organic_metrics?.impression_count || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Impressions</span>
                </div>
                
                <div className="bg-dark-600 p-3 rounded-lg flex flex-col items-center">
                  <FaChartBar className="text-green-400 mb-1" />
                  <span className="font-bold text-white">{calculateEngagementRate(tweet)}%</span>
                  <span className="text-xs text-gray-400">Engagement</span>
                </div>
                
                <div className="bg-dark-600 p-3 rounded-lg flex flex-col items-center">
                  <FaHeart className="text-red-400 mb-1" />
                  <span className="font-bold text-white">
                    {(tweet.public_metrics.like_count || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Likes</span>
                </div>
                
                <div className="bg-dark-600 p-3 rounded-lg flex flex-col items-center">
                  <FaRetweet className="text-green-400 mb-1" />
                  <span className="font-bold text-white">
                    {(tweet.public_metrics.retweet_count || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Retweets</span>
                </div>
              </div>
              
              {/* Secondary metrics in a more compact layout */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                  <FaComment className="text-yellow-400 mb-1 text-sm" />
                  <span className="font-bold text-white text-sm">
                    {(tweet.public_metrics.reply_count || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400">Replies</span>
                </div>
                
                {tweet.metrics?.profileVisits !== undefined && (
                  <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                    <FaUser className="text-purple-400 mb-1 text-sm" />
                    <span className="font-bold text-white text-sm">
                      {tweet.metrics.profileVisits.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Profile Visits</span>
                  </div>
                )}
                
                {tweet.metrics?.linkClicks !== undefined && (
                  <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                    <FaLink className="text-blue-400 mb-1 text-sm" />
                    <span className="font-bold text-white text-sm">
                      {tweet.metrics.linkClicks.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Link Clicks</span>
                  </div>
                )}
                
                {tweet.metrics?.mediaViews !== undefined && (
                  <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                    <FaImage className="text-green-400 mb-1 text-sm" />
                    <span className="font-bold text-white text-sm">
                      {tweet.metrics.mediaViews.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Media Views</span>
                  </div>
                )}
                
                {tweet.metrics?.detailExpands !== undefined && (
                  <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                    <FaExpand className="text-yellow-400 mb-1 text-sm" />
                    <span className="font-bold text-white text-sm">
                      {tweet.metrics.detailExpands.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Expands</span>
                  </div>
                )}
                
                {tweet.public_metrics.quote_count > 0 && (
                  <div className="bg-dark-600 p-2 rounded-lg flex flex-col items-center">
                    <FaTwitter className="text-blue-400 mb-1 text-sm" />
                    <span className="font-bold text-white text-sm">
                      {tweet.public_metrics.quote_count.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">Quotes</span>
                  </div>
                )}
              </div>
              
              {/* View on Twitter link */}
              <div className="mt-3 text-right">
                <a 
                  href={`https://twitter.com/i/web/status/${tweet.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View on Twitter
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 