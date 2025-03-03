'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([
    // Sample data - replace with actual API call in production
    { id: 1, platform: 'Twitter', username: '@yourusername', icon: '🐦', connected: true },
    { id: 2, platform: 'Instagram', username: '@yourusername', icon: '📸', connected: true },
    { id: 3, platform: 'Facebook', username: 'Your Page', icon: '👤', connected: false },
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Accounts</h1>
        <p className="text-gray-400">Manage your connected social media accounts</p>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Social Media Accounts</h1>
        <Link
          href="/accounts/connect"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          Add Account
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => (
          <div key={account.id} className="bg-dark-500 rounded-lg p-4 border border-dark-400">
            <div className="flex items-center mb-4">
              <div className="text-2xl mr-3">{account.icon}</div>
              <div>
                <h3 className="font-semibold">{account.platform}</h3>
                <p className="text-gray-400">{account.username}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span
                className={`px-2 py-1 rounded text-xs ${
                  account.connected
                    ? "bg-green-900/30 text-green-400"
                    : "bg-red-900/30 text-red-400"
                }`}
              >
                {account.connected ? "Connected" : "Disconnected"}
              </span>
              <button
                onClick={() => {
                  // Handle account management
                  if (account.connected) {
                    if (confirm(`Are you sure you want to disconnect ${account.platform}?`)) {
                      // Call API to disconnect
                      const updatedAccounts = accounts.map(acc => 
                        acc.id === account.id ? { ...acc, connected: false } : acc
                      );
                      setAccounts(updatedAccounts);
                    }
                  } else {
                    // Redirect to connect page
                    window.location.href = `/accounts/connect?platform=${account.platform.toLowerCase()}`;
                  }
                }}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {account.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="bg-dark-500 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-4">You haven't connected any social media accounts yet.</p>
          <Link
            href="/accounts/connect"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Connect Your First Account
          </Link>
        </div>
      )}
    </div>
  );
} 