import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';
import { decryptData } from '@/lib/encryptedCookie';
import { getTwitterOAuthSession, deleteTwitterOAuthSession } from '@/lib/twitterOAuthStore';

/**
 * Handles the callback from Twitter OAuth process
 */
export async function GET(request: NextRequest) {
  // Extract the query parameters from the callback URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Check for OAuth 2.0 error
  if (error) {
    logger.error('twitter-api', `Twitter OAuth error: ${error} - ${searchParams.get('error_description')}`);
    return NextResponse.redirect(new URL('/accounts?error=oauth', request.url));
  }

  // Check if required parameters are present
  if (!code || !stateParam) {
    logger.error('twitter-api', `Missing OAuth parameters - code: ${!!code}, state: ${!!stateParam}`);
    return NextResponse.redirect(new URL('/accounts?error=missing_params', request.url));
  }

  // Get the encrypted cookie - try multiple methods
  const cookieStore = request.cookies;
  let encryptedCookie = cookieStore.get('twitter_oauth_data')?.value;
  
  // If we can't find it on the request, try the cookies() API
  if (!encryptedCookie) {
    try {
      const nextCookies = await cookies();
      encryptedCookie = nextCookies.get('twitter_oauth_data')?.value;
    } catch (error) {
      console.log('Error accessing cookies API:', error);
    }
  }
  
  // Debug logging
  console.log('Twitter OAuth callback received:');
  console.log('URL code:', code);
  console.log('URL state:', stateParam);
  console.log('Cookie present:', !!encryptedCookie);
  
  // Data for OAuth verification
  let state: string;
  let codeVerifier: string;
  let isReconnect: boolean;
  let loginId: string | null = null;
  
  // Try to get data from the cookie first
  if (encryptedCookie) {
    // Decrypt the cookie
    const oauthData = decryptData(encryptedCookie);
    console.log('Decryption successful:', !!oauthData);
    
    // Check if decryption was successful
    if (oauthData) {
      state = oauthData.state;
      codeVerifier = oauthData.codeVerifier;
      isReconnect = oauthData.isReconnect;
      loginId = oauthData.loginId;
    } else {
      logger.error('twitter-api', 'Failed to decrypt OAuth cookie');
      return NextResponse.redirect(new URL('/accounts?error=cookie_decryption_failed', request.url));
    }
  } else {
    // If cookie not available, try to extract login ID from state parameter
    // Format: originalState.loginId
    const stateParts = stateParam.split('.');
    if (stateParts.length === 2) {
      loginId = stateParts[1];
      
      // Try to get data from server-side store using login ID
      const sessionData = getTwitterOAuthSession(loginId);
      console.log('Server-side session found:', !!sessionData);
      
      if (sessionData) {
        state = sessionData.state;
        codeVerifier = sessionData.codeVerifier;
        isReconnect = sessionData.isReconnect;
      } else {
        logger.error('twitter-api', 'No OAuth session found in server-side store');
        return NextResponse.redirect(new URL('/accounts?error=no_session_found', request.url));
      }
    } else {
      logger.error('twitter-api', 'No OAuth cookie found and state format invalid');
      return NextResponse.redirect(new URL('/accounts?error=invalid_state_format', request.url));
    }
  }
  
  // Verify the state parameter
  if (stateParam !== state) {
    logger.error('twitter-api', `State mismatch - received: ${stateParam}, stored: ${state}`);
    return NextResponse.redirect(new URL('/accounts?error=state_mismatch', request.url));
  }

  try {
    // Create a route handler client for Supabase with better cookie handling
    console.log('Initializing Supabase client...');
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });
    
    console.log('Checking user session...');
    const { data: { session: userSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Failed to get user session: ${sessionError.message}`);
    }

    console.log('User session found:', !!userSession);
    
    // Check if the user is authenticated
    if (!userSession?.user) {
      logger.warn('twitter-api', 'User not authenticated during callback');
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Exchange the authorization code for an access token
    const redirectUri = process.env.TWITTER_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/social/twitter/callback`;
    
    console.log('Preparing token exchange:');
    console.log('Redirect URI:', redirectUri);
    console.log('Code verifier:', codeVerifier);

    // Create the Basic Auth header (base64 encoded client_id:client_secret)
    const clientId = process.env.TWITTER_CLIENT_ID || '';
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRequestParams = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };
    
    console.log('Token request parameters:', tokenRequestParams);

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams(tokenRequestParams),
    });

    // Check if the token request was successful
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error('twitter-api', `Twitter token exchange failed: ${tokenResponse.status} - ${errorData}`);
      
      // Add additional debugging
      console.error('Twitter token exchange failed');
      console.error('Status:', tokenResponse.status);
      console.error('Error data:', errorData);
      console.error('Redirect URI used:', redirectUri);
      console.error('Code verifier length:', codeVerifier?.length);
      
      // Provide a more specific error message based on the status code
      let errorType = 'token_exchange';
      if (tokenResponse.status === 400) {
        errorType = 'invalid_request';
      } else if (tokenResponse.status === 401) {
        errorType = 'unauthorized';
      }
      
      // Create response with redirect and clear the cookie
      const response = NextResponse.redirect(new URL(`/accounts?error=${errorType}`, request.url));
      response.cookies.set('twitter_oauth_data', '', { maxAge: 0, path: '/' });
      
      // Clean up server-side session if we have a login ID
      if (loginId) {
        deleteTwitterOAuthSession(loginId);
      }
      
      return response;
    }

    // Parse the token response
    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Store the tokens in the database
    const storeResult = await storeTwitterTokens({
      supabase, 
      userId: userSession.user.id, 
      accessToken: access_token, 
      refreshToken: refresh_token,
      expiresIn: expires_in,
      isReconnect
    });

    if (!storeResult.success) {
      logger.error('twitter-api', `Failed to store tokens: ${storeResult.error}`);
      // Create response with redirect and clear the cookie
      const response = NextResponse.redirect(new URL('/accounts?error=token_storage', request.url));
      response.cookies.set('twitter_oauth_data', '', { maxAge: 0, path: '/' });
      
      // Clean up server-side session if we have a login ID
      if (loginId) {
        deleteTwitterOAuthSession(loginId);
      }
      
      return response;
    }

    // Create response with redirect and clear the cookie
    const response = NextResponse.redirect(new URL(
      isReconnect ? `/accounts?reconnected=twitter` : `/accounts?connected=twitter`, 
      request.url
    ));
    response.cookies.set('twitter_oauth_data', '', { maxAge: 0, path: '/' });
    
    // Clean up server-side session if we have a login ID
    if (loginId) {
      deleteTwitterOAuthSession(loginId);
    }
      
    logger.info('twitter-api', `Twitter OAuth successful for user ${userSession.user.id} (isReconnect: ${isReconnect})`);
    return response;
  } catch (error) {
    // Log any errors that occur during the process
    logger.error('twitter-api', `Error during Twitter OAuth callback: ${error}`);
    
    // Clean up server-side session if we have a login ID
    if (loginId) {
      deleteTwitterOAuthSession(loginId);
    }
    
    // Create response with redirect and clear the cookie
    const response = NextResponse.redirect(new URL('/accounts?error=unexpected', request.url));
    response.cookies.set('twitter_oauth_data', '', { maxAge: 0, path: '/' });
    return response;
  }
}

