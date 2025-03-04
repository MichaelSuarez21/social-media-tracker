'use client';

import { createContext, useContext, useEffect, useState, createElement } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, User, AuthChangeEvent, AuthError } from '@supabase/supabase-js';
import logger from './logger';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Interface defining the structure of a user profile
 */
export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Type for the authentication context that's provided throughout the app
 */
export type AuthContextType = {
  /** The current authenticated user from Supabase */
  user: User | null;
  /** The user's profile data from the profiles table */
  profile: UserProfile | null;
  /** The current authenticated session */
  session: Session | null;
  /** Whether authentication state is still loading */
  isLoading: boolean;
  /** Function to sign in with email and password */
  signIn: (email: string, password: string) => Promise<{data: any, error: AuthError | null}>;
  /** Function to sign up with email and password */
  signUp: (email: string, password: string, metadata?: { full_name: string }) => Promise<{data: any, error: Error | null}>;
  /** Function to sign in with a third-party provider */
  signInWithProvider: (provider: string) => Promise<{data: any, error: Error | null}>;
  /** Function to sign out the current user */
  signOut: () => Promise<{error: Error | null}>;
  /** Function to update the user's profile */
  updateProfile: (data: Partial<UserProfile>) => Promise<{data: UserProfile | null, error: Error | null}>;
  /** Function to refresh the user's profile data */
  refreshProfile: () => Promise<UserProfile | null>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  signIn: () => Promise.resolve({data: null, error: null}),
  signUp: () => Promise.resolve({data: null, error: null}),
  signInWithProvider: () => Promise.resolve({data: null, error: null}),
  signOut: () => Promise.resolve({error: null}),
  updateProfile: () => Promise.resolve({data: null, error: null}),
  refreshProfile: () => Promise.resolve(null),
});

