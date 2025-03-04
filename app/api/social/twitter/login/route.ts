import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import logger from '@/lib/logger';
import { encryptData } from '@/lib/encryptedCookie';
import { storeTwitterOAuthSession } from '@/lib/twitterOAuthStore';

/**
 * Initiates Twitter OAuth 2.0 login
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a reconnect attempt
    const { searchParams } = new URL(request.url);
    const isReconnect = searchParams.get('reconnect') === 'true';

    // Create a server component client for Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session?.user) {
      logger.warn('twitter-api', 'User not authenticated during login');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Generate a random state string for CSRF protection
    const state = randomBytes(16).toString('hex');

    // Generate code verifier and challenge for PKCE
    // The code verifier should be between 43-128 chars per RFC 7636
    const codeVerifier = randomBytes(32).toString('base64url').substring(0, 128);
    
    // Generate code challenge from verifier using SHA-256
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Prepare the redirect URL to Twitter's OAuth 2.0 endpoint
    const redirectUri = process.env.TWITTER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/social/twitter/callback`;
    const scope = 'tweet.read users.read offline.access';
    
    // Generate a unique identifier for this login attempt
    const loginId = randomBytes(8).toString('hex');
    
    // Store the original state and login ID for verification
    const stateWithId = `${state}.${loginId}`;
    
    const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
    twitterAuthUrl.searchParams.append('response_type', 'code');
    twitterAuthUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID || '');
    twitterAuthUrl.searchParams.append('redirect_uri', redirectUri);
    twitterAuthUrl.searchParams.append('scope', scope);
    twitterAuthUrl.searchParams.append('state', stateWithId);
    twitterAuthUrl.searchParams.append('code_challenge', codeChallenge);
    twitterAuthUrl.searchParams.append('code_challenge_method', 'S256');

    logger.info('twitter-api', `Starting Twitter OAuth for user ${session.user.id} (isReconnect: ${isReconnect})`);
    
    // Store the auth data in an encrypted cookie
    const cookieData = {
      state: stateWithId,
      codeVerifier,
      isReconnect,
      loginId
    };
    
    // Also store in server-side store as a backup
    storeTwitterOAuthSession(loginId, stateWithId, codeVerifier, isReconnect);
    
    // Encrypt the cookie data
    const encryptedCookieValue = encryptData(cookieData);
    
    // Add debug logging
    console.log('Twitter OAuth initialization debug info:');
    console.log('Redirect URI:', redirectUri);
    console.log('Twitter Client ID available:', !!process.env.TWITTER_CLIENT_ID);
    console.log('Code challenge method:', 'S256');
    console.log('State:', stateWithId);
    console.log('Code verifier length:', codeVerifier.length);
    console.log('Cookie encrypted successfully:', !!encryptedCookieValue);

    // Create response with redirect to Twitter auth URL
    const response = NextResponse.redirect(twitterAuthUrl);
    
    // Set the encrypted cookie with appropriate settings for cross-domain redirects
    response.cookies.set('twitter_oauth_data', encryptedCookieValue, {
      path: '/',
      httpOnly: true,
      secure: true, // Must be secure when using SameSite=None
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'none' // Allow cookies in cross-site requests
    });
    
    return response;
  } catch (error) {
    // Log any errors that occur during the process
    logger.error('twitter-api', `Error during Twitter OAuth login: ${error}`);
    console.error('Twitter OAuth login error:', error);
    
    // Redirect to an error page if something goes wrong
    return NextResponse.redirect(new URL('/accounts?error=login_failed', request.url));
  }
} 