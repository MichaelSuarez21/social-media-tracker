'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/supabase';

export default function DashboardHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { user } = await auth.getUser();
        if (user?.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else {
          setUserName(user?.email?.split('@')[0] || 'User');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await auth.signOut();
      if (error) {
        throw error;
      }
      
      // Redirect to home page after successful logout
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="bg-dark-600 border-b border-dark-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-white mr-8">
              Social<span className="text-primary-400">Track</span>
            </Link>
            
            {/* Navigation links - Updated to ensure vertical centering */}
            <nav className="flex h-full items-center">
              <ul className="flex space-x-6">
                <li>
                  <Link 
                    href="/dashboard" 
                    className={`py-2 inline-flex items-center ${
                      pathname === '/dashboard' 
                        ? 'text-white border-b-2 border-primary-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/analytics" 
                    className={`py-2 inline-flex items-center ${
                      pathname === '/analytics' 
                        ? 'text-white border-b-2 border-primary-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Analytics
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/accounts" 
                    className={`py-2 inline-flex items-center ${
                      pathname === '/accounts' 
                        ? 'text-white border-b-2 border-primary-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Accounts
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/settings" 
                    className={`py-2 inline-flex items-center ${
                      pathname === '/settings' 
                        ? 'text-white border-b-2 border-primary-400' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Settings
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link
              href="/accounts/connect"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Connect Account
            </Link>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="ml-2 text-white">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 