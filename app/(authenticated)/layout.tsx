'use client';
import AuthGuard from '@/components/AuthGuard';
import EnsureProfile from '@/components/EnsureProfile';
import { usePathname } from 'next/navigation';
import logger from '@/lib/logger';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  logger.debug('AuthenticatedLayout', 'Rendering for path:', pathname);

  return (
    <AuthGuard>
      <EnsureProfile>
        <div className="min-h-screen bg-dark-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </div>
      </EnsureProfile>
    </AuthGuard>
  );
} 