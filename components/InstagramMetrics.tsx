import React, { useState, useEffect, useCallback } from 'react';
import {
  FaHeart,
  FaComment,
  FaEye,
  FaSpinner,
  FaExclamationTriangle,
  FaInstagram,
  FaCalendar,
  FaImage,
  FaVideo,
  FaSignOutAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import clsx from 'clsx';

interface InstagramMetricsProps {
  className?: string;
}

interface Post {
  id: string;
  text?: string;
  imageUrl?: string;
  createdAt: Date;
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    impressions?: number;
    [key: string]: any;
  };
}

interface InstagramData {
  accountInfo: {
    username: string;
    displayName: string;
    followers: number;
    following?: number;
    profileImageUrl?: string;
  };
  posts: Post[];
  period: {
    start: Date;
    end: Date;
  };
  _cache?: {
    fromCache: boolean;
    timestamp?: number;
    expired?: boolean;
    error?: boolean;
  };
}

export default function InstagramMetrics({ className }: InstagramMetricsProps) {
  const [data, setData] = useState<InstagramData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/instagram/metrics');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Instagram metrics');
      }
      
      const metricsData = await response.json();
      
      // Process dates from strings to Date objects
      const processedData: InstagramData = {
        ...metricsData,
        period: {
          start: new Date(metricsData.period.start),
          end: new Date(metricsData.period.end)
        },
        posts: metricsData.posts.map((post: any) => ({
          ...post,
          createdAt: new Date(post.createdAt)
        }))
      };
      
      setData(processedData);
    } catch (err: any) {
      console.error('Error fetching Instagram metrics:', err);
      setError(err.message || 'Failed to load Instagram metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  
  if (isLoading) {
    return (
      <div className={clsx('flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow', className)}>
        <FaSpinner className="text-4xl text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading Instagram metrics...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={clsx('flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow', className)}>
        <FaExclamationTriangle className="text-4xl text-amber-500 mb-4" />
        <p className="text-red-600 font-medium mb-2">Error loading Instagram metrics</p>
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={fetchMetrics}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className={clsx('flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow', className)}>
        <FaExclamationTriangle className="text-4xl text-amber-500 mb-4" />
        <p className="text-gray-600">No Instagram data available</p>
        <a 
          href="/accounts" 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          <FaInstagram />
          Connect Instagram
        </a>
      </div>
    );
  }
  
  return (
    <div className={clsx('bg-white rounded-lg shadow overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FaInstagram className="text-2xl mr-2" />
            <div>
              <h3 className="font-bold text-lg">{data.accountInfo.displayName || data.accountInfo.username}</h3>
              <p className="text-sm opacity-90">@{data.accountInfo.username}</p>
            </div>
          </div>
          {data._cache && (
            <div className="text-xs opacity-75">
              {data._cache.fromCache ? 'Cached data from ' + 
                format(new Date(data._cache.timestamp || 0), 'h:mm a') : 'Fresh data'}
            </div>
          )}
        </div>
      </div>
      
      {/* Account Stats */}
      <div className="p-4 border-b">
        <h4 className="text-sm font-medium text-gray-500 mb-3">ACCOUNT OVERVIEW</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100 text-purple-500 mr-3">
              <FaHeart />
            </div>
            <div>
              <p className="text-xs text-gray-500">Media Posts</p>
              <p className="font-bold text-gray-800">
                {data.posts?.length || 0}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-100 text-pink-500 mr-3">
              <FaImage />
            </div>
            <div>
              <p className="text-xs text-gray-500">Last Post</p>
              <p className="font-bold text-gray-800">
                {data.posts?.[0] ? 
                  format(new Date(data.posts[0]?.createdAt), 'MMM d') : 
                  'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Media */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-500 mb-3">RECENT MEDIA</h4>
        <div className="space-y-4">
          {data.posts && data.posts.length > 0 ? (
            data.posts.slice(0, 3).map((post) => (
              <div key={post.id} className="flex border rounded-lg overflow-hidden">
                {post.imageUrl ? (
                  <div className="w-24 h-24 bg-gray-200">
                    <img 
                      src={post.imageUrl} 
                      alt="Post" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/96x96/purple/white?text=Instagram';
                      }} 
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gray-200 flex items-center justify-center text-gray-400">
                    <FaImage className="text-2xl" />
                  </div>
                )}
                <div className="flex-1 p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    <FaCalendar className="inline mr-1" />
                    {format(new Date(post.createdAt), 'MMM d, yyyy')}
                  </div>
                  <p className="text-sm line-clamp-2 mb-2">
                    {post.text || 'No caption'}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    {post.metrics.likes !== undefined && (
                      <span className="flex items-center">
                        <FaHeart className="mr-1" /> {post.metrics.likes || 0}
                      </span>
                    )}
                    {post.metrics.comments !== undefined && (
                      <span className="flex items-center">
                        <FaComment className="mr-1" /> {post.metrics.comments || 0}
                      </span>
                    )}
                    {post.metrics.impressions !== undefined && (
                      <span className="flex items-center">
                        <FaEye className="mr-1" /> {post.metrics.impressions || 0}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-4 text-gray-500">
              No recent posts found
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <a 
          href="/instagram-dashboard" 
          className="text-purple-600 text-sm font-medium hover:text-purple-800 flex items-center justify-center"
        >
          View Instagram Analytics
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
} 