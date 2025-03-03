'use client';

import Link from 'next/link';
import { useState } from 'react';

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

export default function ConnectAccounts() {
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    { id: 'twitter', name: 'Twitter', icon: 'T', color: 'bg-blue-500', connected: false },
    { id: 'instagram', name: 'Instagram', icon: 'I', color: 'bg-gradient-to-tr from-purple-500 to-pink-500', connected: false },
    { id: 'facebook', name: 'Facebook', icon: 'F', color: 'bg-blue-600', connected: false },
    { id: 'youtube', name: 'YouTube', icon: 'Y', color: 'bg-red-600', connected: false },
    { id: 'pinterest', name: 'Pinterest', icon: 'P', color: 'bg-red-500', connected: false },
    { id: 'twitch', name: 'Twitch', icon: 'T', color: 'bg-purple-600', connected: false },
    { id: 'tiktok', name: 'TikTok', icon: 'T', color: 'bg-black', connected: false },
    { id: 'bluesky', name: 'BlueSky', icon: 'B', color: 'bg-blue-400', connected: false },
  ]);

  const connectPlatform = (platformId: string) => {
    // In a real app, this would open the OAuth flow for the selected platform
    console.log(`Connecting to ${platformId}...`);
    
    // For demo, we'll just mark it as connected
    setPlatforms(platforms.map(p => 
      p.id === platformId ? { ...p, connected: true } : p
    ));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <Link href="/dashboard" className="text-primary-400 hover:text-primary-300 inline-flex items-center mb-4">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-white">Connect Social Media Accounts</h1>
        <p className="text-gray-400 mt-2">
          Link your social media accounts to track statistics and analyze performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden hover:border-primary-500 transition-colors"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`w-12 h-12 ${platform.color} rounded-full flex items-center justify-center`}>
                  <span className="text-white text-xl font-bold">{platform.icon}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-medium text-white">{platform.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {platform.connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 mb-6">
                Connect your {platform.name} account to track followers, engagement, and more.
              </p>
              <button
                onClick={() => connectPlatform(platform.id)}
                disabled={platform.connected}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  platform.connected
                    ? 'bg-green-800 text-green-100 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                }`}
              >
                {platform.connected ? 'Connected ✓' : 'Connect Account'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-dark-500 rounded-lg border border-dark-400 p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Don't see your platform?</h2>
        <p className="text-gray-400 mb-4">
          We're continuously adding support for more social media platforms. Let us know which ones you'd like to see next.
        </p>
        <button className="px-4 py-2 bg-dark-600 hover:bg-dark-700 text-white rounded-md transition-colors">
          Request a Platform
        </button>
      </div>
    </div>
  );
} 