'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/settings/profile');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto"></div>
    </div>
  );
} 