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

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    // Destructure platform from params
    const platform = params.platform;
    console.log('Login request for platform:', platform);
    
    // Check if the platform is supported
    if (!platforms[platform as keyof typeof platforms]) {
      return NextResponse.json(
        { error: `Platform '${platform}' is not supported` },
        { status: 400 }
      );
    }
    
    const platformInstance = platforms[platform as keyof typeof platforms];
    
    // For Twitter, we need to handle PKCE and state in the route
    if (platform === 'twitter') {
      const twitterInstance = platformInstance as typeof twitterPlatform;
      const { url, codeVerifier, state } = await twitterInstance.prepareAuthRequest();
      
      // Debug logging
      console.log('Twitter Auth URL:', url);
      console.log('Redirect URI used:', process.env.TWITTER_REDIRECT_URI);
      
      // Set cookies for the callback
      const response = NextResponse.redirect(url);
      response.cookies.set('twitter_code_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10, // 10 minutes
        path: '/',
      });
      
      response.cookies.set('twitter_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10, // 10 minutes
        path: '/',
      });
      
      return response;
    }
    
    // For other platforms, just redirect to the auth URL
    const authUrl = platformInstance.getAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating social login:', error);
    return NextResponse.json(
      { error: 'Failed to start authentication flow' },
      { status: 500 }
    );
  }
} 