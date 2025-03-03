import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { twitterPlatform } from '@/lib/social/TwitterPlatform';

// This map contains all supported platforms
const platforms = {
  twitter: twitterPlatform,
  // Add more platforms here as they're implemented:
  // instagram: instagramPlatform,
  // facebook: facebookPlatform,
  // etc.
};

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform;
    console.log(`OAuth callback received for platform: ${platform}`);
    
    const { searchParams } = request.nextUrl;
    
    // Check if the platform is supported
    if (!platforms[platform as keyof typeof platforms]) {
      console.error(`Unsupported platform: ${platform}`);
      return NextResponse.redirect(new URL(`/accounts?error=unsupported_platform&platform=${platform}`, request.url));
    }
    
    // Check for OAuth errors first
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      console.error(`OAuth Error: ${error} - ${errorDescription}`);
      return NextResponse.redirect(new URL(`/accounts?error=${error}&description=${errorDescription}`, request.url));
    }
    
    const platformInstance = platforms[platform as keyof typeof platforms];
    
    // Get the auth code and state from the URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code) {
      console.error('Authorization code is missing');
      return NextResponse.redirect(new URL(`/accounts?error=missing_code`, request.url));
    }
    
    // Get the current authenticated user
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.error('User is not authenticated');
      return NextResponse.redirect(new URL(`/login?error=not_authenticated&returnUrl=/accounts`, request.url));
    }
    
    const userId = session.user.id;
    console.log(`Authenticated user ID: ${userId}`);
    
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
      
      // Verify the state to prevent CSRF attacks
      if (!storedState || state !== storedState) {
        console.error('Invalid state parameter', {
          receivedState: state,
          storedState: storedState
        });
        return NextResponse.redirect(new URL(`/accounts?error=invalid_state`, request.url));
      }
      
      if (!codeVerifier) {
        console.error('Code verifier not found');
        return NextResponse.redirect(new URL(`/accounts?error=missing_code_verifier`, request.url));
      }
      
      try {
        console.log('Exchanging code for tokens...');
        // Exchange code for tokens
        const tokens = await platformInstance.exchangeCodeForTokens(code, codeVerifier);
        console.log('Token exchange successful!');
        
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
        
        // Clear the OAuth cookies
        console.log('Token storage successful. Redirecting to accounts page...');
        const response = NextResponse.redirect(new URL(`/accounts?connected=${platform}`, request.url));
        response.cookies.delete('twitter_oauth_state');
        response.cookies.delete('twitter_code_verifier');
        
        // Redirect back to the accounts page with success message
        return response;
      } catch (error) {
        console.error(`Error exchanging Twitter tokens:`, error);
        let errorMessage = 'token_exchange_failed';
        if (error instanceof Error) {
          errorMessage += `&details=${encodeURIComponent(error.message)}`;
        }
        return NextResponse.redirect(new URL(`/accounts?error=${errorMessage}`, request.url));
      }
    }
    
    // For other platforms, implement their specific token exchange logic here
    // ...
    
    // Fallback - this shouldn't happen if all platforms are properly implemented
    console.error(`Token exchange not implemented for ${platform}`);
    return NextResponse.redirect(new URL(`/accounts?error=not_implemented&platform=${platform}`, request.url));
  } catch (error) {
    console.error('Social callback error:', error);
    return NextResponse.redirect(new URL(`/accounts?error=callback_error`, request.url));
  }
} 