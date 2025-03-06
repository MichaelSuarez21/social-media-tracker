import { BasePlatform, SocialTokens, CachedSocialMetrics } from './BasePlatform';
import logger from '@/lib/logger';

/**
 * Interface for YouTube API response cache
 */
interface YouTubeCache {
  channelData?: {
    data: any;
    timestamp: number;
  };
  videoData?: {
    data: any;
    timestamp: number;
  };
  metrics?: {
    data: CachedSocialMetrics;
    timestamp: number;
  };
}

/**
 * YouTube platform implementation
 * Handles YouTube OAuth authentication and API interactions
 */
export class YoutubePlatform extends BasePlatform {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  // Cache with TTL constants
  private cache: YouTubeCache = {};
  private readonly CHANNEL_DATA_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly VIDEO_DATA_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly METRICS_TTL = 15 * 60 * 1000; // 15 minutes in ms (increased from 5 minutes)
  
  constructor() {
    super('youtube');
    this.clientId = process.env.YOUTUBE_CLIENT_ID || '';
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || '';
    this.redirectUri = process.env.YOUTUBE_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/social/youtube/callback`;
    
    // Log initialization details
    logger.info('youtube', `Initialized with client ID length: ${this.clientId ? this.clientId.length : 0}`);
    logger.info('youtube', `Client secret length: ${this.clientSecret ? this.clientSecret.length : 0}`);
    logger.info('youtube', `Redirect URI: ${this.redirectUri}`);
  }
  
  /**
   * Returns the base authentication URL for YouTube
   */
  getAuthUrl(): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth';
  }
  
  /**
   * Creates a full authorization URL with all required parameters
   * @param state State parameter for CSRF protection
   * @param codeChallenge PKCE code challenge
   * @returns Complete authorization URL
   */
  createAuthUrl(state: string, codeChallenge?: string): string {
    const url = new URL(this.getAuthUrl());
    
    // Add required OAuth 2.0 parameters
    url.searchParams.append('client_id', this.clientId);
    url.searchParams.append('redirect_uri', this.redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', state);
    
    // Scope for YouTube Data API access
    // Using read-only scopes to get channel info and analytics
    url.searchParams.append('scope', 'https://www.googleapis.com/auth/youtube.readonly');
    
    // Add PKCE parameters if provided
    if (codeChallenge) {
      url.searchParams.append('code_challenge', codeChallenge);
      url.searchParams.append('code_challenge_method', 'S256');
    }
    
    // Additional parameters
    url.searchParams.append('access_type', 'offline'); // Get refresh token
    url.searchParams.append('prompt', 'consent'); // Always show consent screen
    
    return url.toString();
  }
  
  /**
   * Exchanges authorization code for access and refresh tokens
   * @param code Authorization code from callback
   * @param codeVerifier PKCE code verifier if using PKCE
   * @returns Promise resolving to tokens
   */
  async exchangeCodeForTokens(code: string, codeVerifier?: string): Promise<SocialTokens> {
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', this.redirectUri);
      
      // Add code verifier if using PKCE
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }
      
      // Make token request
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('youtube', `Token exchange failed: ${JSON.stringify(errorData)}`);
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Calculate expires_at Date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
      
      // Return formatted tokens
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        scopes: data.scope
      };
    } catch (error) {
      logger.error('youtube', `Error exchanging code for tokens: ${error}`);
      throw error;
    }
  }
  
  /**
   * Refreshes expired access token
   * @param refreshToken The refresh token
   * @returns Promise resolving to new tokens
   */
  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      
      const params = new URLSearchParams();
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('refresh_token', refreshToken);
      params.append('grant_type', 'refresh_token');
      
      // Make token refresh request
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('youtube', `Token refresh failed: ${JSON.stringify(errorData)}`);
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Calculate expires_at Date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
      
      // Return new tokens (note: refresh token may not be included)
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken, // Use existing if not provided
        expires_at: expiresAt,
        scopes: data.scope
      };
    } catch (error) {
      logger.error('youtube', `Error refreshing tokens: ${error}`);
      throw error;
    }
  }
  
  /**
   * Gets channel information for the authenticated user
   * @param accessToken Valid access token
   * @returns Channel data
   */
  private async getChannelData(accessToken: string): Promise<any> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cache.channelData &&
         (now - this.cache.channelData.timestamp) < this.CHANNEL_DATA_TTL) {
        return this.cache.channelData.data;
      }
      
      // Fetch channel data - for "mine" parameter to get authenticated user's channel
      const url = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Channel data request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update cache
      this.cache.channelData = {
        data,
        timestamp: now
      };
      
      return data;
    } catch (error) {
      logger.error('youtube', `Error getting channel data: ${error}`);
      throw error;
    }
  }
  
  /**
   * Gets recent videos for a channel
   * @param accessToken Valid access token
   * @param channelId YouTube channel ID
   * @returns Video data
   */
  private async getRecentVideos(accessToken: string, channelId: string): Promise<any> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cache.videoData &&
         (now - this.cache.videoData.timestamp) < this.VIDEO_DATA_TTL) {
        return this.cache.videoData.data;
      }
      
      // Get channel's uploads playlist ID
      const channelData = await this.getChannelData(accessToken);
      const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error('Could not find uploads playlist ID');
      }
      
      // Get playlist items (videos)
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Video data request failed: ${response.status} ${response.statusText}`);
      }
      
      const playlistData = await response.json();
      
      // Get video IDs
      const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');
      
      // Get video statistics
      const videoStatsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`;
      
      const statsResponse = await fetch(videoStatsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!statsResponse.ok) {
        throw new Error(`Video stats request failed: ${statsResponse.status} ${statsResponse.statusText}`);
      }
      
      const videoStats = await statsResponse.json();
      
      // Combine playlist items with statistics
      const videoData = {
        playlistItems: playlistData,
        videoStats: videoStats
      };
      
      // Update cache
      this.cache.videoData = {
        data: videoData,
        timestamp: now
      };
      
      return videoData;
    } catch (error) {
      logger.error('youtube', `Error getting video data: ${error}`);
      throw error;
    }
  }
  
  /**
   * Retrieves metrics for the YouTube channel
   * @param tokens Authentication tokens
   * @param userId Optional user ID for caching
   * @returns Promise resolving to metrics data
   */
  async getMetrics(tokens: SocialTokens, userId?: string): Promise<CachedSocialMetrics> {
    try {
      // Use the database for metrics if possible
      if (userId) {
        // Get the connected account
        const account = await this.getConnectedAccount(userId);
        
        if (account) {
          // Check for metrics in database first
          const supabase = this.getSupabaseClient();
          const dbMetrics = await this.getMetricsFromDatabase(supabase, account.id);
          
          if (dbMetrics) {
            logger.info('youtube', `Using metrics from database for user ${userId.substring(0, 8)}...`);
            
            // Format metrics in the expected structure
            // Note: DB metrics are daily aggregates, so we need to populate some placeholders for the frontend
            const metrics: CachedSocialMetrics = {
              accountInfo: {
                username: account.platform_username,
                displayName: account.metadata?.name || account.platform_username,
                followers: dbMetrics.followers || 0,
                following: dbMetrics.following || 0,
                profileImageUrl: account.metadata?.profile_image_url
              },
              posts: [], // We'll need to add placeholder or empty posts
              period: {
                start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
                end: new Date()
              },
              _cache: {
                fromCache: true,
                timestamp: new Date(dbMetrics.created_at).getTime(),
                source: 'database'
              }
            };
            
            return metrics;
          }
        }
      }
      
      // Check in-memory cache if no database metrics or if we want more detailed data
      const now = Date.now();
      if (userId && this.cache.metrics && 
         (now - this.cache.metrics.timestamp) < this.METRICS_TTL) {
        logger.info('youtube', `Returning in-memory cached metrics for user ${userId.substring(0, 8)}... (age: ${Math.round((now - this.cache.metrics.timestamp)/1000)}s)`);
        const cachedMetrics = this.cache.metrics.data;
        return {
          ...cachedMetrics,
          _cache: { 
            fromCache: true, 
            timestamp: this.cache.metrics.timestamp,
            age: now - this.cache.metrics.timestamp,
            source: 'memory'
          }
        };
      }
      
      logger.info('youtube', `Fetching fresh metrics from YouTube API for user ${userId ? userId.substring(0, 8) + '...' : 'unknown'}`);
      
      // Get channel data
      const channelData = await this.getChannelData(tokens.access_token);
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error('No channel found for this user');
      }
      
      const channel = channelData.items[0];
      const channelId = channel.id;
      
      // Get video data
      const videoData = await this.getRecentVideos(tokens.access_token, channelId);
      
      // Format account info
      const accountInfo = {
        username: channel.snippet.customUrl || channel.id,
        displayName: channel.snippet.title,
        followers: parseInt(channel.statistics.subscriberCount, 10),
        following: 0, // YouTube doesn't have a following concept
        profileImageUrl: channel.snippet.thumbnails?.default?.url
      };
      
      // Format posts (videos)
      const posts = videoData.videoStats.items.map((video: any) => {
        // Find matching playlist item for additional data
        const playlistItem = videoData.playlistItems.items.find(
          (item: any) => item.contentDetails.videoId === video.id
        );
        
        return {
          id: video.id,
          text: video.snippet.title,
          imageUrl: video.snippet.thumbnails?.medium?.url,
          createdAt: new Date(video.snippet.publishedAt),
          metrics: {
            views: parseInt(video.statistics.viewCount, 10),
            likes: parseInt(video.statistics.likeCount, 10),
            comments: parseInt(video.statistics.commentCount, 10),
            position: playlistItem?.snippet?.position
          }
        };
      });
      
      // Create metrics object
      const metrics: CachedSocialMetrics = {
        accountInfo,
        posts,
        period: {
          start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
          end: new Date()
        }
      };
      
      // Update memory cache
      if (userId) {
        this.cache.metrics = {
          data: metrics,
          timestamp: now
        };
        
        // Also store in database if we have userId and account
        try {
          const account = await this.getConnectedAccount(userId);
          if (account) {
            const supabase = this.getSupabaseClient();
            await this.storeMetricsInDatabase(supabase, account.id, metrics);
            
            // Update account metadata with latest info
            await supabase
              .from('social_accounts')
              .update({
                metadata: {
                  name: channel.snippet.title,
                  profile_image_url: channel.snippet.thumbnails?.default?.url,
                  subscribers_count: parseInt(channel.statistics.subscriberCount, 10),
                  updated_at: new Date().toISOString()
                }
              })
              .eq('id', account.id);
          }
        } catch (dbError) {
          logger.error('youtube', `Error storing metrics in database: ${dbError}`);
          // Continue anyway - we'll still return the API metrics
        }
      }
      
      return metrics;
    } catch (error) {
      logger.error('youtube', `Error getting metrics: ${error}`);
      throw error;
    }
  }
}

/**
 * Singleton instance of the YouTube platform
 * Use this for all YouTube API interactions
 */
export const youtubePlatform = new YoutubePlatform(); 