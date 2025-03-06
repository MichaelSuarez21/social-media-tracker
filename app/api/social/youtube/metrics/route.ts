import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';
import { youtubePlatform } from '@/lib/social/YoutubePlatform';

/**
 * Gets metrics for the authenticated user's YouTube account
 */
export async function GET(request: NextRequest) {
  try {
    // Get the raw metrics option and check for database source preference
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('raw') === 'true';
    const debug = searchParams.get('debug') === 'true';
    const source = searchParams.get('source') || 'auto'; // auto, db, api
    
    // First await the cookies() function and then pass it to createRouteHandlerClient
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    // Check if the user is authenticated
    if (!session?.user) {
      logger.error('User not authenticated during metrics call');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the user's YouTube tokens
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('platform', 'youtube')
      .maybeSingle();
    
    if (error) {
      logger.error('Error fetching account: ' + error.message);
      return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
    }
    
    if (!account) {
      logger.warn('No YouTube account found for user');
      return NextResponse.json({ error: 'No YouTube account found' }, { status: 404 });
    }
    
    // If source is 'db', try to get metrics from database first
    if (source === 'db' || source === 'auto') {
      try {
        // Try to get metrics from the database first if not explicitly requesting API
        const dbMetrics = await youtubePlatform.getMetricsFromDatabase(supabase, account.id);
        
        if (dbMetrics) {
          logger.info('Using metrics from database for account ' + account.id);
          
          // Format metrics in the response format
          const metrics = {
            accountInfo: {
              username: account.platform_username,
              displayName: account.metadata?.name || account.platform_username,
              followers: dbMetrics.followers || 0,
              following: dbMetrics.following || 0,
              profileImageUrl: account.metadata?.profile_image_url
            },
            posts: [], // We don't store individual posts in social_metrics
            period: {
              start: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
              end: new Date()
            },
            _source: 'database'
          };
          
          return NextResponse.json(metrics);
        }
      } catch (dbError) {
        logger.warn('Error getting metrics from database: ' + dbError);
        // Continue to API fetch if database fetch fails
      }
      
      // If source is 'db' and we couldn't get metrics from the database, return an error
      if (source === 'db') {
        logger.warn('No metrics found in database for account ' + account.id);
        return NextResponse.json({ 
          error: 'No metrics found in database',
          suggestion: 'Try using source=api or source=auto'
        }, { status: 404 });
      }
    }
    
    // Ensure the tokens are valid
    try {
      // Automatically refresh tokens if needed
      if (youtubePlatform.isTokenExpired(account.expires_at)) {
        logger.info('Refreshing expired YouTube token');
        
        if (!account.refresh_token) {
          logger.error('No refresh token available');
          return NextResponse.json({ error: 'No refresh token available' }, { status: 400 });
        }
        
        const newTokens = await youtubePlatform.refreshTokens(account.refresh_token);
        
        // Update tokens in the database
        const { error: updateError } = await supabase
          .from('social_accounts')
          .update({
            access_token: newTokens.access_token,
            refresh_token: newTokens.refresh_token || account.refresh_token,
            expires_at: newTokens.expires_at?.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);
        
        if (updateError) {
          logger.error('Error updating tokens: ' + updateError.message);
          return NextResponse.json({ error: 'Failed to update tokens' }, { status: 500 });
        }
        
        // Use new access token
        account.access_token = newTokens.access_token;
      }
      
      // Get the YouTube metrics from API
      logger.info('Fetching fresh metrics from YouTube API');
      const metrics = await youtubePlatform.getMetrics({
        access_token: account.access_token,
        refresh_token: account.refresh_token
      }, session.user.id);
      
      // Store the metrics in the database for future use
      try {
        await youtubePlatform.storeMetricsInDatabase(supabase, account.id, metrics);
        
        // Update account metadata with latest info
        if (metrics.accountInfo) {
          const metadata = {
            name: metrics.accountInfo.displayName,
            profile_image_url: metrics.accountInfo.profileImageUrl,
            followers_count: metrics.accountInfo.followers,
            following_count: metrics.accountInfo.following,
            last_metrics_update: new Date().toISOString()
          };
          
          await supabase.rpc('update_social_account_metadata', {
            p_account_id: account.id,
            p_metadata: metadata
          });
        }
      } catch (storeError) {
        logger.error('Error storing metrics in database: ' + storeError);
        // Continue anyway - we'll still return the API metrics
      }
      
      if (raw) {
        return NextResponse.json(metrics);
      }
      
      // Add source info
      const response = { ...metrics, _source: 'api' };
      return NextResponse.json(response);
      
    } catch (error) {
      logger.error('Error getting metrics: ' + error);
      return NextResponse.json({ error: 'Failed to get metrics' }, { status: 500 });
    }
  } catch (error) {
    logger.error('Metrics error: ' + error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 