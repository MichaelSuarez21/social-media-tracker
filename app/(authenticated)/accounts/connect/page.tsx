'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaTwitter, FaInstagram, FaFacebook, FaYoutube, FaTiktok, FaPinterest, FaExclamationTriangle } from 'react-icons/fa';
import { SiLinkedin, SiBluesky } from 'react-icons/si';
import { useToast } from '@/components/ui/Toast';

// Define platform interface for scalability
interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
}

export default function ConnectAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get('platform') || '';
  const isReconnect = searchParams.get('reconnect') === 'true';
  
  const [selectedPlatform, setSelectedPlatform] = useState(initialPlatform);
  const [isConnecting, setIsConnecting] = useState(false);
  const { addToast } = useToast();

  // Define our supported platforms - easy to add new ones
  const platforms: SocialPlatform[] = [
    { 
      id: 'twitter', 
      name: 'Twitter', 
      icon: <FaTwitter className="text-2xl" />, 
      color: 'border-blue-500 bg-blue-900/20', 
      available: true 
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: <FaInstagram className="text-2xl" />, 
      color: 'border-pink-500 bg-pink-900/20', 
      available: false 
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: <FaFacebook className="text-2xl" />, 
      color: 'border-blue-600 bg-blue-900/20', 
      available: false 
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: <FaYoutube className="text-2xl" />, 
      color: 'border-red-500 bg-red-900/20', 
      available: false 
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: <FaTiktok className="text-2xl" />, 
      color: 'border-gray-300 bg-gray-900/20', 
      available: false 
    },
    { 
      id: 'pinterest', 
      name: 'Pinterest', 
      icon: <FaPinterest className="text-2xl" />, 
      color: 'border-red-600 bg-red-900/20', 
      available: false 
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: <SiLinkedin className="text-2xl" />, 
      color: 'border-blue-700 bg-blue-900/20', 
      available: false 
    },
    { 
      id: 'bluesky', 
      name: 'BlueSky', 
      icon: <SiBluesky className="text-2xl" />, 
      color: 'border-blue-400 bg-blue-900/20', 
      available: false 
    },
  ];

  // Auto-select platform from URL param on load
  useEffect(() => {
    if (initialPlatform) {
      setSelectedPlatform(initialPlatform);
    }
  }, [initialPlatform]);

  const handleConnect = async () => {
    if (!selectedPlatform) {
      addToast({
        type: 'error',
        message: 'Please select a platform to connect'
      });
      return;
    }

    const platform = platforms.find(p => p.id === selectedPlatform);
    
    if (!platform) {
      addToast({
        type: 'error',
        message: 'Invalid platform selected'
      });
      return;
    }
    
    if (!platform.available) {
      addToast({
        type: 'info',
        message: `${platform.name} integration is coming soon!`
      });
      return;
    }

    setIsConnecting(true);
    
    try {
      // Set a flag in localStorage to indicate this is a reconnection
      if (isReconnect) {
        localStorage.setItem('reconnecting_platform', selectedPlatform);
      }
      
      // Our new API structure uses a consistent pattern
      window.location.href = `/api/social/${selectedPlatform}/login?${isReconnect ? 'reconnect=true' : ''}`;
      return; // Don't reset isConnecting since we're navigating away
    } catch (error) {
      console.error('Error connecting account:', error);
      addToast({
        type: 'error',
        message: 'Failed to connect account. Please try again.'
      });
      setIsConnecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isReconnect ? 'Reconnect Account' : 'Connect a New Account'}
        </h1>
        <Link
          href="/accounts"
          className="text-gray-400 hover:text-gray-300"
        >
          Back to Accounts
        </Link>
      </div>

      {isReconnect && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800 rounded-lg flex items-start">
          <FaExclamationTriangle className="text-amber-500 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-amber-400 font-medium">Token Expired</h3>
            <p className="text-gray-300 text-sm mt-1">
              Your {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} token has expired. 
              You need to reconnect to continue receiving metrics.
            </p>
          </div>
        </div>
      )}

      <div className="bg-dark-500 rounded-lg p-6 border border-dark-400">
        <h2 className="text-xl font-semibold mb-4">Select Platform</h2>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              className={`p-4 rounded-lg border flex flex-col items-center justify-center h-24 transition-colors ${
                selectedPlatform === platform.id
                  ? platform.color
                  : 'border-dark-400 bg-dark-600 hover:bg-dark-500'
              } ${!platform.available ? 'opacity-60' : 'opacity-100'}`}
              onClick={() => setSelectedPlatform(platform.id)}
            >
              {platform.icon}
              <span className="text-sm mt-2">{platform.name}</span>
              {!platform.available && (
                <span className="text-xs text-gray-400 mt-1">Coming soon</span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleConnect}
            disabled={!selectedPlatform || isConnecting || !platforms.find(p => p.id === selectedPlatform)?.available}
            className={`px-6 py-2 rounded-md ${
              !selectedPlatform || !platforms.find(p => p.id === selectedPlatform)?.available
                ? 'bg-gray-700 cursor-not-allowed'
                : isConnecting
                ? 'bg-blue-700 cursor-wait'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            {isConnecting ? 'Connecting...' : isReconnect ? 'Reconnect Account' : 'Connect Account'}
          </button>
        </div>
      </div>
    </div>
  );
} 