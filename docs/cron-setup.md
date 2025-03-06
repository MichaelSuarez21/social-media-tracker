# Setting Up Metrics Refresh Cron Job

This guide explains how to setup the automated metrics refresh cron job for the Social Media Tracker application.

## How it Works

The metrics refresh system works as follows:

1. A cron job regularly calls the `/api/cron/refresh-metrics` endpoint
2. The endpoint fetches all connected social accounts
3. For each account:
   - Checks if tokens need refreshing
   - Fetches fresh metrics from the respective platform APIs
   - Stores metrics in the `social_metrics` table
   - Updates account metadata

This ensures we have fresh metrics data without requiring user interaction, and it reduces API calls when users view the dashboard.

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended)

[Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) allow you to set up scheduled functions that run at specified intervals.

1. Create a `vercel.json` file in the root of your project:

```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-metrics?key=$METRICS_REFRESH_API_KEY",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This sets up a cron job that runs every 6 hours (at minute 0).

2. Configure environment variables in Vercel:
   - Go to your project settings in Vercel
   - Navigate to the "Environment Variables" section
   - Add a new environment variable called `METRICS_REFRESH_API_KEY` with a secure random string value
   - Make sure `SUPABASE_SERVICE_ROLE_KEY` is also set

3. Deploy your application. The cron job will be automatically set up.

### Option 2: External Cron Service

You can use an external service to trigger the endpoint:

1. Set up a service such as [Pipedream](https://pipedream.com/) or [Cronhooks](https://cronhooks.io/)
2. Configure a scheduled HTTP request to:
   ```
   https://yourdomain.com/api/cron/refresh-metrics?key=YOUR_API_KEY
   ```
   
3. Set the schedule as needed (we recommend every 6-12 hours)

### Option 3: GitHub Actions

You can use GitHub Actions to create a cron job:

1. Create a file `.github/workflows/cron.yml`:

```yaml
name: Metrics Refresh

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Allow manual triggers

jobs:
  refresh-metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger metrics refresh
        run: |
          curl -X GET "https://yourdomain.com/api/cron/refresh-metrics?key=${{ secrets.METRICS_REFRESH_API_KEY }}"
```

2. Add the `METRICS_REFRESH_API_KEY` to your GitHub repository secrets.

## Security Considerations

- The API key should be a long, random string
- Keep the API key secret and never expose it in client-side code
- The API endpoint is protected by the middleware to ensure only authorized requests are processed
- The service role key is used to access all users' data, so it's important to keep it secure

## Monitoring

You can monitor the scheduled jobs:

- In Vercel, go to the "Cron Jobs" section of your project
- Check application logs for entries with the `[cron]` prefix
- Monitor the database size growth over time

## Troubleshooting

If the cron job isn't working:

1. Check that the environment variables are set correctly
2. Verify the cron syntax is correct
3. Look for error logs in your Vercel dashboard
4. Try manually triggering the endpoint with the API key to see if it works 