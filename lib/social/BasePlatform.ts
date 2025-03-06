import { createClientComponentClient, createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import logger from "@/lib/logger";

/**
 * Interface representing a social media account stored in the database
 */
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

/**
 * Interface representing authentication tokens for a social media platform
 */
export interface SocialTokens {
  access_token: string;
  refresh_token?: string;
  token_secret?: string;
  expires_at?: Date;
  scopes?: string;
  success?: boolean; // For indicating success of token operations
}

/**
 * Interface representing metrics data from a social media platform
 */
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

/**
 * Type for metrics with cache information
 */
export type CachedSocialMetrics = SocialMetrics & { 
  _cache?: { 
    fromCache: boolean; 
    timestamp?: number;
    expired?: boolean;
    error?: boolean;
    age?: number;
    source?: 'memory' | 'database' | 'api';
  } 
};

/**
 * Interface for the database metrics record
 */
export interface SocialMetricsRecord {
  social_account_id: string;
  metric_date: string;
  followers: number;
  following: number;
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate?: number;
}

/**
 * Abstract base class for all social media platform implementations
 * Defines the common interface and shared functionality
 */
export abstract class BasePlatform {
  readonly platform: string;
  
  /**
   * Creates a new platform instance
   * @param platform The platform identifier (e.g., 'twitter', 'facebook')
   */
  constructor(platform: string) {
    this.platform = platform;
    logger.debug(this.platform, 'Platform initialized');
  }

  /**
   * Returns the base authentication URL for this platform
   * @returns The base auth URL
   */
  abstract getAuthUrl(): string;
  
  /**
   * Exchanges an authorization code for access/refresh tokens
   * @param code The authorization code from the OAuth flow
   * @param codeVerifier Optional PKCE code verifier for OAuth 2.0 with PKCE
   * @returns Promise resolving to the tokens
   */
  abstract exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<SocialTokens>;
  
  /**
   * Refreshes expired access tokens using a refresh token
   * @param refreshToken The refresh token
   * @returns Promise resolving to the new tokens
   */
  abstract refreshTokens(refreshToken: string): Promise<SocialTokens>;
  
  /**
   * Retrieves social media metrics for the authenticated user
   * @param tokens Authentication tokens
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the metrics data
   */
  abstract getMetrics(tokens: SocialTokens, userId?: string): Promise<CachedSocialMetrics>;

  /**
   * Checks if a token is expired based on its expiry date
   * @param expiresAt Expiry date (ISO string or Date object)
   * @returns boolean indicating if the token is expired
   */
  isTokenExpired(expiresAt?: string | Date): boolean {
    if (!expiresAt) return true;
    
    try {
      const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
      const now = new Date();
      
      // Add a buffer of 5 minutes to account for clock differences
      const bufferMs = 5 * 60 * 1000;
      return now.getTime() + bufferMs > expiryDate.getTime();
    } catch (error) {
      logger.error(this.platform, `Error checking token expiration: ${error}`);
      return true; // Assume expired if we can't parse the date
    }
  }
  
  /**
   * Checks the status of a platform account tokens
   * @param account The social account to check
   * @returns Promise with token status: 'connected', 'expired', or 'error'
   */
  async checkTokenStatus(account: any): Promise<'connected' | 'expired' | 'error'> {
    try {
      // Check if token is expired
      const isExpired = this.isTokenExpired(account.expires_at);
      
      // If not expired, account is connected
      if (!isExpired) {
        return 'connected';
      }
      
      // If expired but has refresh token, try to refresh
      if (account.refresh_token) {
        try {
          // Attempt to refresh the token
          const refreshed = await this.refreshTokens(account.refresh_token);
          
          if (refreshed.success) {
            return 'connected';
          }
        } catch (refreshError) {
          logger.error(this.platform, `Error refreshing token: ${refreshError}`);
        }
      }
      
      // If we get here, token is expired and couldn't be refreshed
      return 'expired';
    } catch (error) {
      logger.error(this.platform, `Error checking token status: ${error}`);
      return 'error';
    }
  }

  // Common methods for all platforms
  /**
   * Retrieves a connected social account for the user
   * @param userId The user ID to look up
   * @returns Promise resolving to the account if found, or null
   */
  async getConnectedAccount(userId: string): Promise<SocialAccount | null> {
    try {
      const supabase = createServerComponentClient({ cookies });
      
      logger.info(this.platform, `Getting account for user ${userId.substring(0, 8)}...`);
      
      // First check in the social_accounts table (new schema)
      const { data: socialAccount, error: socialError } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', this.platform)
        .single();
        
      if (socialAccount) {
        logger.debug(this.platform, 'Found account in social_accounts table');
        return socialAccount as SocialAccount;
      }
      
      if (socialError && socialError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        logger.error(this.platform, `Error fetching from social_accounts: ${socialError.message}`);
        // Fall through to legacy check
      }
      
      // If not found in social_accounts, check legacy table (if it's Twitter)
      if (this.platform === 'twitter') {
        logger.debug(this.platform, 'Checking legacy twitter_accounts table');
        const { data: twitterAccount, error: twitterError } = await supabase
          .from('twitter_accounts')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (twitterError || !twitterAccount) {
          logger.debug(this.platform, `No account found in twitter_accounts: ${twitterError?.message || 'No data'}`);
          return null;
        }
        
        logger.info(this.platform, 'Found account in twitter_accounts, migrating to social_accounts');
        
        // Found in legacy table, migrate to new table
        const socialAccountData = {
          user_id: twitterAccount.user_id,
          platform: 'twitter',
          platform_user_id: twitterAccount.twitter_user_id || '',
          platform_username: twitterAccount.twitter_username || '',
          access_token: twitterAccount.access_token,
          refresh_token: twitterAccount.refresh_token,
          expires_at: twitterAccount.expires_at,
          scopes: twitterAccount.scopes,
          metadata: {
            name: twitterAccount.display_name,
            profile_image_url: twitterAccount.profile_image_url,
            followers_count: twitterAccount.followers_count
          },
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Save to new table
        try {
          const { data, error } = await supabase
            .from('social_accounts')
            .upsert(socialAccountData)
            .select()
            .single();
          
          if (error) {
            logger.error(this.platform, `Error migrating from twitter_accounts to social_accounts: ${error.message}`);
            // Return original Twitter account data as fallback
            return {
              id: twitterAccount.id,
              user_id: twitterAccount.user_id,
              platform: 'twitter',
              platform_user_id: twitterAccount.twitter_user_id || '',
              platform_username: twitterAccount.twitter_username || '',
              access_token: twitterAccount.access_token,
              refresh_token: twitterAccount.refresh_token,
              token_secret: undefined,
              expires_at: twitterAccount.expires_at,
              scopes: twitterAccount.scopes,
              metadata: {
                name: twitterAccount.display_name,
                profile_image_url: twitterAccount.profile_image_url,
                followers_count: twitterAccount.followers_count
              },
              created_at: new Date(),
              updated_at: new Date()
            };
          }
          
          logger.info(this.platform, 'Successfully migrated account to social_accounts');
          return data as SocialAccount;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(this.platform, `Error in migration: ${errorMessage}`);
          return null;
        }
      }
      
      logger.info(this.platform, 'No account found for user');
      return null;
    } catch (error: any) {
      logger.error(this.platform, `Error getting account: ${error.message || String(error)}`);
      return null;
    }
  }
  
  async saveTokens(
    userId: string, 
    platformUserId: string, 
    platformUsername: string,
    tokens: SocialTokens
  ): Promise<boolean> {
    try {
      const supabase = createServerComponentClient({ cookies });
      
      const { error } = await supabase
        .from('social_accounts')
        .upsert({
          user_id: userId,
          platform: this.platform,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_secret: tokens.token_secret,
          expires_at: tokens.expires_at,
          scopes: tokens.scopes,
          updated_at: new Date()
        })
        .select();
        
      if (error) {
        logger.error(this.platform, `Error saving ${this.platform} tokens: ${error.message || String(error)}`);
        return false;
      }
      
      return true;
    } catch (error: any) {
      logger.error(this.platform, `Error saving ${this.platform} tokens: ${error.message || String(error)}`);
      return false;
    }
  }
  
  async disconnectAccount(userId: string): Promise<boolean> {
    try {
      const supabase = createServerComponentClient({ cookies });
        
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('platform', this.platform);
        
      if (error) {
        logger.error(this.platform, `Error disconnecting ${this.platform} account: ${error.message || String(error)}`);
        return false;
      }
      
      logger.info(this.platform, `Successfully disconnected account for user ${userId.substring(0, 8)}...`);
      return true;
    } catch (error: any) {
      logger.error(this.platform, `Error disconnecting account: ${error.message || String(error)}`);
      return false;
    }
  }
  
  async ensureValidTokens(userId: string): Promise<SocialTokens | null> {
    logger.info(this.platform, `Ensuring valid tokens for user ${userId.substring(0, 8)}...`);
    
    try {
      const account = await this.getConnectedAccount(userId);
      
      if (!account) {
        logger.info(this.platform, `No connected account found for user ${userId.substring(0, 8)}`);
        return null;
      }
      
      logger.info(this.platform, `Found connected account: ${account.platform_username}`);
      
      // Ensure expires_at is a proper Date object
      if (account.expires_at && !(account.expires_at instanceof Date)) {
        try {
          // Try to convert the string to a Date object
          account.expires_at = new Date(account.expires_at);
          logger.info(this.platform, 'Converted expires_at string to Date');
        } catch (err: any) {
          logger.error(this.platform, `Could not convert expires_at to Date: ${err.message || String(err)}`);
          account.expires_at = undefined; // Set to undefined if conversion fails
        }
      }
      
      // Log detailed account info for debugging
      logger.info(this.platform, 'Account data:', {
        id: account.id,
        platform: account.platform,
        username: account.platform_username,
        hasAccessToken: !!account.access_token,
        hasRefreshToken: !!account.refresh_token,
        expiresAt: account.expires_at instanceof Date ? account.expires_at.toISOString() : account.expires_at
      });
      
      // Check if we have a valid access token
      if (!account.access_token) {
        logger.error(this.platform, 'Account missing access token');
        return null;
      }
      
      // Check if token is expired
      const isExpired = this.isTokenExpired(account.expires_at);
      logger.info(this.platform, `Token is expired: ${isExpired}`);
      
      if (isExpired) {
        // Token is expired, try to refresh it
        if (!account.refresh_token) {
          // No refresh token, can't refresh
          logger.error(this.platform, 'Token expired but no refresh token available');
          return null;
        }
        
        // Verify refresh token is valid
        if (typeof account.refresh_token !== 'string' || account.refresh_token.trim() === '') {
          logger.error(this.platform, 'Invalid refresh token format');
          return null;
        }
        
        try {
          logger.info(this.platform, 'Refreshing expired token');
          
          // Refresh the token
          const newTokens = await this.refreshTokens(account.refresh_token);
          
          logger.info(this.platform, 'Token refreshed successfully');
          
          // Update the tokens in the database
          const updated = await this.saveTokens(
            userId, 
            account.platform_user_id, 
            account.platform_username,
            newTokens
          );
          
          if (updated) {
            logger.info(this.platform, 'Updated tokens in database');
          } else {
            logger.warn(this.platform, 'Failed to update tokens in database');
          }
          
          return newTokens;
        } catch (error: any) {
          // Failed to refresh token
          logger.error(this.platform, `Failed to refresh token: ${error.message || String(error)}`);
          
          // If the token refresh fails, we should consider disconnecting the account
          // to prevent continuous failed refresh attempts
          logger.info(this.platform, 'Consider disconnecting this account due to refresh failures');
          
          return null;
        }
      }
      
      // For debugging - log partial token info
      if (account.access_token) {
        logger.info(this.platform, `Using existing valid token: ${account.access_token.substring(0, 10)}...`);
      }
      
      // Token is still valid
      return {
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        token_secret: account.token_secret,
        expires_at: account.expires_at,
        scopes: account.scopes,
      };
    } catch (error: any) {
      logger.error(this.platform, `Error ensuring valid tokens: ${error.message || String(error)}`);
      return null;
    }
  }

  /**
   * Stores metrics data in the social_metrics table
   * @param supabase Supabase client
   * @param accountId Social account ID
   * @param metrics Metrics data to store
   * @returns Promise resolving to success status
   */
  async storeMetricsInDatabase(
    supabase: any,
    accountId: string,
    metrics: SocialMetrics
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Prepare metrics record
      const metricsRecord: SocialMetricsRecord = {
        social_account_id: accountId,
        metric_date: today,
        followers: metrics.accountInfo.followers || 0,
        following: metrics.accountInfo.following || 0,
        posts: metrics.posts.length,
        // Aggregate metrics across all posts
        views: metrics.posts.reduce((sum, post) => sum + (post.metrics.views || post.metrics.impressions || 0), 0),
        likes: metrics.posts.reduce((sum, post) => sum + (post.metrics.likes || 0), 0),
        comments: metrics.posts.reduce((sum, post) => sum + (post.metrics.comments || 0), 0),
        shares: metrics.posts.reduce((sum, post) => sum + (post.metrics.shares || post.metrics.retweets || 0), 0)
      };
      
      // Calculate engagement rate if possible
      const totalEngagements = metricsRecord.likes + metricsRecord.comments + metricsRecord.shares;
      if (metricsRecord.views > 0) {
        metricsRecord.engagement_rate = parseFloat(((totalEngagements / metricsRecord.views) * 100).toFixed(2));
      }
      
      // Upsert to handle both insert and update cases
      const { error } = await supabase
        .from('social_metrics')
        .upsert(metricsRecord)
        .select();
      
      if (error) {
        logger.error(this.platform, `Error storing metrics in database: ${error.message}`);
        return false;
      }
      
      logger.info(this.platform, `Successfully stored metrics in database for account ${accountId}`);
      return true;
    } catch (error) {
      logger.error(this.platform, `Error in storeMetricsInDatabase: ${error}`);
      return false;
    }
  }

  /**
   * Gets metrics from the database if available and not stale
   * @param supabase Supabase client
   * @param accountId Social account ID
   * @param maxAgeDays Maximum age of metrics in days (defaults to 1)
   * @returns Promise resolving to metrics or null if not found/stale
   */
  async getMetricsFromDatabase(
    supabase: any,
    accountId: string,
    maxAgeDays: number = 1
  ): Promise<any | null> {
    try {
      // Calculate the oldest acceptable date
      const oldestDate = new Date();
      oldestDate.setDate(oldestDate.getDate() - maxAgeDays);
      const oldestDateStr = oldestDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get the most recent metrics record
      const { data, error } = await supabase
        .from('social_metrics')
        .select('*')
        .eq('social_account_id', accountId)
        .gte('metric_date', oldestDateStr)
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error || !data) {
        logger.info(this.platform, `No recent metrics found in database for account ${accountId}`);
        return null;
      }
      
      logger.info(this.platform, `Found metrics in database for account ${accountId} from ${data.metric_date}`);
      return data;
    } catch (error) {
      logger.error(this.platform, `Error in getMetricsFromDatabase: ${error}`);
      return null;
    }
  }

  /**
   * Creates a Supabase client
   * @returns Supabase client
   */
  protected getSupabaseClient(): any {
    // Use the server-side client when running on the server
    if (typeof window === 'undefined') {
      try {
        const { createClient } = require('@supabase/supabase-js');
        return createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );
      } catch (error) {
        logger.error(this.platform, `Error creating server-side Supabase client: ${error}`);
        return null;
      }
    }
    
    // Use the browser client when running in the browser
    const { createClient } = require('@supabase/supabase-js');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }
} 