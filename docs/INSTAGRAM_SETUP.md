# Instagram Integration Setup Guide

This guide will walk you through the process of setting up Instagram integration for your Social Media Tracker application.

## Prerequisites

Before you begin, you'll need:

1. An Instagram Professional account (Business or Creator)
2. A Facebook page connected to your Instagram Professional account
3. A Meta for Developers account

## Step 1: Create a Meta Developer Account

1. Visit [Meta for Developers](https://developers.facebook.com/) and sign up for an account if you don't already have one.
2. Verify your account by following the prompts.

## Step 2: Create a Meta App

1. Go to the [Meta Developer Dashboard](https://developers.facebook.com/apps/).
2. Click "Create App".
3. Select "Business" as the app type.
4. Fill in your app name and contact email.
5. Complete the app creation process.

## Step 3: Set Up Instagram Basic Display API

1. In your app dashboard, locate the "Add Products" section.
2. Find "Instagram Basic Display" and click "Set Up".
3. Configure your app settings:
   - App Display Name: The name users will see when authorizing your app.
   - App Website URL: Your application's website URL.
   - Deauthorize Callback URL: A URL that will be pinged when a user removes your app.
   - Data Deletion Request URL: A URL that will be pinged when a user requests data deletion.

4. Add Valid OAuth Redirect URIs:
   - Add your callback URL: `https://yourdomain.com/api/social/instagram/callback`
   - For local development, add: `http://localhost:3000/api/social/instagram/callback`

## Step 4: Configure User Token Generator

1. In the Instagram Basic Display settings, go to the "User Token Generator" section.
2. Add your Instagram account as a test user.
3. Click "Add Instagram Tester" and follow the prompts to send a test invitation.
4. Accept the test invitation by logging into the Instagram account you want to use.

## Step 5: Configure Your Environment Variables

Add the following environment variables to your `.env` file:

```
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/api/social/instagram/callback
```

For local development, use:

```
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/social/instagram/callback
```

## Step 6: Test Your Integration

1. Start your application.
2. Go to the Accounts page.
3. Click on "Connect Instagram Account".
4. You should be redirected to Instagram's authorization page.
5. After authorizing, you'll be redirected back to your application.
6. Check the dashboard to see your Instagram metrics.

## Understanding the Instagram API Limitations

Instagram Basic Display API has some limitations:

1. You can only access basic profile information and media items.
2. Follower count, engagement metrics, and detailed insights are not available.
3. For more advanced metrics, you would need to use the Instagram Graph API, which requires a Facebook page connection.

## Troubleshooting

### Common Issues

1. **Authorization Error**: Make sure your redirect URIs match exactly what's configured in your app settings.
2. **Invalid Client ID**: Ensure that your INSTAGRAM_CLIENT_ID environment variable is set correctly.
3. **Invalid Redirect URI**: Check that the redirect URI is correctly listed in your app settings.
4. **Rate Limiting**: Instagram has rate limits that may temporarily block requests if exceeded.

### Getting Help

If you're experiencing issues with your Instagram integration, check the following resources:

1. [Meta for Developers Documentation](https://developers.facebook.com/docs/instagram-basic-display-api/)
2. [Instagram Basic Display API Documentation](https://developers.facebook.com/docs/instagram-basic-display-api/)
3. [Instagram Developer Community](https://developers.facebook.com/community/) 