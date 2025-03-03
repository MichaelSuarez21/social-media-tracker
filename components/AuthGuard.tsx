'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { session, error } = await auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session) {
          setIsAuthenticated(true);
        } else {
          // No session found, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-500">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
          <p className="text-gray-400">Please wait while we verify your credentials.</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
} 