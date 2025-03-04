'use client';
import React from 'react';
import AuthGuard from '@/components/AuthGuard';
import EnsureProfile from '@/components/EnsureProfile';
import { ToastProvider } from '@/components/ui/Toast';
import logger from '@/lib/logger';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  logger.debug('Layout', 'Authenticated layout rendered');
  
  return (
    <ToastProvider>
      <AuthGuard>
        <EnsureProfile>
          <div className="min-h-screen bg-dark-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </div>
        </EnsureProfile>
      </AuthGuard>
    </ToastProvider>
  );
} 