'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import logger from '@/lib/logger';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    // Check authentication status
    logger.debug('AuthGuard', 'Checking authentication status', { user: user?.id, authLoading: isLoading });

    // Wait for auth to finish loading
    if (!isLoading) {
      if (!user) {
        logger.info('AuthGuard', 'No user found, redirecting to login');
        router.push(`/login?redirect=${encodeURIComponent(pathname || '')}`);
      } else {
        logger.debug('AuthGuard', 'User authenticated:', user.id);
      }
    } else {
      // Fallback for auth taking too long - force render anyway after timeout
      const timer = setTimeout(() => {
        if (isLoading) {
          logger.warn('AuthGuard', 'Force rendering after timeout despite loading state', {
            userId: user?.id,
            pathname,
            isLoading
          });
          setForceRender(true);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, isLoading, router, pathname]);

  // Show nothing while redirecting or checking auth
  if (isLoading && !forceRender && !user) {
    return null;
  }

  // If we have a user, show the content
  if (user) {
    logger.debug('AuthGuard', 'User exists, rendering content immediately', user.id);
    return <>{children}</>;
  }

  // Fallback while redirecting
  return null;
} 