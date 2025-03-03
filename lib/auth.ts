'use client';

import { createContext, useContext, useEffect, useState, createElement } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

// Create a type for the auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<any>;
  signInWithProvider: (provider: string) => Promise<any>;
  signOut: () => Promise<any>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: () => Promise.resolve(),
  signUp: () => Promise.resolve(),
  signInWithProvider: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
});

// Create a provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    // Check for an existing session on mount
    const getSession = async () => {
      setIsLoading(true);
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getSession();
    
    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  // Define auth methods
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  };
  
  const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (error) throw error;
    return data;
  };
  
  const signInWithProvider = async (provider: string) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) throw error;
    return data;
  };
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };
  
  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signInWithProvider,
    signOut,
  };
  
  // Using React.createElement instead of JSX to avoid parsing issues
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