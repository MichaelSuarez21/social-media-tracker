'use client';

import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="border-b border-dark-400 bg-dark-600 sticky top-0 z-10">
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
      </div>
    </header>
  );
} 