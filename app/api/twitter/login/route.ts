import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/twitter-utils';

/**
 * Initiates the Twitter OAuth 2.0 flow
 */
export async function GET() {
  try {
    // Generate code verifier and code challenge for PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2);

    // Store the code verifier and state in cookies for later verification
    cookies().set({
      name: 'twitter_code_verifier',
      value: codeVerifier,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });
    
    cookies().set({
      name: 'twitter_oauth_state',
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    // Construct the Twitter authorization URL
    const twitterAuthUrl = new URL('https://twitter.com/i/oauth2/authorize');
    
    // Add required OAuth parameters
    twitterAuthUrl.searchParams.append('response_type', 'code');
    twitterAuthUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID || '');
    twitterAuthUrl.searchParams.append('redirect_uri', process.env.TWITTER_REDIRECT_URI || '');
    twitterAuthUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access tweet.metrics');
    twitterAuthUrl.searchParams.append('state', state);
    twitterAuthUrl.searchParams.append('code_challenge', codeChallenge);
    twitterAuthUrl.searchParams.append('code_challenge_method', 'S256');
    
    // Redirect the user to Twitter's authorization page
    return NextResponse.redirect(twitterAuthUrl.toString());
  } catch (error) {
    console.error('Error initiating Twitter OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Twitter authentication' },
      { status: 500 }
    );
  }
} 