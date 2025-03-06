import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';
import { InstagramPlatform } from '@/lib/social/InstagramPlatform';

/**
 * Endpoint for fetching Instagram metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if the user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if the user has a connected Instagram account
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'instagram')
      .single();
    
    if (accountError || !account) {
      logger.error('instagram-api', `Error fetching Instagram account: ${accountError?.message || 'No account found'}`);
      return NextResponse.json({ error: 'Instagram account not found' }, { status: 404 });
    }
    
    // Check if the token is expired
    const instagram = new InstagramPlatform();
    const isExpired = instagram.isTokenExpired(account.expires_at);
    
    if (isExpired && account.refresh_token) {
      // Try to refresh the token
      try {
        logger.info('Refreshing expired Instagram token');
        const tokens = await instagram.refreshTokens(account.access_token);
        
        // Update the token in the database
        const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expires_at,
            updated_at: new Date()
          })
          .eq('id', account.id);
        
        if (updateError) {
          logger.error('instagram-api', `Error updating refreshed token: ${updateError.message}`);
        } else {
          // Use the new token
          account.access_token = tokens.access_token;
          account.expires_at = tokens.expires_at;
        }
      } catch (refreshError: any) {
        logger.error('instagram-api', `Error refreshing token: ${refreshError.message}`);
        return NextResponse.json(
          { error: 'Token expired and could not be refreshed', details: refreshError.message },
          { status: 401 }
        );
      }
    }
    
    // Fetch the Instagram metrics
    const metrics = await instagram.getMetrics(
      { access_token: account.access_token, expires_at: account.expires_at },
      session.user.id
    );
    
    return NextResponse.json(metrics);
  } catch (error: any) {
    logger.error('instagram-api', `Error fetching Instagram metrics: ${error.message}`);
    
    return NextResponse.json(
      { error: 'Failed to fetch Instagram metrics', details: error.message },
      { status: 500 }
    );
  }
} 