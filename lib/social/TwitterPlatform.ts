import { BasePlatform, SocialTokens, SocialMetrics, CachedSocialMetrics } from './BasePlatform';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/twitter-utils';
import { cookies } from 'next/headers';
import logger from '@/lib/logger';

/**
 * Interface for Twitter's caching system
 */
interface TwitterCache {
  [userId: string]: {
    userData?: {
      data: any;
      timestamp: number;
    };
    tweets?: {
      data: any;
      timestamp: number;
    };
    metrics?: {
      data: SocialMetrics;
      timestamp: number;
    };
    historicalMetrics?: {
      data: any;
      timestamp: number;
    };
  };
}

// Add this interface to define the structure of tweet metrics
interface TweetMetrics {
  impressions: number;
  retweets: number;
  replies: number;
  likes: number;
  quotes: number;
  engagements?: number;
  profileVisits?: number;
  linkClicks?: number;
  mediaViews?: number;
  mediaEngagements?: number;
  detailExpands?: number;
  userProfileClicks?: number;
}

/**
 * Twitter platform implementation
 * Handles Twitter OAuth 2.0 authentication and API interactions
 */
export class TwitterPlatform extends BasePlatform {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  // Cache with TTL constants
  private cache: TwitterCache = {};
  private readonly USER_DATA_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly TWEETS_TTL = 15 * 60 * 1000; // 15 minutes in ms
  private readonly METRICS_TTL = 5 * 60 * 1000; // 5 minutes in ms
  
  constructor() {
    super('twitter');
    this.clientId = process.env.TWITTER_CLIENT_ID || '';
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    this.redirectUri = process.env.TWITTER_REDIRECT_URI || '';
    
    // Log initialization details
    logger.info('twitter', `Initialized with client ID length: ${this.clientId ? this.clientId.length : 0}`);
    logger.info('twitter', `Client secret length: ${this.clientSecret ? this.clientSecret.length : 0}`);
    logger.info('twitter', `Redirect URI: ${this.redirectUri}`);
  }
  
  /**
   * Returns the base authentication URL for Twitter
   */
  getAuthUrl(): string {
    // We'll handle the async parts (cookies, code challenge) in a separate method
    // that will be called from the API route
    return '#'; // This is a placeholder - actual URL creation happens in prepareAuthRequest
  }
  
