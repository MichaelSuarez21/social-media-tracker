import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Stores Twitter tokens for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current authenticated user
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.tokens || !body.tokens.access_token) {
      return NextResponse.json(
        { error: 'Missing required token data' },
        { status: 400 }
      );
    }

    // Store the tokens in the database
    const { error } = await supabase
      .from('twitter_accounts')
      .upsert({
        user_id: session.user.id,
        access_token: body.tokens.access_token,
        refresh_token: body.tokens.refresh_token || null,
        expires_at: new Date(body.tokens.expires_at).toISOString(),
        scopes: body.tokens.scope || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      
    if (error) {
      console.error('Database error storing Twitter tokens:', error);
      return NextResponse.json(
        { error: 'Failed to store Twitter tokens' },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing Twitter tokens:', error);
    return NextResponse.json(
      { error: 'Failed to store Twitter tokens' },
      { status: 500 }
    );
  }
}

/**
 * Gets the authenticated user ID from the session
 */
async function getAuthenticatedUserId() {
  // This is a placeholder - implement your session validation logic
  // Example: const session = await getSession();
  // return session?.user?.id;
  
  // For now, let's mock a user ID
  return 'mock-user-id';
} 