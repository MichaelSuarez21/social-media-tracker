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
  
  // Determine which header to show based primarily on auth state
  // Special case: No header on auth callback page
  useEffect(() => {
    // Skip header on auth callback page
    if (pathname?.startsWith('/auth/callback')) {
      logger.debug('HeaderManager', 'On auth callback page, hiding header');
      setShowHeader(null);
      return;
    }

    // Wait for auth to load before making decisions
    if (isLoading) {
      logger.debug('HeaderManager', 'Auth still loading, delaying header decision');
      setShowHeader(null);
      return;
    }

    // If user is authenticated, show dashboard header regardless of path
    // (except for the callback page handled above)
    if (user || session) {
      logger.debug('HeaderManager', 'User is authenticated, showing dashboard header');
      setShowHeader('dashboard');
      return;
    }

    // For unauthenticated users, show the public header
    logger.debug('HeaderManager', 'User is not authenticated, showing public header');
    setShowHeader('public');
    
  }, [pathname, session, user, isLoading]);
  
  logger.debug('HeaderManager', 'Rendering state', {
    session: !!session,
    isLoading,
    showHeader,
    userId: user?.id,
    pathname
  });
  
  // Render the appropriate header based on auth state
  if (showHeader === null) {
    // When header state is null (loading or callback page)
    if (pathname && pathname.startsWith('/auth/callback')) {
      // No header on auth callback
      return null;
    }
    // Default to public header while loading
    return <PublicHeader />;
  }
  
  if (showHeader === 'dashboard') {
    logger.debug('HeaderManager', 'Rendering DashboardHeader');
    return <DashboardHeader />;
  }
  
  logger.debug('HeaderManager', 'Rendering PublicHeader');
  return <PublicHeader />;
} 