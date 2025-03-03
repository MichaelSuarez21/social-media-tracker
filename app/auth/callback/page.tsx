'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback page loaded - processing auth result');
        
        // Exchange the code for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          router.push('/login?error=session_error');
          return;
        }
        
        if (session?.user) {
          console.log('User authenticated:', session.user.id);
          
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError && profileError.code === 'PGRST116') {
            console.log('Profile not found, creating new profile for user');
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: session.user.id,
                  full_name: session.user.user_metadata.full_name || session.user.email?.split('@')[0],
                  avatar_url: session.user.user_metadata.avatar_url,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              ]);
              
            if (insertError) {
              console.error('Error creating profile:', insertError);
              // Continue anyway, we can address profile issues later
            }
          } else {
            console.log('Profile found for user');
          }
          
          // Redirect to dashboard after successful auth and profile management
          router.push('/dashboard');
        } else {
          console.error('No user session after authentication');
          router.push('/login?error=no_session');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Completing Sign In...</h2>
        <p className="text-gray-400">Please wait while we set up your account.</p>
      </div>
    </div>
  );
} 