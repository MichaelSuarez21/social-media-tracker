import { NextRequest, NextResponse } from 'next/server';
import { twitterPlatform } from '@/lib/social/TwitterPlatform';

// This map contains all supported platforms
const platforms = {
  twitter: twitterPlatform,
  // Add more platforms here as they're implemented:
  // instagram: instagramPlatform,
  // facebook: facebookPlatform,
  // etc.
};

/**
 * Create a redirect URL that preserves the original hostname
 * This ensures consistency between 127.0.0.1 and localhost
 */
function createRedirectUrl(path: string, originalUrl: string): URL {
  const url = new URL(originalUrl);
  // Get the original hostname (either 127.0.0.1 or localhost)
  const hostname = url.hostname;
  const port = url.port;
  const protocol = url.protocol;
  
  // Create a new URL with the same hostname
  return new URL(`${protocol}//${hostname}${port ? `:${port}` : ''}${path}`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    // Destructure platform from params
    const platform = params.platform;
    console.log('============================================');
    console.log(`Login request initiated for platform: ${platform}`);
    console.log('Full request URL:', request.url);
    console.log('Requesting host:', new URL(request.url).host);
    console.log('User Agent:', request.headers.get('user-agent'));
    
    // Check if the platform is supported
    if (!platforms[platform as keyof typeof platforms]) {
      console.error(`Unsupported platform requested: ${platform}`);
      // For JSON responses, we don't need to use createRedirectUrl because 
      // we're not redirecting the browser
      return NextResponse.json(
        { error: `Platform '${platform}' is not supported` },
        { status: 400 }
      );
    }
    
    const platformInstance = platforms[platform as keyof typeof platforms];
    
    // For Twitter, we need to handle PKCE and state in the route
    if (platform === 'twitter') {
      console.log('Processing Twitter OAuth flow with PKCE...');
      
      // Validate environment variables are set correctly
      console.log('Checking Twitter environment variables:');
      console.log('- TWITTER_CLIENT_ID exists:', !!process.env.TWITTER_CLIENT_ID);
      console.log('- TWITTER_CLIENT_SECRET exists:', !!process.env.TWITTER_CLIENT_SECRET);
      console.log('- TWITTER_REDIRECT_URI value:', process.env.TWITTER_REDIRECT_URI);
      
      // Check if the Twitter credentials are set
      if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET || !process.env.TWITTER_REDIRECT_URI) {
        console.error('Missing Twitter credentials in environment variables');
        return NextResponse.redirect(createRedirectUrl('/accounts?error=missing_twitter_credentials', request.url));
      }
      
      const twitterInstance = platformInstance as typeof twitterPlatform;
      
      try {
        // Get the auth URL, code verifier and state
        const { url, codeVerifier, state } = await twitterInstance.prepareAuthRequest();
        
        // Debug logging
        console.log('Generated Twitter Auth URL:', url);
        console.log('Redirect URI used:', process.env.TWITTER_REDIRECT_URI);
        
        // Create the redirect response
        const response = NextResponse.redirect(url);
        
        // Set cookies for the callback with cookie settings that will work with IP redirect
        console.log('Setting twitter_code_verifier cookie...');
        response.cookies.set('twitter_code_verifier', codeVerifier, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 10, // 10 minutes
          path: '/',
          // Important: Do NOT set domain for localhost or 127.0.0.1
          sameSite: 'lax'
        });
        
        console.log('Setting twitter_oauth_state cookie...');
        response.cookies.set('twitter_oauth_state', state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 10, // 10 minutes
          path: '/',
          // Important: Do NOT set domain for localhost or 127.0.0.1
          sameSite: 'lax'
        });
        
        // Set session cookies as well to maintain authentication
        const sessionCookie = request.cookies.get('sb-auth-token');
        if (sessionCookie) {
          console.log('Found session cookie, preserving it in redirect...');
          response.cookies.set('sb-auth-token', sessionCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax'
          });
        } else {
          console.warn('No session cookie found! Authentication might fail in callback.');
        }
        
        console.log('Redirecting to Twitter authorization URL...');
        console.log('============================================');
        return response;
      } catch (error) {
        console.error('Error preparing Twitter auth request:', error);
        return NextResponse.redirect(createRedirectUrl('/accounts?error=twitter_auth_preparation_failed', request.url));
      }
    }
    
    // For other platforms, just redirect to the auth URL
    try {
      const authUrl = platformInstance.getAuthUrl();
      console.log(`Redirecting to ${platform} auth URL: ${authUrl}`);
      console.log('============================================');
      return NextResponse.redirect(authUrl);
    } catch (error) {
      console.error(`Error getting auth URL for ${platform}:`, error);
      return NextResponse.redirect(createRedirectUrl(`/accounts?error=${platform}_auth_failed`, request.url));
    }
  } catch (error) {
    console.error('Error initiating social login:', error);
    return NextResponse.redirect(createRedirectUrl('/accounts?error=login_error', request.url));
  }
} 