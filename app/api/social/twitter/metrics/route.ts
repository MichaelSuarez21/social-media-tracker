import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TwitterPlatform } from '@/lib/social/TwitterPlatform';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TwitterUser {
  username?: string;
  name?: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  impressions?: number;
  retweets?: number;
  replies?: number;
  likes?: number;
  quotes?: number;
  engagements?: number;
  profileVisits?: number;
  linkClicks?: number;
  mediaViews?: number;
  mediaEngagements?: number;
  detailExpands?: number;
  userProfileClicks?: number;
}

interface TwitterMetricsResponse {
  user?: TwitterUser;
  tweets?: TwitterTweet[];
  error?: string;
  statusCode?: number;
  fromCache?: boolean;
  cachedAt?: string;
  cacheAge?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: string;
  accountInfo?: {
    username: string;
    displayName: string;
    followers: number;
    following: number;
    profileImageUrl?: string;
  };
  posts?: any[];
  period?: {
    start: Date;
    end: Date;
  };
  _cache?: {
    fromCache: boolean;
    timestamp: number;
    expired?: boolean;
    error?: boolean;
  };
}

interface TwitterAccount {
  user_id: string;
  platform: string;
  provider_user_id: string;
  username: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get('timeframe') || '30'; // Default to 30 days
  const days = parseInt(timeframe, 10);
  
  if (isNaN(days) || days <= 0 || days > 90) {
    return NextResponse.json(
      { error: 'Invalid timeframe. Must be between 1 and 90 days.' },
      { status: 400 }
    );
  }

  try {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get Twitter account data for this user
    const { data: twitterAccount, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitter')
      .single();
    
    if (accountError || !twitterAccount) {
      logger.error('twitter', `Twitter account not found for user: ${userId}`);
      return NextResponse.json(
        { error: 'Twitter account not connected' },
        { status: 404 }
      );
    }
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Initialize TwitterPlatform
    const twitter = new TwitterPlatform();
    
    // Get metrics using the TwitterPlatform class
    const metrics = await twitter.getMetrics({
      access_token: twitterAccount.access_token,
      refresh_token: twitterAccount.refresh_token,
      expires_at: new Date(twitterAccount.expires_at)
    }, twitterAccount.provider_user_id);
    
    if (!metrics || metrics._cache?.error) {
      logger.error('twitter', `Failed to fetch Twitter metrics for user: ${userId}`);
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch Twitter metrics',
          cacheInfo: metrics?._cache
        },
        { status: 500 }
      );
    }
    
    // Format response data
    const response = {
      accountInfo: {
        username: metrics.accountInfo?.username || twitterAccount.username,
        displayName: metrics.accountInfo?.displayName,
        followers: metrics.accountInfo?.followers,
        following: metrics.accountInfo?.following,
        profileImageUrl: metrics.accountInfo?.profileImageUrl,
      },
      posts: metrics.posts?.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.createdAt,
        metrics: tweet.metrics || {}
      })) || [],
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      cacheInfo: {
        fromCache: metrics._cache?.fromCache || false,
        cachedAt: metrics._cache?.timestamp,
        cacheAge: metrics._cache?.timestamp ? Date.now() - metrics._cache.timestamp : 0
      }
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('twitter', `Error in Twitter metrics API: ${error.message || 'Unknown error'}`);
    return NextResponse.json(
      { error: 'Failed to retrieve Twitter metrics' },
      { status: 500 }
    );
  }
} 