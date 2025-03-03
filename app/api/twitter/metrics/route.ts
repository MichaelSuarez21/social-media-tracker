import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Fetches Twitter metrics for a user's tweets
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current authenticated user from Supabase
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get stored Twitter tokens for the user
    const { data: tokenData, error: tokenError } = await supabase
      .from('twitter_accounts')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
      
    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'No Twitter account connected' },
        { status: 404 }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (expiresAt < Date.now()) {
      try {
        // Token is expired, attempt to refresh
        if (tokenData.refresh_token) {
          // Implement token refresh logic here in a real app
          // const refreshedTokens = await refreshTwitterToken(tokenData.refresh_token);
        }
        
        return NextResponse.json(
          { error: 'Twitter token expired. Please reconnect your account.' },
          { status: 401 }
        );
      } catch (error) {
        console.error('Error refreshing Twitter token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh Twitter token. Please reconnect your account.' },
          { status: 401 }
        );
      }
    }

    // Fetch the user's Twitter ID first
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('Twitter API user fetch failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch Twitter user data' },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();
    const twitterId = userData.data.id;

    // Fetch the user's tweets with metrics
    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${twitterId}/tweets?tweet.fields=public_metrics,non_public_metrics,organic_metrics,promoted_metrics,created_at&max_results=10`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!tweetsResponse.ok) {
      const errorData = await tweetsResponse.json();
      console.error('Twitter API tweets fetch failed:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch Twitter metrics' },
        { status: 500 }
      );
    }

    const tweetsData = await tweetsResponse.json();
    return NextResponse.json(tweetsData);
  } catch (error) {
    console.error('Error fetching Twitter metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Twitter metrics' },
      { status: 500 }
    );
  }
} 