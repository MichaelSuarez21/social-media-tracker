'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MetricsChart from '@/components/MetricsChart';
import { generateDateLabels, generateSampleData, formatNumber } from '@/lib/utils';
import { Bar, Line } from 'react-chartjs-2';
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

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('week');
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Generate labels based on selected timeframe
  const dateLabels = generateDateLabels(timeframe, timeframe === 'day' ? 14 : (timeframe === 'week' ? 8 : 6));

  // Generate demo data for charts
  const followersData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Twitter',
        data: generateSampleData(timeframe, dateLabels.length, 40000, 50000, 'up'),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Instagram',
        data: generateSampleData(timeframe, dateLabels.length, 30000, 35000, 'up'),
        borderColor: 'rgb(217, 70, 239)',
        backgroundColor: 'rgba(217, 70, 239, 0.5)',
      },
      {
        label: 'YouTube',
        data: generateSampleData(timeframe, dateLabels.length, 25000, 30000, 'up'),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
    ],
  };

  const viewsData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Twitter',
        data: generateSampleData(timeframe, dateLabels.length, 80000, 150000, 'up'),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Instagram',
        data: generateSampleData(timeframe, dateLabels.length, 100000, 200000, 'stable'),
        borderColor: 'rgb(217, 70, 239)',
        backgroundColor: 'rgba(217, 70, 239, 0.5)',
      },
      {
        label: 'YouTube',
        data: generateSampleData(timeframe, dateLabels.length, 200000, 250000, 'up'),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
    ],
  };

  const engagementData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Twitter',
        data: generateSampleData(timeframe, dateLabels.length, 1, 5, 'stable'),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Instagram',
        data: generateSampleData(timeframe, dateLabels.length, 2, 7, 'down'),
        borderColor: 'rgb(217, 70, 239)',
        backgroundColor: 'rgba(217, 70, 239, 0.5)',
      },
      {
        label: 'YouTube',
        data: generateSampleData(timeframe, dateLabels.length, 3, 8, 'stable'),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
      },
    ],
  };

  // Calculate total followers
  const totalFollowers = followersData.datasets.reduce(
    (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
    0
  );

  // Calculate total views
  const totalViews = viewsData.datasets.reduce(
    (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
    0
  );

  // Calculate average engagement
  const avgEngagement =
    engagementData.datasets.reduce(
      (sum, dataset) => sum + dataset.data[dataset.data.length - 1],
      0
    ) / engagementData.datasets.length;

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
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
          <p className="text-3xl font-bold text-white">3</p>
          <p className="text-gray-400 text-sm mt-2">Twitter, Instagram, YouTube</p>
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
      
      {/* Connected Accounts Section */}
      <div className="mt-8">
        <div className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
          <div className="p-6 border-b border-dark-400">
            <h2 className="text-xl font-semibold text-white">Connected Accounts</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
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