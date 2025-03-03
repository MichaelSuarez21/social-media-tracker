'use client';
import AuthGuard from '@/components/AuthGuard';
import DashboardHeader from '@/components/DashboardHeader';
import { usePathname } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  console.log('AuthenticatedLayout rendering for path:', pathname);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-dark-600">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
} 