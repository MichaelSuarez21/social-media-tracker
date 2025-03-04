import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { twitterPlatform } from '@/lib/social/TwitterPlatform';
import { Session } from '@supabase/supabase-js';

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
    const platform = params.platform;
    console.log(`OAuth callback received for platform: ${platform}`);
    console.log('Full callback URL:', request.url);
    
    const { searchParams } = request.nextUrl;
    
    // Check if the platform is supported
    if (!platforms[platform as keyof typeof platforms]) {
      console.error(`Unsupported platform: ${platform}`);
      return NextResponse.redirect(createRedirectUrl(`/accounts?error=unsupported_platform&platform=${platform}`, request.url));
    }
    
    // Check for OAuth errors first
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error(`OAuth Error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(createRedirectUrl(`/accounts?error=${error}&description=${errorDescription}`, request.url));
    }
    
    const platformInstance = platforms[platform as keyof typeof platforms];
    
    // Get the auth code and state from the URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code) {
      console.error('Authorization code is missing');
      return NextResponse.redirect(createRedirectUrl(`/accounts?error=missing_code`, request.url));
    }
    
    // Get all cookies for debugging
    console.log('All request cookies:');
    const cookieNames = Object.keys(Object.fromEntries(request.cookies));
    cookieNames.forEach(name => {
      const cookie = request.cookies.get(name);
      console.log(`- ${name}: ${cookie ? 'present' : 'empty'}`);
    });
    
    // Get the current authenticated user
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    // For debugging, check auth cookies
    console.log('Checking auth cookies...');
    try {
      // Using request.cookies for better debugging
      const sbAuthTokenCookie = request.cookies.get('sb-auth-token');
      if (sbAuthTokenCookie) {
        console.log('Found sb-auth-token cookie:', sbAuthTokenCookie.name);
      } else {
        console.warn('sb-auth-token cookie not found in request');
      }
    } catch (cookieError) {
      console.error('Error accessing cookies:', cookieError);
    }
    
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    let userSession = data.session;
    
    console.log('Session check result:', { 
      hasSession: !!userSession, 
      error: sessionError?.message || 'none',
      hasCookies: request.cookies.size > 0
    });
    
    if (sessionError) {
      console.error('Error retrieving session:', sessionError);
    }
    
    if (!userSession?.user) {
      console.error('User is not authenticated');
      
      // Try to refresh the session before giving up
      try {
        console.log('Attempting to refresh session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Session refresh failed:', refreshError);
          
          // If this is a development environment, we'll try to proceed without authentication
          // This is just for testing purposes
          if (process.env.NODE_ENV === 'development') {
            console.warn('DEVELOPMENT MODE: Continuing without authentication for testing...');
            // Redirect to a special debugging page
            return NextResponse.redirect(createRedirectUrl(`/debug/twitter-callback?code=${code}&state=${state}`, request.url));
          }
          
          return NextResponse.redirect(createRedirectUrl(`/login?error=not_authenticated&returnUrl=/accounts`, request.url));
        }
        
        if (refreshData.session) {
          console.log('Session refreshed successfully:', refreshData.session.user.id);
          // Continue with the refreshed session
          userSession = refreshData.session;
        } else {
          console.error('No session after refresh');
          return NextResponse.redirect(createRedirectUrl(`/login?error=not_authenticated&returnUrl=/accounts`, request.url));
        }
      } catch (refreshException) {
        console.error('Exception during session refresh:', refreshException);
        return NextResponse.redirect(createRedirectUrl(`/login?error=not_authenticated&returnUrl=/accounts`, request.url));
      }
    }
    
    const userId = userSession?.user?.id;
    console.log(`Authenticated user ID: ${userId || 'UNKNOWN'}`);
    
    // Handle platform-specific token exchange
    if (platform === 'twitter') {
      // For Twitter, we need to verify the state and use PKCE
      const storedState = request.cookies.get('twitter_oauth_state')?.value;
      const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
      
      console.log('Twitter callback received:');
      console.log('- Code:', code ? `${code.substring(0, 10)}... (${code.length} chars)` : 'Missing');
      console.log('- State:', state);
      console.log('- Stored state:', storedState);
      console.log('- Code verifier:', codeVerifier ? `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)` : 'Missing');
      
      // For development mode, skip state verification if no cookies found
      const skipStateVerification = process.env.NODE_ENV === 'development' && !storedState;
      
      // Verify the state to prevent CSRF attacks
      if (!skipStateVerification && (!storedState || state !== storedState)) {
        console.error('Invalid state parameter', {
          receivedState: state,
          storedState: storedState
        });
        return NextResponse.redirect(createRedirectUrl(`/accounts?error=invalid_state`, request.url));
      }
      
      // Skip code verifier check in dev mode if missing
      const skipCodeVerifierCheck = process.env.NODE_ENV === 'development' && !codeVerifier;
      
      if (!skipCodeVerifierCheck && !codeVerifier) {
        console.error('Code verifier not found');
        return NextResponse.redirect(createRedirectUrl(`/accounts?error=missing_code_verifier`, request.url));
      }
      
      try {
        console.log('Exchanging code for tokens...');
        // In dev mode, use a fallback code verifier if needed
        const effectiveCodeVerifier = codeVerifier || 'development_fallback_code_verifier';
        
        // Exchange code for tokens
        const tokens = await platformInstance.exchangeCodeForTokens(code, effectiveCodeVerifier);
        console.log('Token exchange successful!');
        
        // If we don't have a user session at this point (dev mode), we can't save tokens
        if (!userId) {
          console.error('Cannot save tokens without a valid user ID');
          return NextResponse.redirect(createRedirectUrl(`/login?error=cannot_save_tokens&returnUrl=/accounts`, request.url));
        }
        
        // Get Twitter user info to store username and ID
        console.log('Fetching Twitter user data...');
        const twitterUserData = await (platformInstance as typeof twitterPlatform)
          .getTwitterUserData(tokens.access_token);
        
        if (!twitterUserData?.data) {
          console.error('Twitter user data is missing or invalid');
          throw new Error('Failed to get Twitter user data');
        }
        
        console.log('Twitter user data retrieved:', { 
          id: twitterUserData.data.id,
          username: twitterUserData.data.username
        });
        
        // Store tokens in the database
        console.log('Saving tokens to database...');
        await platformInstance.saveTokens(
          userId,
          tokens,
          twitterUserData.data.id,
          twitterUserData.data.username,
          { 
            name: twitterUserData.data.name,
            profile_image_url: twitterUserData.data.profile_image_url 
          }
        );
        
        // Clear the OAuth cookies but preserve session
        console.log('Token storage successful. Redirecting to accounts page...');
        const response = NextResponse.redirect(createRedirectUrl(`/accounts?connected=${platform}`, request.url));
        
        // Clear OAuth cookies
        response.cookies.delete('twitter_oauth_state');
        response.cookies.delete('twitter_code_verifier');
        
        // Preserve session cookie if it exists
        const sessionCookie = request.cookies.get('sb-auth-token');
        if (sessionCookie) {
          console.log('Preserving session cookie in redirect response');
          response.cookies.set('sb-auth-token', sessionCookie.value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax'
          });
        }
        
        // Redirect back to the accounts page with success message
        return response;
      } catch (error) {
        console.error(`Error exchanging Twitter tokens:`, error);
        let errorMessage = 'token_exchange_failed';
        if (error instanceof Error) {
          errorMessage += `&details=${encodeURIComponent(error.message)}`;
        }
        return NextResponse.redirect(createRedirectUrl(`/accounts?error=${errorMessage}`, request.url));
      }
    }
    
    // For other platforms, implement their specific token exchange logic here
    // ...
    
    // Fallback - this shouldn't happen if all platforms are properly implemented
    console.error(`Token exchange not implemented for ${platform}`);
    return NextResponse.redirect(createRedirectUrl(`/accounts?error=not_implemented&platform=${platform}`, request.url));
  } catch (error) {
    console.error('Social callback error:', error);
    return NextResponse.redirect(createRedirectUrl(`/accounts?error=callback_error`, request.url));
  }
} 