# Adding New Social Media Platforms

This guide explains how to add support for new social media platforms to the application.

## Overview

Our application is designed with a scalable architecture that makes it easy to add new social media platforms. The key components are:

1. **Platform Class Implementation** - Create a platform-specific class implementing the `BasePlatform` abstract class
2. **Database Storage** - Use the common `social_accounts` table for token storage
3. **API Integration** - The common API routes handle login, callback, metrics, and account management
4. **UI Components** - Generic UI components adapt to display any platform's data

## Step-by-Step Guide

### 1. Create a Platform Implementation

Create a new file `lib/social/[PlatformName]Platform.ts` that extends the `BasePlatform` class:

```typescript
import { BasePlatform, SocialTokens, SocialMetrics } from './BasePlatform';

export class PlatformNamePlatform extends BasePlatform {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  constructor() {
    super('platform_name');  // Use a lowercase, unique identifier
    this.clientId = process.env.PLATFORM_NAME_CLIENT_ID || '';
    this.clientSecret = process.env.PLATFORM_NAME_CLIENT_SECRET || '';
    this.redirectUri = process.env.PLATFORM_NAME_REDIRECT_URI || '';
  }
  
  // Implement all required methods from BasePlatform
  getAuthUrl(): string {
    // Return the platform's auth URL or identifier
    return 'https://platform-auth-url.com/authorize';
  }
  
  async exchangeCodeForTokens(code: string): Promise<SocialTokens> {
    // Implement platform-specific OAuth token exchange
    // ...
    
    return {
      access_token: 'token',
      refresh_token: 'refresh_token',
      expires_at: new Date(Date.now() + 3600 * 1000),
      scopes: 'read write',
    };
  }
  
  async refreshTokens(refreshToken: string): Promise<SocialTokens> {
    // Implement platform-specific token refresh
    // ...
    
    return {
      access_token: 'new_token',
      refresh_token: 'new_refresh_token',
      expires_at: new Date(Date.now() + 3600 * 1000),
      scopes: 'read write',
    };
  }
  
  async getMetrics(tokens: SocialTokens): Promise<SocialMetrics> {
    // Implement platform-specific metrics fetching
    // ...
    
    return {
      accountInfo: {
        username: 'username',
        displayName: 'Display Name',
        followers: 1000,
        following: 500,
        profileImageUrl: 'https://example.com/profile.jpg',
      },
      posts: [
        {
          id: 'post1',
          text: 'Post content',
          createdAt: new Date(),
          metrics: {
            likes: 10,
            shares: 5,
            comments: 3,
            // Add platform-specific metrics
          },
        },
      ],
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    };
  }
}

// Export a singleton instance
export const platformNamePlatform = new PlatformNamePlatform();
```

### 2. Add Environment Variables

Add the required environment variables to `.env.local`:

```
PLATFORM_NAME_CLIENT_ID=your_client_id
PLATFORM_NAME_CLIENT_SECRET=your_client_secret
PLATFORM_NAME_REDIRECT_URI=http://localhost:3000/api/social/platform_name/callback
```

### 3. Register the Platform in API Routes

Update the platforms registry in each API route (`login`, `callback`, `metrics`):

```typescript
// In app/api/social/[platform]/login/route.ts (and other route files)
import { platformNamePlatform } from '@/lib/social/PlatformNamePlatform';

// Update the platforms registry
const platforms = {
  twitter: twitterPlatform,
  platform_name: platformNamePlatform,
  // ...other platforms
};
```

### 4. Add Platform-Specific Callback Logic (if needed)

If your platform has unique authentication requirements, add a platform-specific section in the callback route:

```typescript
// In app/api/social/[platform]/callback/route.ts
if (platform === 'platform_name') {
  // Handle platform-specific token exchange and user data fetching
  // ...
}
```

### 5. Update UI Components

Add the platform to the UI components:

```typescript
// In app/(authenticated)/accounts/connect/page.tsx
const platforms: SocialPlatform[] = [
  // ...existing platforms
  { 
    id: 'platform_name', 
    name: 'Platform Name', 
    icon: <PlatformIcon className="text-2xl" />, 
    color: 'border-indigo-500 bg-indigo-900/20', 
    available: true  // Set to true when ready
  },
];

// In components/SocialMetrics.tsx and other UI components
// Update the PlatformIcons and PlatformColors objects
```

### 6. Testing Your Integration

1. **Create a Developer Account** with the social media platform
2. **Register an App** and configure OAuth settings
3. **Set Environment Variables** with your app credentials
4. **Test the Full Flow** from connection to viewing metrics

## Special Considerations

### OAuth Versions

Different platforms may use different OAuth versions (1.0a, 2.0, etc.). The `BasePlatform` class is designed to be flexible, but you may need to adapt it for specific OAuth flows.

### Rate Limiting

Be mindful of rate limits imposed by the platform's API. Implement appropriate caching and throttling to avoid hitting limits.

### API Versions

Document which API version your implementation uses, and consider how API changes might affect the integration.

## Example: Instagram Implementation

For an example of how to add Instagram, see the detailed walkthrough in `docs/INSTAGRAM_INTEGRATION_EXAMPLE.md`. 