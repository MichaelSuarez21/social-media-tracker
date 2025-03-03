import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  access_token: string;
  refresh_token?: string;
  token_secret?: string; // For OAuth 1.0 platforms
  expires_at?: Date;
  scopes?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface SocialTokens {
  access_token: string;
  refresh_token?: string;
  token_secret?: string;
  expires_at?: Date;
  scopes?: string;
}

export interface SocialMetrics {
  accountInfo: {
    username: string;
    displayName: string;
    followers: number;
    following?: number;
    profileImageUrl?: string;
  };
  posts: Array<{
    id: string;
    text?: string;
    imageUrl?: string;
    createdAt: Date;
    metrics: Record<string, any>;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

export abstract class BasePlatform {
  readonly platform: string;
  
  constructor(platform: string) {
    this.platform = platform;
  }

  // Abstract methods that platform-specific implementations must define
  // This returns the platform's auth base URL or identifier - actual OAuth URL is built in API routes
  abstract getAuthUrl(): string;
  
  // These methods are called from API routes
  abstract exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<SocialTokens>;
  abstract refreshTokens(refreshToken: string): Promise<SocialTokens>;
  abstract getMetrics(tokens: SocialTokens, params?: any): Promise<SocialMetrics>;

  // Common methods for all platforms
  async getConnectedAccount(userId: string): Promise<SocialAccount | null> {
    const supabase = createServerComponentClient({ cookies });
    
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', this.platform)
      .single();
      
    if (error || !data) {
      console.error(`Error fetching ${this.platform} account:`, error);
      return null;
    }
    
    return data as SocialAccount;
  }
  
  async saveTokens(userId: string, tokens: SocialTokens, platformUserId: string, platformUsername: string, metadata: Record<string, any> = {}): Promise<boolean> {
    const supabase = createServerComponentClient({ cookies });
    
    const accountData = {
      user_id: userId,
      platform: this.platform,
      platform_user_id: platformUserId,
      platform_username: platformUsername,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_secret: tokens.token_secret,
      expires_at: tokens.expires_at,
      scopes: tokens.scopes,
      metadata,
      updated_at: new Date()
    };
    
    // Upsert - insert if not exists, update if exists
    const { error } = await supabase
      .from('social_accounts')
      .upsert(accountData, { 
        onConflict: 'user_id,platform',
        ignoreDuplicates: false 
      });
      
    if (error) {
      console.error(`Error saving ${this.platform} tokens:`, error);
      return false;
    }
    
    return true;
  }
  
  async disconnectAccount(userId: string): Promise<boolean> {
    const supabase = createServerComponentClient({ cookies });
    
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', this.platform);
      
    if (error) {
      console.error(`Error disconnecting ${this.platform} account:`, error);
      return false;
    }
    
    return true;
  }
  
  // Helper methods for token management
  isTokenExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    // Consider tokens expired 5 minutes before actual expiry to avoid edge cases
    return new Date(expiresAt).getTime() < (Date.now() + 5 * 60 * 1000);
  }
  
  async ensureValidTokens(userId: string): Promise<SocialTokens | null> {
    const account = await this.getConnectedAccount(userId);
    if (!account) return null;
    
    const tokens: SocialTokens = {
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      token_secret: account.token_secret,
      expires_at: account.expires_at,
      scopes: account.scopes
    };
    
    // Check if token is expired and we have a refresh token
    if (this.isTokenExpired(account.expires_at) && account.refresh_token) {
      try {
        const newTokens = await this.refreshTokens(account.refresh_token);
        
        // Save the new tokens
        await this.saveTokens(
          userId, 
          newTokens, 
          account.platform_user_id, 
          account.platform_username,
          account.metadata
        );
        
        return newTokens;
      } catch (error) {
        console.error(`Failed to refresh ${this.platform} tokens:`, error);
        return null;
      }
    }
    
    return tokens;
  }
} 