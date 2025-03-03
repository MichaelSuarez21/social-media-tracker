import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
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
    
    // Fetch all connected social accounts for this user
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching social accounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch social accounts' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error in social accounts API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const platform = searchParams.get('platform');
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }
    
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
    
    // Delete the specified social account
    const { error } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', userId)
      .eq('platform', platform);
      
    if (error) {
      console.error(`Error disconnecting ${platform} account:`, error);
      return NextResponse.json(
        { error: `Failed to disconnect ${platform}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in social account disconnect API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 