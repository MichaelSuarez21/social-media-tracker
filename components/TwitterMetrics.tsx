'use client';

import { useState, useEffect } from 'react';
import { FaTwitter, FaSync, FaEye, FaRetweet, FaHeart, FaComment } from 'react-icons/fa';

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
}

interface TwitterMetricsProps {
  userId: string;
}

export default function TwitterMetrics({ userId }: TwitterMetricsProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Function to fetch Twitter metrics
  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/twitter/metrics');
      
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
  };

  // Fetch metrics on component mount
  useEffect(() => {
    fetchMetrics();
  }, [userId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
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
        <div className="space-y-4">
          {tweets.map((tweet) => (
            <div key={tweet.id} className="border-b border-dark-400 pb-4 last:border-0">
              <p className="mb-2">{tweet.text}</p>
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>{formatDate(tweet.created_at)}</span>
                
                <div className="flex space-x-4">
                  {tweet.non_public_metrics?.impression_count !== undefined && (
                    <div className="flex items-center" title="Impressions">
                      <FaEye className="mr-1" />
                      {tweet.non_public_metrics.impression_count.toLocaleString()}
                    </div>
                  )}
                  
                  <div className="flex items-center" title="Retweets">
                    <FaRetweet className="mr-1" />
                    {tweet.public_metrics.retweet_count.toLocaleString()}
                  </div>
                  
                  <div className="flex items-center" title="Likes">
                    <FaHeart className="mr-1" />
                    {tweet.public_metrics.like_count.toLocaleString()}
                  </div>
                  
                  <div className="flex items-center" title="Replies">
                    <FaComment className="mr-1" />
                    {tweet.public_metrics.reply_count.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 