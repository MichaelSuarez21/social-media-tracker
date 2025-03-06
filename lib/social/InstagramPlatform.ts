import { BasePlatform, SocialTokens, SocialMetrics, CachedSocialMetrics } from './BasePlatform';
import logger from '@/lib/logger';

/**
 * Interface for Instagram's caching system
 */
interface InstagramCache {
  [userId: string]: {
    userData?: {
      data: any;
      timestamp: number;
    };
    media?: {
      data: any;
      timestamp: number;
    };
    metrics?: {
      data: SocialMetrics;
      timestamp: number;
    };
    insights?: {
      data: any;
      timestamp: number;
    };
  };
}

/**
 * Instagram platform implementation
 * Handles Instagram OAuth authentication and API interactions
 */
export class InstagramPlatform extends BasePlatform {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  // Cache with TTL constants
  private cache: InstagramCache = {};
  private readonly USER_DATA_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly MEDIA_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly METRICS_TTL = 5 * 60 * 1000; // 5 minutes in ms
  
  constructor() {
    super('instagram');
    this.clientId = process.env.INSTAGRAM_CLIENT_ID || '';
    this.clientSecret = process.env.INSTAGRAM_CLIENT_SECRET || '';
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || '';
    
    // Log initialization details
    logger.info('instagram', `Initialized with client ID length: ${this.clientId ? this.clientId.length : 0}`);
    logger.info('instagram', `Client secret length: ${this.clientSecret ? this.clientSecret.length : 0}`);
    logger.info('instagram', `Redirect URI: ${this.redirectUri}`);
  }
  
  /**
   * Returns the base authentication URL for Instagram
   */
  getAuthUrl(): string {
    return 'https://api.instagram.com/oauth/authorize';
  }
  
