import { createClient } from '@supabase/supabase-js';

// These environment variables will be pulled from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

// Authentication helper functions
export const auth = {
  // Sign up a new user
  signUp: async (email: string, password: string, metadata?: { full_name?: string }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  // Sign in an existing user
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Sign in with a third-party provider
  signInWithProvider: async (provider: 'google' | 'twitter' | 'facebook') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Get the current user
  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  // Get the current session
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  // Reset password
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },
};

// Database helper functions
export const db = {
  // Get user profile
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { profile: data, error };
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: any) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    return { data, error };
  },

  // Get connected social accounts for a user
  getConnectedAccounts: async (userId: string) => {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId);
    return { accounts: data, error };
  },

  // Add a connected social account
  addConnectedAccount: async (userId: string, accountData: any) => {
    const { data, error } = await supabase
      .from('social_accounts')
      .insert([{ user_id: userId, ...accountData }]);
    return { data, error };
  },

  // Remove a connected social account
  removeConnectedAccount: async (accountId: string) => {
    const { data, error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId);
    return { data, error };
  },
};

// Add this to your .env.local file
// NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key 