  /**
   * Prepares a Twitter OAuth 2.0 authorization request with PKCE
   * @returns Object containing the authorization URL, code verifier, and state
   */
  async prepareAuthRequest(): Promise<{url: string, codeVerifier: string, state: string}> {
    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(2, 15);
      
      // Log values for debugging
      logger.debug('twitter', 'Preparing auth request');
      logger.debug('twitter', `Code verifier: ${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)`);
      logger.debug('twitter', `Code challenge: ${codeChallenge}`);
      logger.debug('twitter', `State: ${state}`);
      
      // Construct the Twitter authorization URL
      const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
      
      // Required parameters
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', this.clientId);
      authUrl.searchParams.append('redirect_uri', this.redirectUri);
      
      // Using minimal scopes to avoid permission issues
      authUrl.searchParams.append('scope', 'tweet.read users.read');
      
      // CSRF protection
      authUrl.searchParams.append('state', state);
      
      // PKCE parameters
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      
      logger.info('twitter', `Auth URL created: ${authUrl.toString()}`);
      
      return {
        url: authUrl.toString(),
        codeVerifier,
        state
      };
    } catch (error: any) {
      logger.error('twitter', `Error preparing auth request: ${error.message || String(error)}`);
      throw error;
    }
  }
  
  /**
   * Exchanges an authorization code for access/refresh tokens
   * @param code The authorization code from the OAuth flow
   * @param codeVerifier PKCE code verifier used in the authorization request
   * @returns Promise resolving to the tokens
   */
  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<SocialTokens> {
    logger.info('twitter', 'Exchanging code for tokens with PKCE');
    logger.debug('twitter', `Code: ${code.substring(0, 10)}... (${code.length} chars)`);
    logger.debug('twitter', `Code verifier: ${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)`);
    
    // Verify required parameters
    if (!code) throw new Error('Authorization code is missing');
    if (!codeVerifier) throw new Error('Code verifier is missing');
    if (!this.clientId) throw new Error('Twitter client ID is not configured');
    if (!this.clientSecret) throw new Error('Twitter client secret is not configured');
    if (!this.redirectUri) throw new Error('Twitter redirect URI is not configured');
    
    // Prepare token request parameters
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('client_id', this.clientId);
    params.append('redirect_uri', this.redirectUri);
    params.append('code_verifier', codeVerifier);
    
    // Create Basic Authentication header using client_id and client_secret
    const authHeader = `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`;
    logger.debug('twitter', `Authorization header created (first 20 chars): ${authHeader.substring(0, 20)}...`);
    
    try {
      // Make the token exchange request
      logger.info('twitter', 'Sending token request to Twitter API');
      
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': authHeader
        },
        body: params.toString(),
      });
      
      // Get the raw response for debugging
      const responseText = await response.text();
      logger.info('twitter', `Token response status: ${response.status}`);
      
      // Check for HTTP errors
      if (!response.ok) {
        logger.error('twitter', `Token exchange failed with status ${response.status}`);
        logger.error('twitter', `Response body: ${responseText}`);
        throw new Error(`Twitter token exchange failed: ${response.status} - ${responseText}`);
      }
      
      // Parse the JSON response
      try {
        const data = JSON.parse(responseText);
        
        // Log token details (partially redacted for security)
        logger.info('twitter', 'Token exchange successful');
        logger.debug('twitter', `Access token: ${data.access_token ? `${data.access_token.substring(0, 10)}... (${data.access_token.length} chars)` : 'Missing'}`);
        logger.debug('twitter', `Refresh token: ${data.refresh_token ? `${data.refresh_token.substring(0, 10)}... (${data.refresh_token.length} chars)` : 'Missing'}`);
        logger.debug('twitter', `Expires in: ${data.expires_in} seconds`);
        logger.debug('twitter', `Scope: ${data.scope}`);
        
        // Return the token data in our standardized format
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000),
          scopes: data.scope,
        };
      } catch (parseError: any) {
        logger.error('twitter', `Error parsing token response: ${parseError.message || String(parseError)}`);
        throw new Error(`Failed to parse Twitter token response: ${responseText}`);
      }
    } catch (error: any) {
      logger.error('twitter', `Error during token exchange: ${error.message || String(error)}`);
      throw error;
    }
  }
  
  /**
   * Refreshes expired access tokens using a refresh token
   * @param refreshToken The refresh token
   * @returns Promise resolving to the new tokens
   */
  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    logger.info('twitter', 'Refreshing tokens');
    logger.debug('twitter', `Using refresh token: ${refreshToken.substring(0, 10)}...`);
    
    if (!this.clientId || !this.clientSecret) {
      logger.error('twitter', 'Missing API credentials in environment variables');
      throw new Error('Twitter API credentials not configured correctly');
    }
    
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      
      logger.info('twitter', 'Sending refresh token request to Twitter API');
      
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        },
        body: params.toString(),
      });
      
      // Get the response body for both success and error cases
      const responseText = await response.text();
      logger.info('twitter', `Token refresh response status: ${response.status}`);
      
      if (!response.ok) {
        logger.error('twitter', `Token refresh failed: ${response.status}`);
        logger.error('twitter', `Error response: ${responseText}`);
        throw new Error(`Twitter token refresh failed: ${response.status} ${responseText}`);
      }
      
      try {
        // Parse the response JSON
        const data = JSON.parse(responseText);
        
        // Check if required fields are present
        if (!data.access_token) {
          logger.error('twitter', 'Refresh token response missing access_token');
          throw new Error('Twitter refresh token response missing access_token');
        }
        
        logger.info('twitter', 'Token refresh successful');
        logger.debug('twitter', `New access token: ${data.access_token.substring(0, 10)}...`);
        logger.debug('twitter', `Expires in: ${data.expires_in} seconds`);
        
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
          expires_at: new Date(Date.now() + data.expires_in * 1000),
          scopes: data.scope,
        };
      } catch (parseError: any) {
        logger.error('twitter', `Failed to parse token refresh response: ${parseError.message || String(parseError)}`);
        throw new Error(`Failed to parse Twitter token refresh data: ${parseError.message || 'Unknown parsing error'}`);
      }
    } catch (error: any) {
      logger.error('twitter', `Error refreshing tokens: ${error.message || String(error)}`);
      throw error;
    }
  }
  
  /**
   * Fetches user data from the Twitter API with caching
   * @param accessToken The access token for authentication
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the user data
   */
  async getTwitterUserData(accessToken: string, userId?: string): Promise<any> {
    logger.info('twitter', 'Getting user data from Twitter API');
    
    // Check cache if userId is provided
    if (userId && this.cache[userId]?.userData) {
      const cachedData = this.cache[userId].userData;
      const cacheAge = Date.now() - cachedData.timestamp;
      
      if (cacheAge < this.USER_DATA_TTL) {
        logger.info('twitter', `Using cached user data (${Math.round(cacheAge / 1000)}s old)`);
        return cachedData.data;
      } else {
        logger.debug('twitter', `Cached user data expired (${Math.round(cacheAge / 1000)}s old)`);
      }
    }
    
    try {
      logger.info('twitter', 'Fetching fresh user data from Twitter API');
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      // Get the response body for both success and error cases
      const responseText = await response.text();
      logger.info('twitter', `User data response status: ${response.status}`);
      
      if (!response.ok) {
        logger.error('twitter', `User data fetch failed: ${response.status}`);
        logger.error('twitter', `Error response: ${responseText}`);
        
        // Check for rate limiting
        if (response.status === 429 && userId && this.cache[userId]?.userData) {
          logger.warn('twitter', 'Rate limited, using cached user data');
          return this.cache[userId].userData!.data;
        }
        
        throw new Error(`Twitter user data fetch failed: ${response.status} ${responseText}`);
      }
      
      try {
        // Parse the response JSON
        const parsedData = JSON.parse(responseText);
        
        // Validate the response format
        if (!parsedData.data) {
          logger.warn('twitter', 'User data response missing data property');
        } else {
          logger.info('twitter', `Successfully fetched data for user: ${parsedData.data.username}`);
          logger.debug('twitter', `User metrics: ${JSON.stringify(parsedData.data.public_metrics || 'No metrics available')}`);
          
          // Cache the result if we have a userId
          if (userId) {
            if (!this.cache[userId]) this.cache[userId] = {};
            this.cache[userId].userData = {
              data: parsedData,
              timestamp: Date.now()
            };
            logger.debug('twitter', 'User data cached');
          }
        }
        
        return parsedData;
      } catch (parseError: any) {
        logger.error('twitter', `Failed to parse user data response: ${parseError.message || String(parseError)}`);
        
        // If parsing fails but we have cached data, use it
        if (userId && this.cache[userId]?.userData) {
          logger.warn('twitter', 'Parse error, using cached user data');
          return this.cache[userId].userData!.data;
        }
        
        throw new Error(`Failed to parse Twitter user data: ${parseError.message || 'Unknown parsing error'}`);
      }
    } catch (fetchError: any) {
      logger.error('twitter', `Error fetching user data: ${fetchError.message || String(fetchError)}`);
      
      // If fetch fails but we have cached data, use it
      if (userId && this.cache[userId]?.userData) {
        logger.warn('twitter', 'Fetch error, using cached user data');
        return this.cache[userId].userData!.data;
      }
      
      throw fetchError;
    }
  }
  
  /**
   * Fetches tweets from the Twitter API with caching
   * @param accessToken The access token for authentication
   * @param userId The Twitter user ID to fetch tweets for
   * @param cacheKey Optional custom cache key (defaults to userId)
   * @returns Promise resolving to the tweets data
   */
  async getTwitterTweets(accessToken: string, userId: string, cacheKey?: string): Promise<any> {
    logger.info('twitter', `Getting tweets for user ID: ${userId.substring(0, 8)}...`);
    
    // Use a cacheKey if provided, otherwise use userId
    const cacheId = cacheKey || userId;
    
    // Check cache
    if (this.cache[cacheId]?.tweets) {
      const cachedData = this.cache[cacheId].tweets;
      const cacheAge = Date.now() - cachedData.timestamp;
      
      if (cacheAge < this.TWEETS_TTL) {
        logger.info('twitter', `Using cached tweets (${Math.round(cacheAge / 1000)}s old)`);
        return cachedData.data;
      } else {
        logger.debug('twitter', `Cached tweets expired (${Math.round(cacheAge / 1000)}s old)`);
      }
    }
    
    try {
      logger.info('twitter', `Fetching fresh tweets for user ID: ${userId.substring(0, 8)}...`);
      // Get recent tweets with metrics data
      const response = await fetch(
        `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=created_at,public_metrics&max_results=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      
      // Get the response body for both success and error cases
      const responseText = await response.text();
      logger.info('twitter', `Tweets response status: ${response.status}`);
      
      if (!response.ok) {
        logger.error('twitter', `Tweets fetch failed: ${response.status}`);
        logger.error('twitter', `Error response: ${responseText}`);
        
        // Check for rate limiting
        if (response.status === 429 && this.cache[cacheId]?.tweets) {
          logger.warn('twitter', 'Rate limited, using cached tweets');
          return this.cache[cacheId].tweets!.data;
        }
        
        throw new Error(`Twitter tweets fetch failed: ${response.status} ${responseText}`);
      }
      
      try {
        // Parse the response JSON
        const parsedData = JSON.parse(responseText);
        
        // Validate the response format
        if (!parsedData.data) {
          logger.warn('twitter', 'Tweets response missing data property');
        } else if (!Array.isArray(parsedData.data)) {
          logger.warn('twitter', `Tweets data is not an array: ${typeof parsedData.data}`);
        } else {
          logger.info('twitter', `Successfully fetched ${parsedData.data.length} tweets`);
          
          // Log metrics for the first tweet to help debug
          if (parsedData.data.length > 0) {
            logger.debug('twitter', `First tweet metrics sample: ${JSON.stringify(parsedData.data[0].public_metrics || 'No metrics available')}`);
          }
          
          // Cache the result
          if (!this.cache[cacheId]) this.cache[cacheId] = {};
          this.cache[cacheId].tweets = {
            data: parsedData,
            timestamp: Date.now()
          };
          logger.debug('twitter', 'Tweets cached');
        }
        
        return parsedData;
      } catch (parseError: any) {
        logger.error('twitter', `Failed to parse tweets response: ${parseError.message || String(parseError)}`);
        
        // If parsing fails but we have cached data, use it
        if (this.cache[cacheId]?.tweets) {
          logger.warn('twitter', 'Parse error, using cached tweets');
          return this.cache[cacheId].tweets!.data;
        }
        
        throw new Error(`Failed to parse Twitter tweets data: ${parseError.message || 'Unknown parsing error'}`);
      }
    } catch (fetchError: any) {
      logger.error('twitter', `Error fetching tweets: ${fetchError.message || String(fetchError)}`);
      
      // If fetch fails but we have cached data, use it
      if (this.cache[cacheId]?.tweets) {
        logger.warn('twitter', 'Fetch error, using cached tweets');
        return this.cache[cacheId].tweets!.data;
      }
      
      throw fetchError;
    }
  }
  
  /**
   * Fetches historical metrics for a set of tweets from the Twitter API
   * @param accessToken The access token for authentication
   * @param tweetIds Array of tweet IDs to fetch metrics for
   * @param startTime Start timestamp for metrics (ISO string)
   * @param endTime End timestamp for metrics (ISO string)
   * @param granularity Granularity of the metrics (Daily, Hourly, Weekly, Total)
   * @param cacheKey Optional custom cache key
   * @returns Promise resolving to the historical metrics data
   */
  async getTwitterHistoricalMetrics(
    accessToken: string,
    tweetIds: string[],
    startTime: string,
    endTime: string,
    granularity: 'Daily' | 'Hourly' | 'Weekly' | 'Total' = 'Total',
    cacheKey?: string
  ): Promise<any> {
    // Only process max 25 tweets at a time per API limitations
    const processableTweetIds = tweetIds.slice(0, 25);
    
    // Create a unique cache key based on parameters
    const metricsKey = cacheKey || `metrics:${processableTweetIds.join(',')}:${startTime}:${endTime}:${granularity}`;
    
    logger.info('twitter', `Getting historical metrics for ${processableTweetIds.length} tweets`);
    
    // Check cache
    if (this.cache[metricsKey]?.historicalMetrics) {
      const cachedData = this.cache[metricsKey].historicalMetrics;
      const cacheAge = Date.now() - cachedData.timestamp;
      
      if (cacheAge < this.METRICS_TTL) {
        logger.info('twitter', `Using cached historical metrics (${Math.round(cacheAge / 1000)}s old)`);
        return cachedData.data;
      } else {
        logger.debug('twitter', `Cached historical metrics expired (${Math.round(cacheAge / 1000)}s old)`);
      }
    }
    
    try {
      logger.info('twitter', `Fetching fresh historical metrics for ${processableTweetIds.length} tweets`);
      
      // The requested metrics we want to retrieve
      const requestedMetrics = [
        'Impressions',
        'Engagements',
        'Likes',
        'Retweets',
        'QuoteTweets',
        'Replies',
        'ProfileVisits',
        'LinkClicks',
        'MediaViews',
        'MediaEngagements',
        'DetailExpands',
        'UserProfileClicks'
      ];
      
      // Construct URL with query parameters
      const params = new URLSearchParams();
      processableTweetIds.forEach(id => params.append('tweet_ids', id));
      params.append('start_time', startTime);
      params.append('end_time', endTime);
      params.append('granularity', granularity);
      requestedMetrics.forEach(metric => params.append('requested_metrics', metric));
      params.append('engagement.fields', 'measurement');
      
      // Make the API request
      const response = await fetch(
        `https://api.twitter.com/2/insights/historical?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Get the response body for both success and error cases
      const responseText = await response.text();
      logger.info('twitter', `Historical metrics response status: ${response.status}`);
      
      if (!response.ok) {
        logger.error('twitter', `Historical metrics fetch failed: ${response.status}`);
        logger.error('twitter', `Error response: ${responseText}`);
        
        // Check for rate limiting
        if (response.status === 429 && this.cache[metricsKey]?.historicalMetrics) {
          logger.warn('twitter', 'Rate limited, using cached historical metrics');
          return this.cache[metricsKey].historicalMetrics!.data;
        }
        
        throw new Error(`Twitter historical metrics fetch failed: ${response.status} ${responseText}`);
      }
      
      try {
        // Parse the response JSON
        const parsedData = JSON.parse(responseText);
        
        // Validate the response format
        if (!parsedData.data) {
          logger.warn('twitter', 'Historical metrics response missing data property');
        } else {
          logger.info('twitter', 'Successfully fetched historical metrics');
          
          // Log a sample of the metrics for debugging
          if (parsedData.data[0]?.measurement?.metrics_total?.length > 0) {
            logger.debug('twitter', `Metrics sample: ${JSON.stringify(parsedData.data[0].measurement.metrics_total[0])}`);
          }
          
          // Cache the result
          if (!this.cache[metricsKey]) this.cache[metricsKey] = {};
          this.cache[metricsKey].historicalMetrics = {
            data: parsedData,
            timestamp: Date.now()
          };
          logger.debug('twitter', 'Historical metrics cached');
        }
        
        return parsedData;
      } catch (parseError: any) {
        logger.error('twitter', `Failed to parse historical metrics response: ${parseError.message || String(parseError)}`);
        
        // If parsing fails but we have cached data, use it
        if (this.cache[metricsKey]?.historicalMetrics) {
          logger.warn('twitter', 'Parse error, using cached historical metrics');
          return this.cache[metricsKey].historicalMetrics!.data;
        }
        
        throw new Error(`Failed to parse Twitter historical metrics data: ${parseError.message || 'Unknown parsing error'}`);
      }
    } catch (fetchError: any) {
      logger.error('twitter', `Error fetching historical metrics: ${fetchError.message || String(fetchError)}`);
      
      // If fetch fails but we have cached data, use it
      if (this.cache[metricsKey]?.historicalMetrics) {
        logger.warn('twitter', 'Fetch error, using cached historical metrics');
        return this.cache[metricsKey].historicalMetrics!.data;
      }
      
      throw fetchError;
    }
  }
  
  /**
   * Retrieves social media metrics for the authenticated user
   * @param tokens Authentication tokens
   * @param userId Optional user ID for caching
   * @returns Promise resolving to the metrics data with cache information
   */
  async getMetrics(tokens: SocialTokens, userId?: string): Promise<CachedSocialMetrics> {
    // If userId is provided and we have recent cached metrics, use them
    if (userId && this.cache[userId]?.metrics) {
      const cachedMetrics = this.cache[userId].metrics;
      const cacheAge = Date.now() - cachedMetrics.timestamp;
      
      if (cacheAge < this.METRICS_TTL) {
        logger.info('twitter', `Using cached metrics (${Math.round(cacheAge / 1000)}s old)`);
        
        // Return cached data with cache metadata
        return {
          ...cachedMetrics.data,
          _cache: {
            fromCache: true,
            timestamp: cachedMetrics.timestamp
          }
        };
      } else {
        logger.debug('twitter', `Cached metrics expired (${Math.round(cacheAge / 1000)}s old)`);
      }
    }
    
    try {
      logger.info('twitter', `Getting metrics with token: ${tokens.access_token.substring(0, 10)}...`);
      
      // Default values in case API calls fail
      let accountInfo = {
        username: "unknown",
        displayName: "Twitter User",
        followers: 0,
        following: 0,
        profileImageUrl: undefined,
      };
      
      let posts: any[] = [];
      let twitterUserId: string | undefined;
      
      // Try to get user data
      try {
        const userData = await this.getTwitterUserData(tokens.access_token, userId);
        
        if (userData.data) {
          const user = userData.data;
          logger.info('twitter', `Got user data for: ${user.username}`);
          twitterUserId = user.id;
          
          accountInfo = {
            username: user.username,
            displayName: user.name || user.username,
            followers: user.public_metrics?.followers_count || 0,
            following: user.public_metrics?.following_count || 0,
            profileImageUrl: user.profile_image_url,
          };
        } else {
          logger.warn('twitter', 'User data response missing data property');
        }
      } catch (userError: any) {
        logger.error('twitter', `Error fetching user data: ${userError.message || String(userError)}`);
        // Continue with default account info
      }
      
      // Try to get tweets
      try {
        if (!accountInfo.username || accountInfo.username === "unknown") {
          throw new Error("Cannot fetch tweets without valid user data");
        }
        
        if (!twitterUserId) {
          throw new Error("Cannot fetch tweets without valid user ID");
        }
        
        // Only attempt to get tweets if we have a user ID
        const tweetsData = await this.getTwitterTweets(tokens.access_token, twitterUserId, userId);
        
        if (tweetsData.data && Array.isArray(tweetsData.data)) {
          logger.info('twitter', `Got ${tweetsData.data.length} tweets`);
          
          // Create an array of tweet IDs for historical metrics
          const tweetIds = tweetsData.data.map((tweet: any) => tweet.id);
          let historicalMetricsData = null;
          
          // Try to fetch historical metrics if we have tweet IDs
          if (tweetIds.length > 0) {
            try {
              // Set start time to 30 days ago and end time to now
              const endTime = new Date().toISOString();
              const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
              
              historicalMetricsData = await this.getTwitterHistoricalMetrics(
                tokens.access_token,
                tweetIds,
                startTime,
                endTime,
                'Total',
                userId
              );
              
              logger.info('twitter', 'Successfully fetched historical metrics for tweets');
            } catch (metricsError: any) {
              logger.error('twitter', `Error fetching historical metrics: ${metricsError.message || String(metricsError)}`);
              // Continue without historical metrics
            }
          }
          
          // Map tweet data, now including historical metrics if available
          posts = tweetsData.data.map((tweet: any) => {
            // Create base tweet object with public metrics
            const postObj = {
              id: tweet.id,
              text: tweet.text,
              createdAt: new Date(tweet.created_at),
              metrics: {
                impressions: tweet.public_metrics?.impression_count || 0,
                retweets: tweet.public_metrics?.retweet_count || 0,
                replies: tweet.public_metrics?.reply_count || 0,
                likes: tweet.public_metrics?.like_count || 0,
                quotes: tweet.public_metrics?.quote_count || 0,
              } as TweetMetrics,
            };
            
            // Add historical metrics if available
            if (historicalMetricsData?.data?.[0]?.measurement?.metrics_total) {
              const tweetMetrics = historicalMetricsData.data[0].measurement.metrics_total.find(
                (m: any) => m.tweet_id === tweet.id
              );
              
              if (tweetMetrics?.value) {
                // Create a map of metric name to value
                const metricsMap: Record<string, number> = {};
                tweetMetrics.value.forEach((metric: any) => {
                  metricsMap[metric.metric_type] = metric.metric_value;
                });
                
                // Add historical metrics to the tweet object
                postObj.metrics = {
                  ...postObj.metrics,
                  impressions: metricsMap.Impressions || postObj.metrics.impressions,
                  engagements: metricsMap.Engagements || 0,
                  profileVisits: metricsMap.ProfileVisits || 0,
                  linkClicks: metricsMap.LinkClicks || 0,
                  mediaViews: metricsMap.MediaViews || 0,
                  mediaEngagements: metricsMap.MediaEngagements || 0,
                  detailExpands: metricsMap.DetailExpands || 0,
                  userProfileClicks: metricsMap.UserProfileClicks || 0,
                };
              }
            }
            
            return postObj;
          });
        } else {
          logger.warn('twitter', 'Tweets data missing or not an array: ' + 
            (Array.isArray(tweetsData.data) ? `Array length: ${tweetsData.data?.length}` : typeof tweetsData.data));
        }
      } catch (tweetsError: any) {
        logger.error('twitter', `Error fetching tweets: ${tweetsError.message || String(tweetsError)}`);
        // Continue with empty posts array
      }
      
      // Prepare metrics object
      const metrics: SocialMetrics = {
        accountInfo,
        posts,
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date(),
        },
      };
      
      // Prepare the final metrics object with cache info
      const metricsWithCacheInfo = {
        ...metrics,
        _cache: {
          fromCache: false,
          timestamp: Date.now()
        }
      };
      
      // Cache the metrics
      if (userId) {
        if (!this.cache[userId]) this.cache[userId] = {};
        this.cache[userId].metrics = {
          data: metrics, // Store without cache info to avoid nesting
          timestamp: Date.now()
        };
        logger.debug('twitter', 'Metrics cached for user');
      }
      
      // Return metrics even if some parts failed
      logger.info('twitter', `Returning metrics with ${posts.length} posts for ${accountInfo.username}`);
      return metricsWithCacheInfo;
    } catch (error: any) {
      logger.error('twitter', `Error fetching metrics: ${error.message || String(error)}`);
      
      // Try to use cached metrics if available, even if they're expired
      if (userId && this.cache[userId]?.metrics) {
        logger.warn('twitter', 'Using expired cached metrics due to error');
        return {
          ...this.cache[userId].metrics!.data,
          _cache: {
            fromCache: true,
            timestamp: this.cache[userId].metrics!.timestamp,
            expired: true
          }
        };
      }
      
      // Return minimal valid data structure even on complete failure
      logger.warn('twitter', 'Returning fallback metrics due to error');
      return {
        accountInfo: {
          username: "error",
          displayName: "Error Loading Data",
          followers: 0,
          following: 0,
        },
        posts: [],
        period: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
        _cache: {
          fromCache: false,
          error: true
        }
      };
    }
  }

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
      logger.error('twitter', `Error checking token expiration: ${error}`);
      return true; // Assume expired if we can't parse the date
    }
  }

  /**
   * Checks the status of a Twitter account's tokens
   * @param account The social account record to check
   * @returns A status string: 'connected', 'expired', or 'error'
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
          await this.refreshTokens(account.refresh_token);
          
          // If we got here without an error, the refresh was successful
          return 'connected';
        } catch (refreshError) {
          logger.error('twitter', `Error refreshing token: ${refreshError}`);
        }
      }
      
      // If we get here, token is expired and couldn't be refreshed
      return 'expired';
    } catch (error) {
      logger.error('twitter', `Error checking token status: ${error}`);
      return 'error';
    }
  }
}

/**
 * Singleton instance of the Twitter platform
 * Use this for all Twitter API interactions
 */
export const twitterPlatform = new TwitterPlatform(); 