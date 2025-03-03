'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function PublicHeader() {
  const { session, isLoading } = useAuth();

  // Show nothing while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Don't render the header if user is authenticated
  if (session) {
    return null;
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex">
            <Link 
              href="/"
              className="flex items-center text-xl font-semibold text-white hover:text-gray-200 transition-colors"
            >
              SocialTrack
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
} 