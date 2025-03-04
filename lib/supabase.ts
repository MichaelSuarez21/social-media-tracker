import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User, Session, PostgrestError, AuthError } from '@supabase/supabase-js';

/**
 * Environment variables for Supabase configuration
 * These are set in .env.local and must be prefixed with NEXT_PUBLIC_ to be accessible in the browser
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

/**
 * Single Supabase client instance for the entire application
 * Use this for direct Supabase operations when the built-in helpers aren't sufficient
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

/**
 * Response type for auth and database operations
 */
export type SupabaseResponse<T> = {
  data: T | null;
  error: AuthError | PostgrestError | null;
};

/**
 * Type for user profile data stored in the profiles table
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
 * Type for social account data stored in the social_accounts table
 */
export interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  access_token: string;
  refresh_token?: string;
  token_secret?: string;
  expires_at?: Date;
  scopes?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Authentication helper functions
 * Provides simplified methods for common auth operations
 */
export const auth = {
  /**
   * Sign up a new user with email and password
   * @param email User's email address
   * @param password User's password
   * @param metadata Optional additional data to store with the user
   * @returns Auth response with user data or error
   */
  signUp: async (
    email: string, 
    password: string, 
    metadata?: { full_name?: string }
  ): Promise<SupabaseResponse<{ user: User | null; session: Session | null }>> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    return { data, error };
  },

  /**
   * Sign in an existing user with email and password
   * @param email User's email address
   * @param password User's password
   * @returns Auth response with user session data or error
   */
  signIn: async (
    email: string, 
    password: string
  ): Promise<SupabaseResponse<{ user: User | null; session: Session | null }>> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  /**
   * Sign in with a third-party OAuth provider
   * @param provider The OAuth provider to use (google, twitter, facebook)
   * @returns Auth response with OAuth URL and provider info
   */
  signInWithProvider: async (
    provider: 'google' | 'twitter' | 'facebook'
  ): Promise<SupabaseResponse<{ provider: string; url: string | null }>> => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  /**
   * Sign out the current user
   * @returns Response with any error that occurred during sign out
   */
  signOut: async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current authenticated user
   * @returns Response with the user object or error
   */
  getUser: async (): Promise<{ user: User | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  /**
   * Get the current authenticated session
   * @returns Response with the session object or error
   */
  getSession: async (): Promise<{ session: Session | null; error: AuthError | null }> => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Send a password reset email to a user
   * @param email The email address of the user
   * @returns Response with confirmation data or error
   */
  resetPassword: async (email: string): Promise<SupabaseResponse<{}>> => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },
};

/**
 * Database helper functions
 * Provides simplified methods for common database operations
 */
export const db = {
  /**
   * Get a user's profile from the profiles table
   * @param userId The user's ID to retrieve the profile for
   * @returns Response with the profile data or error
   */
  getUserProfile: async (userId: string): Promise<{
    profile: UserProfile | null;
    error: PostgrestError | null;
  }> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { profile: data as UserProfile | null, error };
  },

  /**
   * Update a user's profile in the profiles table
   * @param userId The user's ID to update the profile for
   * @param updates The fields to update in the profile
   * @returns Response with the updated data or error
   */
  updateUserProfile: async (userId: string, updates: Partial<UserProfile>): Promise<{
    data: UserProfile[] | null;
    error: PostgrestError | null;
  }> => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select();
    return { data: data as UserProfile[] | null, error };
  },

  /**
   * Get all connected social accounts for a user
   * @param userId The user's ID to retrieve accounts for
   * @returns Response with the accounts data or error
   */
  getConnectedAccounts: async (userId: string): Promise<{
    accounts: SocialAccount[] | null;
    error: PostgrestError | null;
  }> => {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId);
    return { accounts: data as SocialAccount[] | null, error };
  },

  /**
   * Add a new connected social account for a user
   * @param userId The user's ID to add the account for
   * @param accountData The social account data to add
   * @returns Response with the inserted data or error
   */
  addConnectedAccount: async (userId: string, accountData: Omit<SocialAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{
    data: SocialAccount[] | null;
    error: PostgrestError | null;
  }> => {
    const { data, error } = await supabase
      .from('social_accounts')
      .insert([{ 
        user_id: userId, 
        ...accountData,
        created_at: new Date(),
        updated_at: new Date()
      }])
      .select();
    return { data: data as SocialAccount[] | null, error };
  },

  /**
   * Remove a connected social account
   * @param accountId The ID of the account to remove
   * @returns Response with the deleted data or error
   */
  removeConnectedAccount: async (accountId: string): Promise<{
    data: SocialAccount[] | null;
    error: PostgrestError | null;
  }> => {
    const { data, error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('id', accountId)
      .select();
    return { data: data as SocialAccount[] | null, error };
  },
};

// Add this to your .env.local file
// NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key 