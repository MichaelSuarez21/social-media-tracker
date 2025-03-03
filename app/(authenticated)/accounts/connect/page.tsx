'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConnectAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get('platform') || '';
  
  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform);
  const [isConnecting, setIsConnecting] = useState(false);

  const platforms = [
    { id: 'twitter', name: 'Twitter', icon: '🐦' },
    { id: 'instagram', name: 'Instagram', icon: '📸' },
    { id: 'facebook', name: 'Facebook', icon: '👤' },
    { id: 'youtube', name: 'YouTube', icon: '📹' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'pinterest', name: 'Pinterest', icon: '📌' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'bluesky', name: 'BlueSky', icon: '🔷' },
  ];

  const handleConnect = async () => {
    if (!selectedPlatform) {
      alert('Please select a platform to connect');
      return;
    }

    setIsConnecting(true);
    
    try {
      // In a real app, this would initiate OAuth flow
      console.log(`Connecting to ${selectedPlatform}...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirect back to accounts page after successful connection
      router.push('/accounts');
    } catch (error) {
      console.error('Error connecting account:', error);
      alert('Failed to connect account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Connect a New Account</h1>
        <Link
          href="/accounts"
          className="text-gray-400 hover:text-gray-300"
        >
          Back to Accounts
        </Link>
      </div>

      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <h2 className="text-xl font-semibold mb-4">Select Platform</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              className={`p-4 rounded-lg border flex flex-col items-center justify-center h-24 transition-colors ${
                selectedPlatform === platform.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-dark-400 bg-dark-600 hover:bg-dark-500'
              }`}
              onClick={() => setSelectedPlatform(platform.id)}
            >
              <span className="text-2xl mb-2">{platform.icon}</span>
              <span className="text-sm">{platform.name}</span>
            </button>
          ))}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleConnect}
            disabled={!selectedPlatform || isConnecting}
            className={`px-6 py-2 rounded-md ${
              !selectedPlatform
                ? 'bg-gray-700 cursor-not-allowed'
                : isConnecting
                ? 'bg-blue-700 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isConnecting ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
      </div>
    </div>
  );
} 