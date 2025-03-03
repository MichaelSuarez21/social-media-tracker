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
});

// Create a provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  
  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    setIsLoading(true); // Ensure loading state is true before checking session
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        setSession(session);
        setUser(session?.user || null);
        
        // Fetch profile if user exists
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initialize session
    getSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
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
      
      console.log('Auth signup result:', { authData, authError });
      
      if (authError) throw authError;

      // If signup successful and we have user data, create profile
      if (authData.user && metadata?.full_name) {
        // Add a small delay to ensure auth session is established
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Creating profile for user:', authData.user.id);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: metadata.full_name,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        console.log('Profile creation result:', { profileError });
        if (profileError) throw profileError;
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
    if (!user?.id) throw new Error('No user logged in');

    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    // Refresh profile data
    await fetchProfile(user.id);
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