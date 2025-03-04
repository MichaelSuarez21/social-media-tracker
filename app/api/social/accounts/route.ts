import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import logger from '@/lib/logger';
import { TwitterPlatform } from '@/lib/social/TwitterPlatform';

// Map of supported platforms 
const platforms = {
  twitter: new TwitterPlatform()
};

export async function GET(request: NextRequest) {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const includeStatus = searchParams.get('includeStatus') === 'true';

  try {
    // Create a Supabase client with the cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Get the authenticated user's session
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the user's connected social accounts
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      logger.error('api', 'Error fetching social accounts', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // If status check is requested, check each account's token status
    let accountsWithStatus = accounts;

    if (includeStatus && accounts.length > 0) {
      accountsWithStatus = await Promise.all(accounts.map(async (account) => {
        // Only process platforms we support
        if (!platforms[account.platform as keyof typeof platforms]) {
          return {
            ...account,
            status: 'connected' // Default to connected for unsupported platforms
          };
        }

        try {
          const platform = platforms[account.platform as keyof typeof platforms];
          const tokenStatus = await platform.checkTokenStatus(account);

          return {
            ...account,
            status: tokenStatus
          };
        } catch (error) {
          logger.error('api', `Error checking token status for ${account.platform}`, error);
          return {
            ...account,
            status: 'error'
          };
        }
      }));
    }

    // Transform the accounts to the expected format
    const formattedAccounts = accountsWithStatus.map(account => ({
      id: account.id,
      platform: account.platform,
      platformUserId: account.platform_user_id,
      status: account.status || 'connected',
      lastUpdated: account.updated_at
    }));

    return NextResponse.json({ accounts: formattedAccounts });
  } catch (error) {
    logger.error('api', 'Error in accounts API', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Parse the request body to get the platform to disconnect
    const body = await request.json();
    const { platform } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Create a Supabase client with the cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Get the authenticated user's session
    const { data: { session } } = await supabase.auth.getSession();

    // Check if the user is authenticated
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the social account
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', session.user.id)
      .eq('platform', platform);

    if (error) {
      logger.error('api', `Error deleting ${platform} account`, error);
      return NextResponse.json({ error: 'Failed to disconnect account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api', 'Error in DELETE accounts API', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 