  /**
   * Prepares an Instagram OAuth authorization request
   * @returns Object containing the authorization URL and state
   */
  async prepareAuthRequest(): Promise<{url: string, state: string}> {
    try {
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Log values for debugging
      logger.debug('instagram', 'Preparing auth request');
      logger.debug('instagram', `State: ${state}`);
      
      // Construct the Instagram authorization URL
      const authUrl = new URL(this.getAuthUrl());
      
      // Required parameters
      authUrl.searchParams.append('client_id', this.clientId);
      authUrl.searchParams.append('redirect_uri', this.redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      
      // Scope for permissions - Instagram requires at least user_profile
      authUrl.searchParams.append('scope', 'user_profile,user_media');
      
      // CSRF protection
      authUrl.searchParams.append('state', state);
      
      logger.info('instagram', `Auth URL created: ${authUrl.toString()}`);
      
      return {
        url: authUrl.toString(),
        state
      };
    } catch (error: any) {
      logger.error('instagram', `Error preparing auth request: ${error.message || String(error)}`);
      throw error;
    }
  }
  
  /**
   * Exchanges an authorization code for access/refresh tokens
   * @param code The authorization code from the OAuth flow
   * @returns Promise resolving to the tokens
   */
  async exchangeCodeForTokens(code: string): Promise<SocialTokens> {
    logger.info('instagram', 'Exchanging code for tokens');
    logger.debug('instagram', `Code: ${code.substring(0, 10)}... (${code.length} chars)`);
    
    // Verify required parameters
    if (!code) throw new Error('Authorization code is missing');
    if (!this.clientId) throw new Error('Instagram client ID is not configured');
    if (!this.clientSecret) throw new Error('Instagram client secret is not configured');
    if (!this.redirectUri) throw new Error('Instagram redirect URI is not configured');
    
    try {
      // Make the token exchange request
      logger.info('instagram', 'Sending token request to Instagram API');
      
      const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code: code
        }).toString(),
      });
      
      // Get the raw response for debugging
      const responseText = await response.text();
      logger.info('instagram', `Token response status: ${response.status}`);
      
      // Check for HTTP errors
      if (!response.ok) {
        logger.error('instagram', `Token exchange failed with status ${response.status}`);
        logger.error('instagram', `Response body: ${responseText}`);
        throw new Error(`Instagram token exchange failed: ${response.status} - ${responseText}`);
      }
      
      // Parse the JSON response
      let tokenData;
      try {
        tokenData = JSON.parse(responseText);
      } catch (parseError) {
        logger.error('instagram', `Failed to parse token response: ${responseText}`);
        throw new Error(`Failed to parse Instagram token response: ${parseError}`);
      }
      
      if (!tokenData.access_token) {
        logger.error('instagram', `No access token in response: ${JSON.stringify(tokenData)}`);
        throw new Error('Instagram token response did not include an access token');
      }
      
      // Get the long-lived token
      const longLivedToken = await this.getLongLivedToken(tokenData.access_token);
      
      // Return the parsed token data
      return {
        access_token: longLivedToken.access_token,
        // Instagram does not provide refresh tokens through Basic Display API
        expires_at: new Date(Date.now() + (longLivedToken.expires_in * 1000)),
        scopes: 'user_profile,user_media',
        success: true
      };
    } catch (error: any) {
      logger.error('instagram', `Error exchanging code for tokens: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Exchange a short-lived token for a long-lived token
   * @param shortLivedToken The short-lived access token
   * @returns Promise resolving to the long-lived token data
   */
  private async getLongLivedToken(shortLivedToken: string): Promise<{access_token: string, expires_in: number}> {
    logger.info('instagram', 'Exchanging short-lived token for long-lived token');
    
    try {
      const response = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.clientSecret}&access_token=${shortLivedToken}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (!response.ok || !data.access_token) {
        logger.error('instagram', `Failed to exchange for long-lived token: ${JSON.stringify(data)}`);
        throw new Error('Failed to exchange for long-lived Instagram token');
      }
      
      logger.info('instagram', `Successfully obtained long-lived token, expires in ${data.expires_in} seconds`);
      
      return {
        access_token: data.access_token,
        expires_in: data.expires_in
      };
    } catch (error: any) {
      logger.error('instagram', `Error getting long-lived token: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Refreshes an expired access token
   * @param accessToken The existing access token to refresh
   * @returns Promise resolving to the new tokens
   */
  async refreshTokens(accessToken: string): Promise<SocialTokens> {
    logger.info('instagram', 'Refreshing Instagram access token');
    
    try {
      const response = await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (!response.ok || !data.access_token) {
        logger.error('instagram', `Failed to refresh token: ${JSON.stringify(data)}`);
        throw new Error('Failed to refresh Instagram token');
      }
      
      logger.info('instagram', `Successfully refreshed token, expires in ${data.expires_in} seconds`);
      
      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + (data.expires_in * 1000)),
        scopes: 'user_profile,user_media',
        success: true
      };
    } catch (error: any) {
      logger.error('instagram', `Error refreshing token: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetches user profile data from the Instagram API
   * @param accessToken The access token for API calls
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the user data
   */
  private async getUserData(accessToken: string, userId?: string): Promise<any> {
    logger.info('instagram', `Fetching Instagram user data${userId ? ' for user ' + userId.substring(0, 8) : ''}`);
    
    // Check cache first if userId is provided
    if (userId && this.cache[userId]?.userData) {
      const cachedData = this.cache[userId].userData;
      const age = Date.now() - cachedData.timestamp;
      
      if (age < this.USER_DATA_TTL) {
        logger.info('instagram', `Returning cached user data (age: ${Math.round(age / 1000)}s)`);
        return cachedData.data;
      } else {
        logger.info('instagram', `Cached user data expired (age: ${Math.round(age / 1000)}s)`);
      }
    }
    
    try {
      // Fetch user profile from Instagram
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('instagram', `Error fetching user data: ${response.status} - ${errorText}`);
        throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
      }
      
      const userData = await response.json();
      logger.info('instagram', `Retrieved user data for ${userData.username}`);
      
      // Cache the result if userId is provided
      if (userId) {
        if (!this.cache[userId]) {
          this.cache[userId] = {};
        }
        
        this.cache[userId].userData = {
          data: userData,
          timestamp: Date.now()
        };
        
        logger.debug('instagram', 'User data cached');
      }
      
      return userData;
    } catch (error: any) {
      logger.error('instagram', `Error fetching user data: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetches media items from the Instagram API
   * @param accessToken The access token for API calls
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the media items
   */
  private async getMedia(accessToken: string, userId?: string): Promise<any[]> {
    logger.info('instagram', `Fetching Instagram media${userId ? ' for user ' + userId.substring(0, 8) : ''}`);
    
    // Check cache first if userId is provided
    if (userId && this.cache[userId]?.media) {
      const cachedData = this.cache[userId].media;
      const age = Date.now() - cachedData.timestamp;
      
      if (age < this.MEDIA_TTL) {
        logger.info('instagram', `Returning cached media (age: ${Math.round(age / 1000)}s)`);
        return cachedData.data;
      } else {
        logger.info('instagram', `Cached media expired (age: ${Math.round(age / 1000)}s)`);
      }
    }
    
    try {
      // First get the user's media IDs
      const mediaResponse = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username&access_token=${accessToken}`,
        { method: 'GET' }
      );
      
      if (!mediaResponse.ok) {
        const errorText = await mediaResponse.text();
        logger.error('instagram', `Error fetching media: ${mediaResponse.status} - ${errorText}`);
        throw new Error(`Instagram API error: ${mediaResponse.status} - ${errorText}`);
      }
      
      const mediaData = await mediaResponse.json();
      const mediaItems = mediaData.data || [];
      
      logger.info('instagram', `Retrieved ${mediaItems.length} media items`);
      
      // Cache the result if userId is provided
      if (userId) {
        if (!this.cache[userId]) {
          this.cache[userId] = {};
        }
        
        this.cache[userId].media = {
          data: mediaItems,
          timestamp: Date.now()
        };
        
        logger.debug('instagram', 'Media data cached');
      }
      
      return mediaItems;
    } catch (error: any) {
      logger.error('instagram', `Error fetching media: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Retrieves Instagram metrics for the authenticated user
   * @param tokens Authentication tokens
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the metrics data
   */
  async getMetrics(tokens: SocialTokens, userId?: string): Promise<CachedSocialMetrics> {
    logger.info('instagram', `Getting Instagram metrics${userId ? ' for user ' + userId.substring(0, 8) : ''}`);
    
    // Check cache first if userId is provided
    if (userId && this.cache[userId]?.metrics) {
      const cachedMetrics = this.cache[userId].metrics;
      const age = Date.now() - cachedMetrics.timestamp;
      
      if (age < this.METRICS_TTL) {
        logger.info('instagram', `Returning cached metrics (age: ${Math.round(age / 1000)}s)`);
        return {
          ...cachedMetrics.data,
          _cache: {
            fromCache: true,
            timestamp: cachedMetrics.timestamp,
            expired: false
          }
        };
      } else {
        logger.info('instagram', `Cached metrics expired (age: ${Math.round(age / 1000)}s)`);
      }
    }
    
    try {
      // First get the user profile
      const userData = await this.getUserData(tokens.access_token, userId);
      
      // Then get media items
      const mediaItems = await this.getMedia(tokens.access_token, userId);
      
      // Transform the data into SocialMetrics format
      const metrics: SocialMetrics = {
        accountInfo: {
          username: userData.username,
          displayName: userData.username, // Instagram Basic Display API doesn't provide display name
          followers: 0, // Basic Display API doesn't provide follower count
          profileImageUrl: undefined // Basic Display API doesn't provide profile image
        },
        posts: mediaItems.map((item: any) => ({
          id: item.id,
          text: item.caption || '',
          imageUrl: item.media_url || item.thumbnail_url,
          createdAt: new Date(item.timestamp),
          metrics: {
            // Basic metrics - Instagram Basic Display API doesn't provide engagement metrics
            likes: 0,
            comments: 0,
            shares: 0,
            impressions: 0
          }
        })),
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        }
      };
      
      // Cache the result if userId is provided
      if (userId) {
        if (!this.cache[userId]) {
          this.cache[userId] = {};
        }
        
        this.cache[userId].metrics = {
          data: metrics,
          timestamp: Date.now()
        };
      }
      
      return {
        ...metrics,
        _cache: {
          fromCache: false,
          timestamp: Date.now(),
          expired: false
        }
      };
    } catch (error: any) {
      logger.error('instagram', `Error getting metrics: ${error.message}`);
      
      // Return error state in cache info
      return {
        accountInfo: {
          username: '',
          displayName: '',
          followers: 0
        },
        posts: [],
        period: {
          start: new Date(),
          end: new Date()
        },
        _cache: {
          fromCache: false,
          expired: false,
          error: true
        }
      };
    }
  }
} 