'use client';

import { useAuth } from '@/lib/auth';
import PublicHeader from '@/components/PublicHeader';
import DashboardHeader from '@/components/DashboardHeader';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import logger from '@/lib/logger';

export default function HeaderManager() {
  const { session, user, isLoading } = useAuth();
  const pathname = usePathname();
  // Track what we should display
  const [showHeader, setShowHeader] = useState<string | null>(null);
  
  // Only show DashboardHeader when authenticated, otherwise show PublicHeader
  // Special case: No header on auth callback page
  useEffect(() => {
    if (pathname?.startsWith('/auth/callback')) {
      setShowHeader(null);
      return;
    }

    // Consider a path to be protected/authenticated if it starts with:
    const authenticatedRoutes = [
      '/dashboard',
      '/account',
      '/accounts',
      '/analytics',
      '/settings',
    ];

    // Check if the current path is an authenticated route
    const isAuthenticatedRoute = authenticatedRoutes.some(route => 
      pathname?.startsWith(route)
    );

    // Check for Supabase auth token in localStorage as a backup
    let hasSupabaseAuth = false;
    try {
      hasSupabaseAuth = typeof window !== 'undefined' && 
        !!localStorage.getItem('supabase.auth.token');
      
      logger.debug('HeaderManager', 'Initial localStorage auth check:', hasSupabaseAuth);
    } catch (e) {
      logger.error('HeaderManager', 'Error checking localStorage:', e);
    }

    // Wait for auth to load before showing headers
    if (isLoading) {
      setShowHeader(null);
      return;
    }

    // On authenticated routes, skip header if not authenticated
    if (isAuthenticatedRoute) {
      if (user || session) {
        setShowHeader('dashboard');
      } else {
        setShowHeader(null);
      }
      logger.debug('HeaderManager', 'Auth loading complete, session:', !!session);
    } else {
      // On public routes, show public header
      setShowHeader('public');
    }
  }, [pathname, session, user, isLoading]);
  
  logger.debug('HeaderManager', 'Rendering state', {
    session: !!session,
    isLoading,
    showHeader,
    userId: user?.id,
    pathname,
    isAuthenticatedRoute: pathname && ['/dashboard', '/account', '/accounts', '/analytics', '/settings'].some(route => pathname.startsWith(route))
  });
  
  // Render the appropriate header based on auth state
  if (showHeader === null) {
    if (pathname && ['/dashboard', '/account', '/accounts', '/analytics', '/settings'].some(route => pathname.startsWith(route))) {
      logger.debug('HeaderManager', 'On authenticated route, skipping header render', pathname);
      return null;
    }
    return <PublicHeader />;
  }
  
  if (showHeader === 'dashboard') {
    logger.debug('HeaderManager', 'Rendering DashboardHeader');
    return <DashboardHeader />;
  }
  
  logger.debug('HeaderManager', 'No header determined yet, showing PublicHeader as fallback');
  return <PublicHeader />;
} 