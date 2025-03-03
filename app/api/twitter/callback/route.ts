import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Handles the callback from Twitter OAuth process
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authorization code and state from the URL query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    // If code or state is missing, return an error
    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }
    
    // Retrieve the stored state and code verifier from cookies
    const storedState = cookies().get('twitter_oauth_state')?.value;
    const codeVerifier = cookies().get('twitter_code_verifier')?.value;
    
    // Verify the state to prevent CSRF attacks
    if (!storedState || state !== storedState) {
      return NextResponse.json(
        { error: 'Invalid state parameter' }, 
        { status: 400 }
      );
    }
    
    // If code verifier is missing, return an error
    if (!codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code verifier' }, 
        { status: 400 }
      );
    }
    
    // Get the current authenticated user
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID || '',
        client_secret: process.env.TWITTER_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.TWITTER_REDIRECT_URI || '',
        code_verifier: codeVerifier,
      }).toString(),
    });
    
    // If token exchange fails, return an error
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Twitter token exchange failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to exchange code for token' }, 
        { status: 500 }
      );
    }
    
    // Parse the token response
    const tokenData = await tokenResponse.json();
    
    // Store the tokens in the database
    try {
      // Store tokens and account info in your database
      await storeTwitterTokens(supabase, session.user.id, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
      });
      
      // Clear the OAuth cookies
      cookies().delete('twitter_oauth_state');
      cookies().delete('twitter_code_verifier');
      
      // Redirect back to the accounts page
      return NextResponse.redirect(new URL('/accounts', request.url));
    } catch (error) {
      console.error('Error storing Twitter tokens:', error);
      return NextResponse.json(
        { error: 'Failed to store Twitter account' }, 
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error handling Twitter callback:', error);
    return NextResponse.json(
      { error: 'Failed to process Twitter callback' }, 
      { status: 500 }
    );
  }
}

/**
 * Stores Twitter tokens for a user in the database
 */
async function storeTwitterTokens(
  supabase: any, 
  userId: string, 
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    scope: string;
  }
) {
  // Store the tokens in the database under twitter_accounts table
  const { error } = await supabase
    .from('twitter_accounts')
    .upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(tokens.expires_at).toISOString(),
      scopes: tokens.scope,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    
  if (error) {
    console.error('Database error storing Twitter tokens:', error);
    throw error;
  }
  
  return true;
} 