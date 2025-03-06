import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { twitterPlatform } from '@/lib/social/TwitterPlatform';
import { youtubePlatform } from '@/lib/social/YoutubePlatform';

// This map contains all supported platforms
const platforms = {
  twitter: twitterPlatform,
  youtube: youtubePlatform,
  // Add more platforms here as they're implemented:
  // instagram: instagramPlatform,
  // facebook: facebookPlatform,
  // etc.
};

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  // Create a local copy of params to avoid using the async property directly
  const paramsData = await params;
  const platformName = paramsData.platform;
  
  console.log(`[API] Fetching metrics for platform: ${platformName}`);
  
  // Check for debug mode
  const { searchParams } = new URL(request.url);
  const debug = searchParams.get('debug') === 'true';
  
  try {
    // Check if the platform is supported
    if (!platforms[platformName as keyof typeof platforms]) {
      console.log(`[API] Platform '${platformName}' is not supported`);
      return NextResponse.json(
        { error: `Platform '${platformName}' is not supported` },
        { status: 400 }
      );
    }
    
    const platformInstance = platforms[platformName as keyof typeof platforms];
    console.log(`[API] Using platform instance for ${platformName}`);
    
    // Get the current authenticated user
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      console.log(`[API] No authenticated user found`);
      return NextResponse.json(
        { error: 'User is not authenticated' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log(`[API] Fetching metrics for user: ${userId}`);
    
    // First, let's check if the user has this platform connected
    console.log(`[API] Checking for connected ${platformName} account`);
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platformName);
      
    if (accountsError) {
      console.error(`[API] Error checking for connected accounts:`, accountsError);
      return NextResponse.json(
        { error: `Error checking for connected accounts` },
        { status: 500 }
      );
    }
    
    if (!accounts || accounts.length === 0) {
      console.log(`[API] No ${platformName} account found for user`);
      return NextResponse.json(
        { error: `No ${platformName} account connected` },
        { status: 404 }
      );
    }
    
    console.log(`[API] Found ${platformName} account, getting valid tokens`);
    
    // Get account data for debugging
    if (debug) {
      console.log(`[API] Debug mode active, fetching account details`);
      const account = await platformInstance.getConnectedAccount(userId);
      
      if (!account) {
        return NextResponse.json(
          { 
            error: `No ${platformName} account found in database`,
            debug: true
          },
          { status: 404 }
        );
      }
      
      // Return sanitized account data for debugging (never expose full tokens)
      return NextResponse.json({
        debug: true,
        account: {
          id: account.id,
          platform: account.platform,
          platform_user_id: account.platform_user_id,
          platform_username: account.platform_username,
          has_access_token: !!account.access_token,
          access_token_preview: account.access_token ? `${account.access_token.substring(0, 10)}...` : null,
          has_refresh_token: !!account.refresh_token,
          refresh_token_preview: account.refresh_token ? `${account.refresh_token.substring(0, 10)}...` : null,
          expires_at: account.expires_at,
          expires_at_valid: account.expires_at instanceof Date,
          created_at: account.created_at,
          updated_at: account.updated_at,
          is_token_expired: platformInstance.isTokenExpired(account.expires_at),
        }
      });
    }
    
    // Get valid tokens for the platform - this handles token refresh if needed
    try {
      const tokens = await platformInstance.ensureValidTokens(userId);
      
      if (!tokens) {
        console.log(`[API] No valid tokens found for ${platformName}`);
        return NextResponse.json(
          { 
            error: `No ${platformName} account connected or tokens expired`,
            suggestion: `Try reconnecting your ${platformName} account or use ?debug=true to troubleshoot`
          },
          { status: 404 }
        );
      }
      
      console.log(`[API] Valid tokens found, fetching metrics from ${platformName}`);
      
      // Get metrics from the platform
      try {
        const metrics = await platformInstance.getMetrics(tokens, userId);
        
        // Check if metrics contains expected data
        if (platformName === 'twitter' && metrics?.accountInfo?.followers === 0 && metrics?.posts?.length === 0) {
          console.warn(`[API] Twitter metrics returned with zero values - this might indicate API limitations`);
          
          // Return the data but add a warning that metrics might be incomplete
          return NextResponse.json({
            ...metrics,
            _warning: `The Twitter metrics appear to be incomplete or limited. This could be due to API rate limits, scope limitations, or recently connected accounts.`,
            _source: metrics._cache?.source || 'api'
          });
        }
        
        // Add source information to response
        return NextResponse.json({
          ...metrics,
          _source: metrics._cache?.source || 'api'
        });
      } catch (error) {
        console.error(`[API] Error getting ${platformName} metrics:`, error);
        
        return NextResponse.json(
          { 
            error: `Error fetching ${platformName} metrics`,
            message: error instanceof Error ? error.message : String(error),
            suggestion: `Try reconnecting your ${platformName} account`
          },
          { status: 500 }
        );
      }
    } catch (tokenError: any) {
      console.error(`[API] Error ensuring valid tokens for ${platformName}:`, tokenError);
      return NextResponse.json(
        { error: `Error with ${platformName} authentication: ${tokenError.message}` },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('[API] Error fetching social metrics:', error);
    return NextResponse.json(
      { error: `Failed to fetch metrics: ${error.message}` },
      { status: 500 }
    );
  }
} 