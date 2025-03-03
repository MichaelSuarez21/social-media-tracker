'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function PublicHeader() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Add logging to help debug
  console.log('PublicHeader render - Auth state:', { 
    user: user ? 'exists' : 'null', 
    isLoading,
    pathname
  });
  
  // Determine if we should show this header based on auth status
  useEffect(() => {
    console.log('PublicHeader useEffect - user changed:', !!user);
    setIsAuthenticated(!!user);
  }, [user]);

  // Don't show the public header on auth callback route
  if (pathname.startsWith('/auth/callback')) {
    console.log('PublicHeader - hiding on auth callback route');
    return null;
  }

  // Don't show on authenticated routes
  if (pathname.startsWith('/(authenticated)') || pathname.startsWith('/dashboard')) {
    console.log('PublicHeader - hiding on authenticated route path');
    return null;
  }

  // Don't show the public header for authenticated users
  if (isAuthenticated) {
    console.log('PublicHeader - hiding for authenticated user');
    return null;
  }

  // Show loading state while auth is being determined
  if (isLoading) {
    console.log('PublicHeader - still loading auth state');
    return null; // Don't show header while authentication is being checked
  }

  console.log('PublicHeader - showing for unauthenticated user');
  
  // Only show for non-authenticated users on public routes
  return (
    <header className="border-b border-dark-400 bg-dark-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg
                className="h-8 w-8 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="ml-2 text-xl font-semibold">SocialTrack</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6">
            <Link 
              href="/login" 
              className="text-gray-300 hover:text-white flex items-center h-9"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center h-9"
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 