# Twitter API Integration

This guide explains how to set up Twitter API integration for the Social Media Tracker app.

## Prerequisites

- A Twitter Developer Account
- A Twitter Project and App with OAuth 2.0 enabled
- Supabase project with the required database tables

## Setup Steps

### 1. Create a Twitter Developer Account and App

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new Project and App
3. Enable OAuth 2.0 and set up User Authentication
4. Add the following scopes:
   - `tweet.read`
   - `tweet.write`
   - `users.read`
   - `offline.access`
   - `tweet.metrics`
5. Set the OAuth 2.0 Redirect URL to: `http://localhost:3000/api/social/twitter/callback` (for development) or your production URL
6. Note your Client ID and Client Secret

### 2. Create the Social Accounts Table in Supabase

Run the SQL script from `supabase/social_accounts.sql` in your Supabase SQL Editor.

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=http://localhost:3000/api/social/twitter/callback
```

Replace the placeholder values with your actual Twitter API credentials.

## How It Works

Our social media integration follows a scalable architecture:

1. **Platform Class Structure**:
   - `BasePlatform` - Abstract class with common functionality for all platforms
   - `TwitterPlatform` - Twitter-specific implementation

2. **Database Storage**:
   - We use a single `social_accounts` table that stores tokens for all platforms
   - Each record is linked to a user and contains platform-specific tokens and data

3. **API Routes**:
   - Common API structure follows the pattern `/api/social/[platform]/[action]`
   - Platform-agnostic APIs handle login, callback, metrics, and account management

4. **Connection Flow**:
   - User clicks "Connect Twitter" in the accounts section
   - They're redirected to Twitter's OAuth page to authorize access
   - Twitter redirects back with an authorization code
   - We exchange the code for access and refresh tokens
   - Tokens are securely stored in the Supabase database

5. **Metrics Access**:
   - When viewing Twitter metrics, we use stored tokens to access the Twitter API
   - If tokens are expired, we automatically refresh them
   - Metrics are displayed in a consistent format across all platforms

## API Routes

- **`/api/social/twitter/login`**: Initiates the Twitter OAuth flow
- **`/api/social/twitter/callback`**: Handles the OAuth callback and token exchange
- **`/api/social/twitter/metrics`**: Fetches Twitter metrics for the authenticated user
- **`/api/social/accounts`**: Lists all connected social accounts for the current user

## Components

- **`SocialMetrics`**: Generic component for displaying metrics from any platform

## Troubleshooting

- **Invalid Redirect URI**: Ensure your redirect URI in the Twitter Developer Portal exactly matches the one in your env variables
- **Scope Issues**: If you can't access certain metrics, check that you've added all required scopes
- **Token Expiry**: Twitter access tokens expire. The app handles automatic refresh using refresh tokens

## Security Considerations

- Access tokens are stored securely in the database with Row Level Security
- Each user can only access their own social media tokens
- All API requests are authenticated
- Cookies use HttpOnly flag and are secure in production

## Adding New Platforms

Our architecture is designed to make adding new platforms easy. See the guide in `docs/ADDING_NEW_PLATFORMS.md` for details on how to add support for additional social media platforms 