/**
 * Stores Twitter tokens for a user in the database
 */
async function storeTwitterTokens({ 
  supabase, 
  userId, 
  accessToken, 
  refreshToken,
  expiresIn,
  isReconnect
}: {
  supabase: any;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isReconnect: boolean;
}) {
  try {
    // Calculate token expiry time (current time + expires_in seconds)
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    
    console.log('==== STORING TWITTER TOKENS ====');
    console.log('User ID:', userId);
    console.log('Is Reconnect:', isReconnect);
    console.log('Expires At:', expiresAt);
    console.log('Access Token Length:', accessToken?.length);
    console.log('Refresh Token Length:', refreshToken?.length);
    
    // Log Supabase Client status
    console.log('Supabase client check:');
    console.log('- supabase object exists:', !!supabase);
    console.log('- from method exists:', !!supabase?.from);
    
    // Check if we can access the social_accounts table
    try {
      const { count, error } = await supabase
        .from('social_accounts')
        .select('*', { count: 'exact', head: true });
      
      console.log('Social accounts table check - count:', count);
      console.log('Social accounts table check - error:', error);
    } catch (tableError) {
      console.error('Error checking social_accounts table:', tableError);
    }
    
    if (isReconnect) {
      // If reconnecting, update the existing record
      console.log('Attempting to update existing social account record...');
      const { data, error } = await supabase
        .from('social_accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('platform', 'twitter')
        .select();
        
      console.log('Update result - data:', data);
      console.log('Update result - error:', error);
      
      if (error) throw error;
    } else {
      // If new connection, first check if there's an existing Twitter account
      console.log('Checking for existing Twitter account...');
      const { data: existingAccount, error: fetchError } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitter')
        .single();
      
      console.log('Existing account check - result:', existingAccount);
      console.log('Existing account check - error:', fetchError);
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116 is 'not found' error
      
      if (existingAccount) {
        // Update existing account
        console.log('Updating existing account with ID:', existingAccount.id);
        const { data, error } = await supabase
          .from('social_accounts')
          .update({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAccount.id)
          .select();
          
        console.log('Update result - data:', data);
        console.log('Update result - error:', error);
        
        if (error) throw error;
      } else {
        // Create new account
        console.log('Creating new Twitter social account record...');
        const { data, error } = await supabase
          .from('social_accounts')
          .insert({
            user_id: userId,
            platform: 'twitter',
            platform_user_id: '', // Will be updated later with user info
            platform_username: '',  // Will be updated later
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: expiresAt,
            scopes: 'tweet.read users.read offline.access',
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
          
        console.log('Insert result - data:', data);
        console.log('Insert result - error:', error);
        
        if (error) throw error;
      }
    }
    
    console.log('Twitter token storage completed successfully');
    return { success: true };
  } catch (error: unknown) {
    console.error('=== TOKEN STORAGE ERROR DETAILS ===');
    console.error(error);
    
    // More detailed error logging
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const err = error as { code: string; message: string; details?: string; hint?: string };
      logger.error('twitter-api', `Failed to store Twitter tokens for user ${userId}: ${err.code} - ${err.message}`);
      
      // Log additional useful information for debugging database issues
      if ('details' in error) console.error('Error details:', (error as any).details);
      if ('hint' in error) console.error('Error hint:', (error as any).hint);
      
    } else {
      logger.error('twitter-api', `Failed to store Twitter tokens for user ${userId}: ${JSON.stringify(error)}`);
    }
    
    return { success: false, error };
  }
} 