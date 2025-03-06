import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import logger from '@/lib/logger';
import { encryptData } from '@/lib/encryptedCookie';
import { youtubePlatform } from '@/lib/social/YoutubePlatform';

/**
 * Initiates YouTube OAuth 2.0 login
 */
export async function GET(request: NextRequest) {
  try {
    // Check if this is a reconnect attempt
    const { searchParams } = new URL(request.url);
    const isReconnect = searchParams.get('reconnect') === 'true';

    // Create a Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session?.user) {
      logger.warn('User not authenticated during login');
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

    // Prepare the redirect URL to YouTube's OAuth 2.0 endpoint
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/social/youtube/callback`;
    
    // Generate a unique identifier for this login attempt
    const loginId = randomBytes(8).toString('hex');
    
    // Store the original state and login ID for verification
    const stateWithId = `${state}.${loginId}`;
    
    // Create the YouTube authorization URL
    const youtubeAuthUrl = youtubePlatform.createAuthUrl(stateWithId, codeChallenge);

    logger.info(`Starting YouTube OAuth for user ${session.user.id}`, { isReconnect });
    
    // Store the auth data in an encrypted cookie
    const cookieData = {
      state: stateWithId,
      codeVerifier,
      isReconnect,
      loginId
    };
    
    // Encrypt the cookie data
    const encryptedCookieValue = encryptData(cookieData);
    
    // Add debug logging
    console.log('YouTube OAuth initialization debug info:');
    console.log('Redirect URI:', redirectUri);
    console.log('YouTube Client ID available:', !!process.env.YOUTUBE_CLIENT_ID);
    console.log('Code challenge method:', 'S256');
    console.log('State:', stateWithId);
    console.log('Code verifier length:', codeVerifier.length);
    console.log('Cookie encrypted successfully:', !!encryptedCookieValue);

    // Create response with redirect to YouTube auth URL
    const response = NextResponse.redirect(youtubeAuthUrl);
    
    // Set the encrypted cookie with appropriate settings for cross-domain redirects
    response.cookies.set('youtube_oauth_data', encryptedCookieValue, {
      path: '/',
      httpOnly: true,
      secure: true, // Must be secure when using SameSite=None
      maxAge: 60 * 10, // 10 minutes
      sameSite: 'none' // Allow cookies in cross-site requests
    });
    
    return response;
  } catch (error) {
    logger.error('youtube-api', `Login error: ${error}`);
    
    // Redirect to accounts page with error
    return NextResponse.redirect(
      new URL('/accounts?error=youtube_login_failed', request.url)
    );
  }
} 