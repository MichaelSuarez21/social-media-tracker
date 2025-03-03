'use client';

import { useState } from 'react';

export default function Settings() {
  const [name, setName] = useState('Michael Suarez');
  const [email, setEmail] = useState('michael@example.com');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [weeklyReportsEnabled, setWeeklyReportsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    
    // Simulate saving settings
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setSuccessMessage('Settings updated successfully');
    setIsLoading(false);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account preferences</p>
      </div>
      
      <div className="bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
        <div className="p-6 border-b border-dark-400">
          <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
        </div>
        <div className="p-6">
          {successMessage && (
            <div className="mb-6 p-3 bg-green-900/30 border border-green-800 rounded text-green-200 text-sm">
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
              />
            </div>
            
            <div className="pt-4 border-t border-dark-400">
              <h3 className="text-lg font-medium text-white mb-4">Notification Settings</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="notifications"
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-400 rounded bg-dark-600"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="notifications" className="text-gray-300 font-medium">
                      Enable Email Notifications
                    </label>
                    <p className="text-gray-400">
                      Receive notifications about significant changes in your social media metrics.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="weekly-reports"
                      type="checkbox"
                      checked={weeklyReportsEnabled}
                      onChange={(e) => setWeeklyReportsEnabled(e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-400 rounded bg-dark-600"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="weekly-reports" className="text-gray-300 font-medium">
                      Weekly Performance Reports
                    </label>
                    <p className="text-gray-400">
                      Receive a weekly summary of your social media performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-70"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="mt-8 bg-dark-500 rounded-lg border border-dark-400 overflow-hidden">
        <div className="p-6 border-b border-dark-400">
          <h2 className="text-xl font-semibold text-white">Danger Zone</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Delete Account</h3>
              <p className="text-gray-400 mt-1">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <button className="mt-4 md:mt-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 