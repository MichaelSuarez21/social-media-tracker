'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Exchange the code for a session
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession();

      // If there's an error, log it
      if (error) {
        console.error('Error exchanging code for session:', error);
        router.push('/login?error=Could not authenticate user');
        return;
      }

      // Redirect to the dashboard upon successful auth
      router.push('/dashboard');
    };

    handleAuthCallback();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Signing you in...</h2>
        <p className="text-gray-400">Please wait while we complete the authentication process.</p>
      </div>
    </div>
  );
} 