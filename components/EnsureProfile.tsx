'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';

export default function EnsureProfile({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Only run if we have a user but no profile
    if (!user || profile) {
      return;
    }

    // Silent profile check and creation
    const ensureProfileExists = async () => {
      try {
        // First check if a profile exists in the database
        logger.debug('EnsureProfile', 'Silent check started for user', user.id);
        
        const { data, error: checkError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          // Profile exists in database, trigger a refresh
          logger.info('EnsureProfile', 'Profile already exists in database, refreshing page');
          await refreshProfile();
          return;
        }
        
        // No profile exists, create one
        logger.info('EnsureProfile', 'Creating profile silently in the background');
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
              avatar_url: user.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
          
        if (insertError) {
          logger.error('EnsureProfile', 'Error creating profile:', insertError);
        } else {
          logger.info('EnsureProfile', 'Profile created successfully, refreshing page');
          await refreshProfile();
        }
      } catch (error) {
        logger.error('EnsureProfile', 'Error in profile check/creation:', error);
      }
    };

    // Run the check
    ensureProfileExists();
  }, [user, profile, supabase, refreshProfile]);

  return <>{children}</>;
} 