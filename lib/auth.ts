'use client';

import { createContext, useContext, useEffect, useState, createElement } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

// Define types for user profile
interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced auth context type with profile
type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: { full_name: string }) => Promise<any>;
  signInWithProvider: (provider: string) => Promise<any>;
  signOut: () => Promise<any>;
  updateProfile: (data: Partial<UserProfile>) => Promise<any>;
  refreshProfile: () => Promise<UserProfile | null>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(),
  signInWithProvider: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
  updateProfile: () => Promise.resolve(),
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
    console.log('Auth state changed:', { 
      hasUser: !!user, 
      hasProfile: !!profile, 
      hasSession: !!session, 
      isLoading 
    });
  }, [user, profile, session, isLoading]);

  // Force an initialization of the session from local storage token
  const forceInitializeSession = async () => {
    console.log('Manually initializing session from token...');
    
    try {
      // Check if there's a token in localStorage first
      // @ts-ignore - Accessing window is safe in client components
      const hasToken = typeof window !== 'undefined' && 
        localStorage.getItem('supabase.auth.token') !== null;
        
      console.log('Token in localStorage:', hasToken);
      
      if (hasToken) {
        // Refresh session to ensure it's valid
        const { data, error } = await supabase.auth.refreshSession();
        console.log('Session refresh result:', { 
          success: !!data.session, 
          error: error?.message || 'none',
          user: data.session?.user?.id || 'none'
        });
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // Try to load profile
          console.log('Loading profile after manual session init');
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError) {
            console.error('Error loading profile during manual init:', profileError);
          } else if (profileData) {
            console.log('Profile loaded successfully during manual init');
            setProfile(profileData as UserProfile);
          }
          
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Error in manual session initialization:', err);
      return false;
    }
  };

  // Fetch the user's profile from Supabase
  const fetchProfile = async (userId: string) => {
    if (!userId) {
      console.error('fetchProfile: No user ID provided');
      return null;
    }

    console.log(`fetchProfile: Fetching profile for user ${userId}`);
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
          console.log(`fetchProfile: No profile found for user ${userId}, creating one`);
          
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
          
          console.log(`fetchProfile: Creating profile with data:`, newProfile);
          
          // Insert the new profile - convert undefined to null for the database
          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{...newProfile, timezone: null}])
            .select('*')
            .single();
            
          if (createError) {
            console.error(`fetchProfile: Failed to create profile`, createError);
            return null;
          }
          
          console.log(`fetchProfile: Successfully created profile`, createdProfile);
          return createdProfile as UserProfile;
        }
        
        console.error(`fetchProfile: Error fetching profile for user ${userId}:`, error);
        return null;
      }
      
      console.log(`fetchProfile: Successfully retrieved profile for user ${userId}:`, data);
      return data as UserProfile;
    } catch (error) {
      console.error(`fetchProfile: Exception fetching profile for user ${userId}:`, error);
      return null;
    }
  };

  // Add a direct refresh function that can be called anywhere in the app
  const refreshProfile = async () => {
    console.log('Manual profile refresh requested');
    if (!user) {
      console.warn('Cannot refresh profile: No user logged in');
      return null;
    }
    
    try {
      // Force a fresh fetch from the database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error refreshing profile:', error);
        throw error;
      }
      
      console.log('Profile refreshed successfully:', data);
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      throw error;
    }
  };

  // Fetch the current session and set user/profile states
  const getSession = async () => {
    console.log('******** Starting session check - detailed diagnostics ********');
    setIsLoading(true);
    
    try {
      // Fetch the session from Supabase
      console.log('Fetching session from Supabase');
      const { data: { session: newSession }, error } = await supabase.auth.getSession();
      
      console.log('Session check result:', { 
        hasSession: !!newSession,
        hasUser: newSession?.user ? 'yes' : 'no',
        userId: newSession?.user?.id || 'none',
        error: error ? error.message : 'none' 
      });
      
      if (error) {
        console.error('Error fetching session:', error);
        setIsLoading(false);
        return null;
      }
      
      // Update session state
      setSession(newSession);
      
      if (newSession?.user) {
        console.log(`User authenticated: ${newSession.user.id} (${newSession.user.email})`);
        setUser(newSession.user);
        
        // Direct fetch from profiles table
        console.log(`Directly checking profiles table for user: ${newSession.user.id}`);
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
            
          if (profileError) {
            console.error(`Error fetching profile directly: ${profileError.message}`);
            if (profileError.code === 'PGRST116') {
              console.log('Profile not found, will create one');
              // Create a new profile
              const newProfile = {
                id: newSession.user.id,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
                avatar_url: newSession.user.user_metadata?.avatar_url || null,
                timezone: null,  // null for DB
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              
              console.log('Creating profile with data:', newProfile);
              
              const { data: createdProfile, error: createError } = await supabase
                .from('profiles')
                .insert([newProfile])
                .select('*')
                .single();
                
              if (createError) {
                console.error('Failed to create profile:', createError);
              } else if (createdProfile) {
                console.log('Profile created successfully:', createdProfile);
                setProfile(createdProfile as UserProfile);
              }
            }
          } else if (profileData) {
            console.log('Found existing profile:', profileData);
            setProfile(profileData as UserProfile);
          }
        } catch (err) {
          console.error('Exception fetching/creating profile:', err);
        }
      } else {
        // No user in session, clear user and profile states
        console.log('No user in session, clearing user and profile states');
        setUser(null);
        setProfile(null);
      }
      
      console.log('******** Session check complete ********');
      setIsLoading(false);
      return newSession;
    } catch (err) {
      console.error('Exception during session check:', err);
      setIsLoading(false);
      return null;
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Initializing auth state...');
      try {
        // First try standard session retrieval
        const session = await getSession();
        
        // If that doesn't work, try manual initialization
        if (!session) {
          console.log('Standard session retrieval failed, attempting manual initialization');
          await forceInitializeSession();
        }
        
        // Set up auth change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.id || 'no user');
            
            // Update session/user state
            setSession(newSession);
            setUser(newSession?.user || null);
            
            // Load profile if session exists
            if (newSession?.user) {
              try {
                console.log('Loading profile after auth change');
                const { data: profileData, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', newSession.user.id)
                  .single();
                  
                if (profileError) {
                  console.error('Error loading profile after auth change:', profileError);
                  setProfile(null);
                } else if (profileData) {
                  console.log('Profile loaded successfully after auth change');
                  setProfile(profileData as UserProfile);
                }
              } catch (err) {
                console.error('Exception loading profile after auth change:', err);
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
            
            setIsLoading(false);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth initialization:', error);
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
      console.log('Starting signup process...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      console.log('Auth signup result:', { user: authData?.user?.id, error: authError?.message });
      
      if (authError) throw authError;

      // If signup successful and we have user data, create profile
      if (authData?.user) {
        try {
          console.log('Creating profile for new user:', authData.user.id);
          
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
                console.error('Profile creation error:', profileError);
                if (retries > 0) {
                  console.log(`Retrying profile creation (${retries} attempts left)...`);
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return createProfileWithRetry(retries - 1);
                }
                throw profileError;
              }
              
              console.log('Profile created successfully:', profile);
              return profile;
            } catch (error) {
              if (retries > 0) {
                console.log(`Retrying profile creation (${retries} attempts left)...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return createProfileWithRetry(retries - 1);
              }
              throw error;
            }
          };
          
          // Execute the profile creation with retries
          await createProfileWithRetry();
        } catch (profileError) {
          console.error('Failed to create profile after multiple attempts:', profileError);
          // Continue with auth flow even if profile creation fails
          // We'll try to create it again when user signs in
        }
      }

      return authData;
    } catch (error) {
      console.error('Signup error:', error);
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
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  // Update user profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    console.log('Updating profile with data:', data);
    
    if (!user) {
      console.error('Cannot update profile: No user logged in');
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
        console.log('Profile does not exist, creating new profile for user:', user.id);
        
        // Create a new profile with the provided data and default values
        const newProfile: Partial<UserProfile> = {
          id: user.id,
          full_name: user.user_metadata.full_name || user.email?.split('@')[0] || '',
          avatar_url: user.user_metadata.avatar_url,
          ...data, // Include the updates
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        console.log('Creating new profile with data:', newProfile);
        
        // Insert the new profile
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select('*')
          .single();
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }
        
        console.log('New profile created during update:', createdProfile);
        setProfile(createdProfile);
        return createdProfile;
      } else if (fetchError) {
        console.error('Error fetching profile for update:', fetchError);
        throw fetchError;
      }
      
      console.log('Existing profile found:', existingProfile);
      
      // Only update the fields that were provided in the data object
      const updateData: Partial<UserProfile> = {
        updated_at: new Date().toISOString()
      };
      
      // Add only the fields that were provided in the update
      if (data.full_name !== undefined) updateData.full_name = data.full_name;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      
      console.log('Updating profile with specific fields:', updateData);
      
      // Update the profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select('*')
        .single();
        
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      console.log('Profile updated successfully:', updatedProfile);
      
      if (updatedProfile) {
        setProfile(updatedProfile);
        return updatedProfile;
      } else {
        // If no data returned (which should not happen), fetch the profile explicitly
        console.log('No data returned from update, fetching profile');
        return await refreshProfile();
      }
    } catch (error) {
      console.error('Exception updating profile:', error);
      throw error;
    }
  };
  
  const value = {
    user,
    profile,
    session,
    isLoading,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
    updateProfile,
    refreshProfile,
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