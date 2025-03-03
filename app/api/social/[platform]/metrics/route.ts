import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { twitterPlatform } from '@/lib/social/TwitterPlatform';

// This map contains all supported platforms
const platforms = {
  twitter: twitterPlatform,
  // Add more platforms here as they're implemented:
  // instagram: instagramPlatform,
  // facebook: facebookPlatform,
  // etc.
};

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { platform } = params;
    
    // Check if the platform is supported
    if (!platforms[platform as keyof typeof platforms]) {
      return NextResponse.json(
        { error: `Platform '${platform}' is not supported` },
        { status: 400 }
      );
    }
    
    const platformInstance = platforms[platform as keyof typeof platforms];
    
    // Get the current authenticated user
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User is not authenticated' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get valid tokens for the platform - this handles token refresh if needed
    const tokens = await platformInstance.ensureValidTokens(userId);
    
    if (!tokens) {
      return NextResponse.json(
        { error: `No ${platform} account connected or tokens expired` },
        { status: 404 }
      );
    }
    
    // Get metrics from the platform
    const metrics = await platformInstance.getMetrics(tokens);
    
    // Return the metrics
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching social metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
} 