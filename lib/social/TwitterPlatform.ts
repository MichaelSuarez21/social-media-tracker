import { BasePlatform, SocialTokens, SocialMetrics } from './BasePlatform';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/twitter-utils';
import { cookies } from 'next/headers';

export class TwitterPlatform extends BasePlatform {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  constructor() {
    super('twitter');
    this.clientId = process.env.TWITTER_CLIENT_ID || '';
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    this.redirectUri = process.env.TWITTER_REDIRECT_URI || '';
    
    // Debug constructor values
    console.log('TwitterPlatform initialized with:');
    console.log('- Client ID length:', this.clientId ? this.clientId.length : 0);
    console.log('- Client Secret length:', this.clientSecret ? this.clientSecret.length : 0);
    console.log('- Redirect URI:', this.redirectUri);
  }
  
  getAuthUrl(): string {
    // We'll handle the async parts (cookies, code challenge) in a separate method
    // that will be called from the API route
    return '#'; // This is a placeholder - actual URL creation happens in prepareAuthRequest
  }
  
  // This method is called from the API route to get the full auth URL
  async prepareAuthRequest(): Promise<{url: string, codeVerifier: string, state: string}> {
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Log values for debugging
    console.log('Preparing Twitter auth request:');
    console.log('- Code verifier:', `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)`);
    console.log('- Code challenge:', codeChallenge);
    console.log('- State:', state);
    
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
    
    console.log('- Auth URL:', authUrl.toString());
    console.log('- Redirect URI:', this.redirectUri);
    
    return {
      url: authUrl.toString(),
      codeVerifier,
      state
    };
  }
  
  async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<SocialTokens> {
    console.log('Twitter: Exchanging code for tokens with PKCE');
    console.log('- Code:', `${code.substring(0, 10)}... (${code.length} chars)`);
    console.log('- Code verifier:', `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)`);
    console.log('- Redirect URI:', this.redirectUri);
    
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
    console.log('Authorization header created (first 20 chars):', authHeader.substring(0, 20) + '...');
    
    try {
      // Make the token exchange request
      console.log('Sending token request to Twitter API...');
      console.log('Request URL: https://api.twitter.com/2/oauth2/token');
      console.log('Request body:', params.toString());
      
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
      console.log('Twitter token response status:', response.status);
      
      // Check for HTTP errors
      if (!response.ok) {
        console.error('Twitter token exchange failed with status', response.status);
        console.error('Response body:', responseText);
        throw new Error(`Twitter token exchange failed: ${response.status} - ${responseText}`);
      }
      
      // Parse the JSON response
      try {
        const data = JSON.parse(responseText);
        
        // Log token details (partially redacted for security)
        console.log('Token exchange successful:');
        console.log('- Access token:', data.access_token ? `${data.access_token.substring(0, 10)}... (${data.access_token.length} chars)` : 'Missing');
        console.log('- Refresh token:', data.refresh_token ? `${data.refresh_token.substring(0, 10)}... (${data.refresh_token.length} chars)` : 'Missing');
        console.log('- Expires in:', data.expires_in, 'seconds');
        console.log('- Scope:', data.scope);
        
        // Return the token data in our standardized format
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: new Date(Date.now() + data.expires_in * 1000),
          scopes: data.scope,
        };
      } catch (parseError) {
        console.error('Error parsing Twitter token response:', parseError);
        throw new Error(`Failed to parse Twitter token response: ${responseText}`);
      }
    } catch (error) {
      console.error('Error during Twitter token exchange:', error);
      throw error;
    }
  }
  
  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitter token refresh failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope,
    };
  }
  
  async getTwitterUserData(accessToken: string): Promise<any> {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitter user data fetch failed: ${response.status} ${errorText}`);
    }
    
    return response.json();
  }
  
  async getTwitterTweets(accessToken: string, userId: string): Promise<any> {
    // Get recent tweets with metrics data
    const response = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?tweet.fields=created_at,public_metrics&max_results=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twitter tweets fetch failed: ${response.status} ${errorText}`);
    }
    
    return response.json();
  }
  
  async getMetrics(tokens: SocialTokens): Promise<SocialMetrics> {
    try {
      // Get user data
      const userData = await this.getTwitterUserData(tokens.access_token);
      
      if (!userData.data) {
        throw new Error('Failed to fetch Twitter user data');
      }
      
      const user = userData.data;
      
      // Get recent tweets
      const tweetsData = await this.getTwitterTweets(tokens.access_token, user.id);
      
      if (!tweetsData.data) {
        throw new Error('Failed to fetch Twitter tweets');
      }
      
      // Format the response
      const accountInfo = {
        username: user.username,
        displayName: user.name,
        followers: user.public_metrics?.followers_count || 0,
        following: user.public_metrics?.following_count || 0,
        profileImageUrl: user.profile_image_url,
      };
      
      const posts = tweetsData.data.map((tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        metrics: {
          impressions: tweet.public_metrics?.impression_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          likes: tweet.public_metrics?.like_count || 0,
          quotes: tweet.public_metrics?.quote_count || 0,
        },
      }));
      
      return {
        accountInfo,
        posts,
        period: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: new Date(),
        },
      };
    } catch (error) {
      console.error('Error fetching Twitter metrics:', error);
      throw error;
    }
  }
}

// Singleton instance
export const twitterPlatform = new TwitterPlatform(); 