// Create a provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create a supabase client once at component initialization
  const supabase = createClientComponentClient();
  
  // Add logging to track state changes
  useEffect(() => {
    logger.info('auth', `Auth state changed: User: ${!!user}, Profile: ${!!profile}, Session: ${!!session}, Loading: ${isLoading}`);
  }, [user, profile, session, isLoading]);

  // Force an initialization of the session from local storage token
  const forceInitializeSession = async () => {
    logger.info('Auth', 'Manually initializing session from token...');
    
    try {
      // Check if there's a token in localStorage first
      // @ts-ignore - Accessing window is safe in client components
      const hasToken = typeof window !== 'undefined' && 
        localStorage.getItem('supabase.auth.token') !== null;
        
      logger.info('Auth', 'Token in localStorage:', hasToken);
      
      if (hasToken) {
        // Refresh session to ensure it's valid
        const { data, error } = await supabase.auth.refreshSession();
        logger.info('Auth', 'Session refresh result:', { 
          success: !!data.session, 
          error: error?.message || 'none',
          user: data.session?.user?.id || 'none'
        });
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // Try to load profile
          logger.info('Auth', 'Loading profile after manual session init');
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError) {
            logger.error('Auth', 'Error loading profile during manual init:', profileError.message);
          } else if (profileData) {
            logger.info('Auth', 'Profile loaded successfully during manual init');
            setProfile(profileData as UserProfile);
          }
          
          return true;
        }
      }
      return false;
    } catch (err) {
      logger.error('Auth', 'Error in manual session initialization:', err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  // Fetch the user's profile from Supabase
  const fetchProfile = async (userId: string) => {
    if (!userId) {
      logger.error('Auth', 'fetchProfile: No user ID provided');
      return null;
    }

    logger.info('Auth', `fetchProfile: Fetching profile for user ${userId}`);
    const supabase = createClientComponentClient();
    
    try {
      // Check for existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          logger.info('Auth', `fetchProfile: No profile found for user ${userId}, creating one`);
          
          // Get user data to help with profile creation
          const { data: userData } = await supabase.auth.getUser();
          const user = userData?.user;
          
          // Create a new profile for this user
          const newProfile: UserProfile = {
            id: userId,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            avatar_url: user?.user_metadata?.avatar_url || null,
            timezone: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          logger.info('Auth', `fetchProfile: Creating profile with data:`, newProfile);
          
          // Insert the new profile - convert undefined to null for the database
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{...newProfile, timezone: null}])
            .select('*')
            .single();
            
          if (createError) {
            logger.error('Auth', `fetchProfile: Failed to create profile`, createError.message);
            return null;
          }
          
          logger.info('Auth', `fetchProfile: Successfully created profile`, createdProfile);
          return createdProfile as UserProfile;
        }
        
        logger.error('Auth', `fetchProfile: Error fetching profile for user ${userId}:`, error.message);
        return null;
      }
      
      logger.info('Auth', `fetchProfile: Successfully retrieved profile for user ${userId}:`, data);
      return data as UserProfile;
    } catch (error) {
      logger.error('Auth', `fetchProfile: Exception fetching profile for user ${userId}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  };

  // Add a direct refresh function that can be called anywhere in the app
  const refreshProfile = async () => {
    logger.info('Auth', 'Manual profile refresh requested');
    if (!user) {
      logger.warn('Auth', 'Cannot refresh profile: No user logged in');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        logger.error('Auth', 'Error refreshing profile:', error.message);
        throw error;
      }
      
      logger.info('Auth', 'Profile refreshed successfully');
      setProfile(data);
      return data;
    } catch (error) {
      logger.error('Auth', 'Failed to refresh profile:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  };

  // Fetch the current session and set user/profile states
  const getSession = async () => {
    logger.info('Auth', '******** Starting session check - detailed diagnostics ********');
    setIsLoading(true);
    
    try {
      // Fetch the session from Supabase
      logger.info('Auth', 'Fetching session from Supabase');
      const { data: { session: newSession }, error } = await supabase.auth.getSession();
      
      logger.info('Auth', 'Session check result:', { 
        hasSession: !!newSession,
        hasUser: newSession?.user ? 'yes' : 'no',
        userId: newSession?.user?.id || 'none',
      });
      
      if (error) {
        logger.error('Auth', 'Error fetching session:', error.message);
        setIsLoading(false);
        return null;
      }
      
      // Update session state
      setSession(newSession);
      
      if (newSession?.user) {
        logger.info('Auth', `User authenticated: ${newSession.user.id} (${newSession.user.email})`);
        setUser(newSession.user);
        
        // Direct fetch from profiles table
        logger.info('Auth', `Directly checking profiles table for user: ${newSession.user.id}`);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
            
          if (profileError) {
            logger.error('Auth', `Error fetching profile directly: ${profileError.message}`);
            if (profileError.code === 'PGRST116') {
              logger.info('Auth', 'Profile not found, will create one');
              // Create a new profile
              const newProfile = {
                id: newSession.user.id,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
                avatar_url: newSession.user.user_metadata?.avatar_url || null,
                timezone: null,  // null for DB
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              logger.info('Auth', 'Creating profile with data:', newProfile);
              
              const { data: createdProfile, error: createError } = await supabase
                .from('profiles')
                .insert([newProfile])
                .select('*')
                .single();
                
              if (createError) {
                logger.error('Auth', 'Failed to create profile:', createError.message);
              } else if (createdProfile) {
                logger.info('Auth', 'Profile created successfully:', createdProfile);
                setProfile(createdProfile as UserProfile);
              }
            }
          } else if (profileData) {
            logger.info('Auth', 'Found existing profile:', profileData);
            setProfile(profileData as UserProfile);
          }
        } catch (err) {
          logger.error('Auth', 'Exception fetching/creating profile:', err instanceof Error ? err.message : String(err));
        }
      } else {
        // No user in session, clear user and profile states
        logger.info('Auth', 'No user in session, clearing user and profile states');
        setUser(null);
        setProfile(null);
      }
      
      logger.info('Auth', '******** Session check complete ********');
      setIsLoading(false);
      return newSession;
    } catch (err) {
      logger.error('Auth', 'Exception during session check:', err instanceof Error ? err.message : String(err));
      setIsLoading(false);
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      logger.info('Auth', 'Initializing auth state...');
      try {
        // First try standard session retrieval
        const session = await getSession();
        
        // If that doesn't work, try manual initialization
        if (!session) {
          logger.info('Auth', 'Standard session retrieval failed, attempting manual initialization');
          await forceInitializeSession();
        }
        
        // Subscribe to auth state changes
        logger.info('Auth', 'Setting up auth state change subscription');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            logger.info('Auth', 'Auth state changed:', event, newSession?.user?.id || 'no user');
            
            // Update session/user state
            setSession(newSession);
            setUser(newSession?.user || null);
            
            if (newSession?.user) {
              try {
                logger.info('Auth', 'Loading profile after auth change');
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', newSession.user.id)
                  .single();
                  
                if (profileError) {
                  logger.error('Auth', 'Error loading profile after auth change:', profileError.message);
                  setProfile(null);
                } else if (profileData) {
                  logger.info('Auth', 'Profile loaded successfully after auth change');
                  setProfile(profileData as UserProfile);
                }
              } catch (err) {
                logger.error('Auth', 'Exception loading profile after auth change:', err instanceof Error ? err.message : String(err));
                setProfile(null);
              }
            } else {
              // Clear profile if no user
              setProfile(null);
            }
          }
        );

        // Cleanup subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        logger.error('Auth', 'Error in auth initialization:', error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);
  
  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  };
  
  // Sign up with email and password
  const signUp = async (email: string, password: string, metadata?: { full_name: string }) => {
    try {
      logger.info('Auth', 'Starting signup process...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      logger.info('Auth', 'Auth signup result:', { user: authData?.user?.id, error: authError?.message });
      
      if (authError) throw authError;

      // If signup was successful, create a profile
      if (authData?.user) {
        try {
          logger.info('Auth', 'Creating profile for new user:', authData.user.id);
          
          // Create profile with retries
          const createProfileWithRetry = async (retries = 3) => {
            try {
              // Build profile data
              const userId = authData.user?.id;
              const userEmail = authData.user?.email;
              const userMetadata = authData.user?.user_metadata;
              
              if (!userId) {
                throw new Error('User ID is missing, cannot create profile');
              }
              
              const profileData = {
                id: userId,
                full_name: metadata?.full_name || (userEmail ? userEmail.split('@')[0] : 'User'),
                avatar_url: userMetadata?.avatar_url || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              // Use upsert to prevent duplicates
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .upsert([profileData], { onConflict: 'id' })
                .select();
                
              if (profileError) {
                logger.error('Auth', 'Profile creation error:', profileError.message);
                if (retries > 0) {
                  logger.info('Auth', `Retrying profile creation (${retries} attempts left)...`);
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return createProfileWithRetry(retries - 1);
                }
                return null;
              }
              
              logger.info('Auth', 'Profile created successfully:', profile);
              return profile;
            } catch (error) {
              if (retries > 0) {
                logger.info('Auth', `Retrying profile creation (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return createProfileWithRetry(retries - 1);
              }
              return null;
            }
          };
          
          await createProfileWithRetry();
        } catch (profileError) {
          logger.error('Auth', 'Failed to create profile after multiple attempts:', profileError instanceof Error ? profileError.message : String(profileError));
          // Continue with auth flow even if profile creation fails
          // We'll try to create it again when user signs in
        }
      }

      return authData;
    } catch (error) {
      logger.error('Auth', 'Signup error:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
  
  // Sign in with social provider
  const signInWithProvider = async (provider: string) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    
    if (error) throw error;
    return data;
  };
  
  // Sign out
  const signOut = async (): Promise<{error: Error | null}> => {
    try {
      // Sign out of Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Auth', 'Error signing out:', error.message);
        return { error };
      }
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Auth', 'Exception during sign out:', error.message);
      return { error };
    }
  };

  // Update user profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    logger.info('Auth', 'Updating profile with data');
    
    if (!user) {
      logger.error('Auth', 'Cannot update profile: No user logged in');
      throw new Error('You must be logged in to update your profile');
    }
    
    try {
      // First, check if the profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (fetchError && fetchError.code === 'PGRST116') {
        logger.info('Auth', 'Profile does not exist, creating new profile for user:', user.id);
        
        // Create a new profile with the provided data and default values
        const newProfile: Partial<UserProfile> = {
          id: user.id,
          full_name: data.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: data.avatar_url,
          timezone: data.timezone || 'UTC',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        logger.info('Auth', 'Creating new profile with data');
        
        // Insert the new profile
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
          
        if (insertError) {
          logger.error('Auth', 'Error creating profile:', insertError.message);
          throw insertError;
        }
        
        logger.info('Auth', 'New profile created during update');
        setProfile(createdProfile);
        return createdProfile;
      } else if (fetchError) {
        logger.error('Auth', 'Error fetching profile for update:', fetchError.message);
        throw fetchError;
      }
      
      logger.info('Auth', 'Existing profile found');
      
      // Only update the fields that were provided in the data object
      const updateData: Partial<UserProfile> = {
        updated_at: new Date().toISOString(),
      };
      
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      
      logger.info('Auth', 'Updating profile with specific fields');
      
      // Update the profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
        
      if (updateError) {
        logger.error('Auth', 'Error updating profile:', updateError.message);
        throw updateError;
      }
      
      logger.info('Auth', 'Profile updated successfully');
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        return updatedProfile;
      } else {
        // If no data returned (which should not happen), fetch the profile explicitly
        logger.info('Auth', 'No data returned from update, fetching profile');
        return await refreshProfile();
      }
    } catch (error) {
      logger.error('Auth', 'Exception updating profile:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  };
  
  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    signIn: async (email, password) => {
      const result = await supabase.auth.signInWithPassword({ email, password });
      return { data: result.data, error: result.error };
    },
    signUp: async (email, password, metadata) => {
      try {
        const result = await signUp(email, password, metadata);
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    signInWithProvider: async (provider) => {
      try {
        const result = await signInWithProvider(provider);
        return { data: result, error: null };
      } catch (err) {
        return { data: null, error: err as Error };
      }
    },
    signOut,
    updateProfile,
    refreshProfile
  };
  
  return createElement(AuthContext.Provider, { value }, children);
}

// Create a hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 