'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaTwitter, FaSync, FaChartLine, FaStar, FaSortAmountDown } from 'react-icons/fa';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import { Line, Bar, Pie, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

interface Tweet {
  id: string;
  text: string;
  createdAt: Date;
  metrics: {
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

interface TwitterEngagementData {
  accountInfo: {
    username: string;
    displayName: string;
    followers: number;
    following: number;
    profileImageUrl?: string;
  };
  posts: Tweet[];
  period: {
    start: Date;
    end: Date;
  };
}

interface TwitterEngagementAnalyticsProps {
  userId: string;
}

export default function TwitterEngagementAnalytics({ userId }: TwitterEngagementAnalyticsProps) {
  const [data, setData] = useState<TwitterEngagementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('engagementRate');
  const [topTweets, setTopTweets] = useState<Tweet[]>([]);

  // Use useCallback to prevent recreation of fetchMetrics on each render
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/twitter/metrics');
      
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || `Failed to fetch Twitter metrics (${response.status})`);
        return;
      }
      
      const responseData = await response.json();
      
      // Format the response data
      const formattedData: TwitterEngagementData = {
        accountInfo: responseData.accountInfo || {
          username: 'unknown',
          displayName: 'Unknown',
          followers: 0,
          following: 0
        },
        posts: (responseData.posts || []).map((post: any) => ({
          id: post.id,
          text: post.text,
          createdAt: new Date(post.createdAt),
          metrics: post.metrics || {}
        })),
        period: {
          start: new Date(responseData.period?.start || Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(responseData.period?.end || Date.now())
        }
      };
      
      setData(formattedData);
      
      // Calculate top tweets based on engagement
      const sortedTweets = [...formattedData.posts].sort((a, b) => {
        const aEngagementRate = calculateEngagementRate(a);
        const bEngagementRate = calculateEngagementRate(b);
        return bEngagementRate - aEngagementRate;
      });
      
      setTopTweets(sortedTweets.slice(0, 5)); // Get top 5 tweets
      
    } catch (err) {
      console.error('Error fetching Twitter metrics:', err);
      setError('Failed to fetch Twitter metrics');
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array since it doesn't use any props/state

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
  }, [fetchMetrics]); // Include fetchMetrics in dependency array

  // Calculate engagement rate for a tweet
  const calculateEngagementRate = (tweet: Tweet): number => {
    if (!tweet.metrics.impressions) return 0;
    
    const engagements = tweet.metrics.engagements || 
                       (tweet.metrics.likes + tweet.metrics.retweets + 
                        tweet.metrics.replies + (tweet.metrics.quotes || 0));
    
    return (engagements / tweet.metrics.impressions) * 100;
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Truncate text for display
  const truncateText = (text: string, maxLength: number = 60): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Get chart data based on selected metric
  const getChartData = () => {
    if (!data || !data.posts || data.posts.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: 'No Data',
            data: [],
            borderColor: 'rgba(29, 161, 242, 1)',
            backgroundColor: 'rgba(29, 161, 242, 0.5)',
          },
        ],
      };
    }

    // Sort posts by date (ascending)
    const sortedPosts = [...data.posts].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    const labels = sortedPosts.map(post => formatDate(post.createdAt));
    
    // Get data based on the selected metric
    let chartData: number[] = [];
    let label = '';
    
    switch (selectedMetric) {
      case 'impressions':
        chartData = sortedPosts.map(post => post.metrics.impressions || 0);
        label = 'Impressions';
        break;
      case 'engagementRate':
        chartData = sortedPosts.map(post => calculateEngagementRate(post));
        label = 'Engagement Rate (%)';
        break;
      case 'likes':
        chartData = sortedPosts.map(post => post.metrics.likes || 0);
        label = 'Likes';
        break;
      case 'retweets':
        chartData = sortedPosts.map(post => post.metrics.retweets || 0);
        label = 'Retweets';
        break;
      case 'profileVisits':
        chartData = sortedPosts.map(post => post.metrics.profileVisits || 0);
        label = 'Profile Visits';
        break;
      case 'linkClicks':
        chartData = sortedPosts.map(post => post.metrics.linkClicks || 0);
        label = 'Link Clicks';
        break;
      default:
        chartData = sortedPosts.map(post => calculateEngagementRate(post));
        label = 'Engagement Rate (%)';
    }

    return {
      labels,
      datasets: [
        {
          label,
          data: chartData,
          borderColor: 'rgba(29, 161, 242, 1)',
          backgroundColor: 'rgba(29, 161, 242, 0.5)',
          tension: 0.2,
        },
      ],
    };
  };

  // Get engagement distribution data for pie chart
  const getEngagementDistributionData = () => {
    if (!data || !data.posts || data.posts.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
          },
        ],
      };
    }

    // Aggregate all engagement metrics
    let totalLikes = 0;
    let totalRetweets = 0;
    let totalReplies = 0;
    let totalLinkClicks = 0;
    let totalProfileVisits = 0;
    
    data.posts.forEach(post => {
      totalLikes += post.metrics.likes || 0;
      totalRetweets += post.metrics.retweets || 0;
      totalReplies += post.metrics.replies || 0;
      totalLinkClicks += post.metrics.linkClicks || 0;
      totalProfileVisits += post.metrics.profileVisits || 0;
    });

    return {
      labels: ['Likes', 'Retweets', 'Replies', 'Link Clicks', 'Profile Visits'],
      datasets: [
        {
          data: [totalLikes, totalRetweets, totalReplies, totalLinkClicks, totalProfileVisits],
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Get engagement radar chart data
  const getEngagementRadarData = () => {
    if (!topTweets || topTweets.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Get the top 3 tweets
    const top3Tweets = topTweets.slice(0, 3);

    return {
      labels: ['Impressions', 'Engagement', 'Likes', 'Retweets', 'Replies', 'Link Clicks'],
      datasets: top3Tweets.map((tweet, index) => {
        // Normalize the values to make the chart readable
        const impressions = tweet.metrics.impressions ? Math.log10(tweet.metrics.impressions) : 0;
        const engagements = tweet.metrics.engagements ? Math.log10(tweet.metrics.engagements) : 0;
        const likes = tweet.metrics.likes ? Math.log10(tweet.metrics.likes) : 0;
        const retweets = tweet.metrics.retweets ? Math.log10(tweet.metrics.retweets) : 0;
        const replies = tweet.metrics.replies ? Math.log10(tweet.metrics.replies) : 0;
        const linkClicks = tweet.metrics.linkClicks ? Math.log10(tweet.metrics.linkClicks) : 0;

        // Different colors for each tweet
        const colors = [
          'rgba(29, 161, 242, 0.7)',
          'rgba(121, 75, 196, 0.7)',
          'rgba(23, 191, 99, 0.7)',
        ];

        return {
          label: `Tweet ${index + 1}`,
          data: [impressions, engagements, likes, retweets, replies, linkClicks],
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.7', '1'),
          borderWidth: 1,
        };
      }),
    };
  };

  if (isLoading) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Engagement Analytics</h2>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-blue-400">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Engagement Analytics</h2>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  if (!data || !data.posts || data.posts.length === 0) {
    return (
      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <div className="flex items-center mb-4">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Engagement Analytics</h2>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-400">No Twitter data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <FaTwitter className="text-blue-400 text-2xl mr-3" />
          <h2 className="text-xl font-semibold">Twitter Engagement Analytics</h2>
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
      
      {/* Account Summary */}
      <div className="bg-dark-600 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">Account Summary</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-gray-400">Username</p>
            <p className="font-medium">@{data.accountInfo.username}</p>
          </div>
          <div>
            <p className="text-gray-400">Followers</p>
            <p className="font-medium">{data.accountInfo.followers.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Following</p>
            <p className="font-medium">{data.accountInfo.following.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-400">Tweets Analyzed</p>
            <p className="font-medium">{data.posts.length}</p>
          </div>
        </div>
      </div>
      
      {/* Metric Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          <FaChartLine className="inline-block mr-2" />
          Performance Over Time
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'engagementRate' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('engagementRate')}
          >
            Engagement Rate
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'impressions' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('impressions')}
          >
            Impressions
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'likes' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('likes')}
          >
            Likes
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'retweets' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('retweets')}
          >
            Retweets
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'profileVisits' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('profileVisits')}
          >
            Profile Visits
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              selectedMetric === 'linkClicks' 
                ? 'bg-blue-500 text-white' 
                : 'bg-dark-600 text-gray-300 hover:bg-dark-700'
            }`}
            onClick={() => setSelectedMetric('linkClicks')}
          >
            Link Clicks
          </button>
        </div>
        
        {/* Line Chart */}
        <div className="bg-dark-600 rounded-lg p-4" style={{ height: '300px' }}>
          <Line 
            data={getChartData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                  }
                },
                x: {
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                  }
                }
              },
              plugins: {
                legend: {
                  labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                }
              }
            }}
          />
        </div>
      </div>
      
      {/* Engagement Distribution & Top Tweets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Engagement Distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Engagement Distribution
          </h3>
          <div className="bg-dark-600 rounded-lg p-4" style={{ height: '300px' }}>
            <Pie 
              data={getEngagementDistributionData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: 'rgba(255, 255, 255, 0.7)',
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Top Tweets Performance Comparison */}
        <div>
          <h3 className="text-lg font-semibold mb-2">
            Top Tweets Comparison
          </h3>
          <div className="bg-dark-600 rounded-lg p-4" style={{ height: '300px' }}>
            <Radar 
              data={getEngagementRadarData()} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    angleLines: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                    pointLabels: {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                    ticks: {
                      backdropColor: 'transparent',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }
                  }
                },
                plugins: {
                  legend: {
                    labels: {
                      color: 'rgba(255, 255, 255, 0.7)',
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Top Performing Tweets */}
      <div>
        <h3 className="text-lg font-semibold mb-2">
          <FaStar className="inline-block mr-2" />
          Top Performing Tweets
        </h3>
        <div className="bg-dark-600 rounded-lg p-4">
          {topTweets.length > 0 ? (
            <div className="space-y-4">
              {topTweets.map((tweet, index) => (
                <div key={tweet.id} className="border-b border-dark-400 pb-3 last:border-0">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <p className="mb-2">{truncateText(tweet.text, 100)}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-blue-400">
                          {formatDate(tweet.createdAt)}
                        </span>
                        <span>
                          {tweet.metrics.impressions.toLocaleString()} impressions
                        </span>
                        <span>
                          {calculateEngagementRate(tweet).toFixed(2)}% engagement
                        </span>
                        <a 
                          href={`https://twitter.com/i/web/status/${tweet.id}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View Tweet
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              No tweet data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 