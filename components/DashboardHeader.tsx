'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  // Get user's initials from full name or fallback to email
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <header className="border-b border-dark-400 bg-dark-600 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
              <svg
                className="h-8 w-8 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="ml-2 text-xl font-semibold">SocialTrack</span>
            </Link>
            
            <nav className="ml-10 hidden md:flex items-center space-x-4">
              <Link 
                href="/dashboard" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/dashboard')
                    ? "bg-dark-500 text-white"
                    : "text-gray-300 hover:bg-dark-500 hover:text-white"
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/accounts" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/accounts')
                    ? "bg-dark-500 text-white"
                    : "text-gray-300 hover:bg-dark-500 hover:text-white"
                }`}
              >
                Accounts
              </Link>
              <Link 
                href="/analytics" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/analytics')
                    ? "bg-dark-500 text-white"
                    : "text-gray-300 hover:bg-dark-500 hover:text-white"
                }`}
              >
                Analytics
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center">
            {/* User profile and logout */}
            <div className="ml-4 relative flex items-center">
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-600 focus:ring-blue-500"
                >
                  <span className="sr-only">Open user menu</span>
                  {profile?.avatar_url ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={profile.avatar_url}
                      alt={profile.full_name || 'User avatar'}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-medium">
                      {getInitials()}
                    </div>
                  )}
                </button>
                
                {isMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md shadow-lg py-1 bg-dark-500 ring-1 ring-dark-400 focus:outline-none">
                    <div className="px-4 py-2 border-b border-dark-400">
                      {profile?.full_name && (
                        <p className="text-sm font-medium text-white">
                          {profile.full_name}
                        </p>
                      )}
                      <p className="text-sm text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <Link 
                      href="/settings/profile" 
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-dark-400"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <div className="border-t border-dark-400">
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-dark-400"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-white focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/dashboard')
                  ? "bg-dark-500 text-white"
                  : "text-gray-300 hover:bg-dark-500 hover:text-white"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/accounts"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/accounts')
                  ? "bg-dark-500 text-white"
                  : "text-gray-300 hover:bg-dark-500 hover:text-white"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Accounts
            </Link>
            <Link
              href="/analytics"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/analytics')
                  ? "bg-dark-500 text-white"
                  : "text-gray-300 hover:bg-dark-500 hover:text-white"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Analytics
            </Link>
            <Link
              href="/settings/profile"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/settings/profile')
                  ? "bg-dark-500 text-white"
                  : "text-gray-300 hover:bg-dark-500 hover:text-white"
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Profile Settings
            </Link>
            <button
              onClick={() => {
                handleLogout();
                setIsMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-dark-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
} 