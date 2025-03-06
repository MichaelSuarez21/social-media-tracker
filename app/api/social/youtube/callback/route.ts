import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';
import { decryptData } from '@/lib/encryptedCookie';
import { youtubePlatform } from '@/lib/social/YoutubePlatform';

/**
 * Handles the callback from YouTube OAuth process
 */
export async function GET(request: NextRequest) {
  // Extract the query parameters from the callback URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  
  // Check for OAuth 2.0 error
  if (error) {
    logger.error('YouTube OAuth error', { error });
    return NextResponse.redirect(new URL('/accounts?error=oauth', request.url));
  }

  // Check if required parameters are present
  if (!code || !stateParam) {
    logger.error('Missing OAuth parameters', { code: !!code, state: !!stateParam });
    return NextResponse.redirect(new URL('/accounts?error=missing_params', request.url));
  }

  // Get the encrypted cookie
  const cookieStore = request.cookies;
  let encryptedCookie = cookieStore.get('youtube_oauth_data')?.value;
  
  // If we can't find it on the request, try the cookies() API
  if (!encryptedCookie) {
    try {
      const nextCookies = await cookies();
      encryptedCookie = nextCookies.get('youtube_oauth_data')?.value;
    } catch (error) {
      console.log('Error accessing cookies API:', error);
    }
  }
  
  // Debug logging
  console.log('YouTube OAuth callback received:');
  console.log('URL code:', code);
  console.log('URL state:', stateParam);
  console.log('Cookie present:', !!encryptedCookie);
  
  // Data for OAuth verification
  let state: string;
  let codeVerifier: string;
  let isReconnect: boolean;
  
  // Decrypt the cookie data
  if (!encryptedCookie) {
    logger.error('No OAuth cookie found');
    return NextResponse.redirect(new URL('/accounts?error=missing_cookie', request.url));
  }
  
  // Decrypt the cookie
  const oauthData = decryptData(encryptedCookie);
  console.log('Decryption successful:', !!oauthData);
  
  // Check if decryption was successful
  if (!oauthData) {
    logger.error('Failed to decrypt OAuth cookie');
    return NextResponse.redirect(new URL('/accounts?error=invalid_cookie', request.url));
  }
  
  state = oauthData.state;
  codeVerifier = oauthData.codeVerifier;
  isReconnect = oauthData.isReconnect;
  
  // Verify the state parameter
  if (stateParam !== state) {
    logger.error('State mismatch', { received: stateParam, stored: state });
    return NextResponse.redirect(new URL('/accounts?error=state_mismatch', request.url));
  }
  
  try {
    // Create a Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if the user is authenticated
    if (!session?.user) {
      logger.error('User not authenticated during callback');
      return NextResponse.redirect(new URL('/login?error=auth_required', request.url));
    }
    
    // Exchange the code for tokens
    const tokens = await youtubePlatform.exchangeCodeForTokens(code, codeVerifier);
    
    if (!tokens.access_token) {
      logger.error('Failed to get access token');
      return NextResponse.redirect(new URL('/accounts?error=token_exchange', request.url));
    }
    
    // Get user profile information to store alongside tokens
    try {
      // Fetch channel data to get user info
      const channelUrl = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
      const channelResponse = await fetch(channelUrl, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!channelResponse.ok) {
        throw new Error(`Channel info request failed: ${channelResponse.status} ${channelResponse.statusText}`);
      }
      
      const data = await channelResponse.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('No channel found for this user');
      }
      
      const channel = data.items[0];
      const platformUserId = channel.id;
      const platformUsername = channel.snippet.title;
      
      logger.info('Got YouTube user info', { ID: platformUserId, Username: platformUsername });
      
      // Store tokens in database
      const result = await storeYoutubeTokens({
        supabase,
        userId: session.user.id,
        platformUserId,
        platformUsername,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt: tokens.expires_at,
        isReconnect
      });
      
      if (!result) {
        logger.error('Failed to store tokens in database');
        return NextResponse.redirect(new URL('/accounts?error=token_storage', request.url));
      }
      
      // Clear the cookie
      const redirectResponse = NextResponse.redirect(
        new URL(`/accounts?${isReconnect ? 'reconnected' : 'connected'}=youtube`, request.url)
      );
      
      redirectResponse.cookies.set('youtube_oauth_data', '', {
        path: '/',
        expires: new Date(0),
      });
      
      return redirectResponse;
    } catch (error) {
      logger.error('Error getting user info', { error });
      return NextResponse.redirect(new URL('/accounts?error=user_info_failed', request.url));
    }
  } catch (error) {
    logger.error('Callback error', { error });
    return NextResponse.redirect(new URL('/accounts?error=callback_failed', request.url));
  }
}

/**
 * Store the YouTube tokens in the database
 */
async function storeYoutubeTokens({ 
  supabase, 
  userId, 
  platformUserId,
  platformUsername,
  accessToken, 
  refreshToken,
  expiresAt,
  isReconnect
}: {
  supabase: any;
  userId: string;
  platformUserId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  isReconnect: boolean;
}) {
  try {
    // Check if a record already exists for this user and platform
    const { data: existingAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .single();
    
    const expiresAtISO = expiresAt?.toISOString();
    
    if (existingAccount && isReconnect) {
      // Update the existing account for reconnection
      const { error } = await supabase
        .from('social_accounts')
        .update({
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
      
      if (error) {
        logger.error('Error updating tokens', { error: error.message });
        return false;
      }
      
      logger.info('Updated tokens for YouTube account', { Username: platformUsername });
      return true;
    } else if (existingAccount) {
      // Account exists but not reconnecting - update tokens
      const { error } = await supabase
        .from('social_accounts')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingAccount.id);
      
      if (error) {
        logger.error('Error updating tokens', { error: error.message });
        return false;
      }
      
      logger.info('Updated tokens for YouTube account', { Username: platformUsername });
      return true;
    } else {
      // Insert new account
      const { error } = await supabase
        .from('social_accounts')
        .insert({
          user_id: userId,
          platform: 'youtube',
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAtISO
        });
      
      if (error) {
        logger.error('Error inserting tokens', { error: error.message });
        return false;
      }
      
      logger.info('Stored tokens for new YouTube account', { Username: platformUsername });
      return true;
    }
  } catch (error) {
    logger.error('Error storing tokens', { error });
    return false;
  }
} 