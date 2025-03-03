'use client';

import { useEffect, useState } from 'react';
import TwitterMetrics from '../../../components/TwitterMetrics';

export default function Analytics() {
  const [userId, setUserId] = useState<string>('');

  // Get the user ID for Twitter metrics
  useEffect(() => {
    // In a real app, you would get this from your auth context or session
    // For now, we'll use a mock ID
    setUserId('mock-user-id');
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400">In-depth analysis of your social media performance</p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <TwitterMetrics userId={userId} />
      </div>
      
      <div className="bg-dark-500 rounded-lg border border-dark-400 p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">More Analytics Coming Soon</h2>
        <p className="text-gray-400 max-w-lg mx-auto">
          We're working hard to bring you even more powerful analytics tools to help you understand your audience and optimize your content.
        </p>
      </div>
    </div>
  );
} 