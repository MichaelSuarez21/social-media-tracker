# Database Setup and Migrations

This directory contains SQL files for setting up the database schema and functions for the Social Media Tracker application.

## Directory Structure

- `migrations/`: Contains SQL scripts for schema changes
- `functions/`: Contains SQL functions for metrics operations

## Running Migrations

### Option 1: Using Supabase UI

You can run these SQL scripts directly in the Supabase SQL Editor:

1. Log in to your Supabase dashboard
2. Select your project
3. Go to the SQL Editor
4. Create a new query
5. Copy and paste the content of the SQL file you want to run
6. Click "Run" to execute the SQL

Run the migrations in this order:

1. `migrations/01_create_social_metrics_table.sql`
2. `functions/store_social_metrics.sql`
3. `functions/get_latest_metrics.sql`
4. `functions/update_social_account_metadata.sql`

### Option 2: Using the Supabase CLI

If you have the Supabase CLI installed:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Run a migration
supabase db push -f db/migrations/01_create_social_metrics_table.sql

# Or run a function
supabase db push -f db/functions/store_social_metrics.sql
```

## Checking Migration Status

After running migrations, you can verify that the tables and functions exist:

```sql
-- Check if the social_metrics table exists
SELECT * FROM information_schema.tables WHERE table_name = 'social_metrics';

-- Check if the functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('store_social_metrics', 'get_latest_metrics', 'update_social_account_metadata');
```

## Database Schema

### social_metrics table

This table stores metrics for social media accounts:

- `id`: Unique identifier for the metrics record
- `account_id`: Foreign key to the social_accounts table
- `platform`: The social media platform (e.g., 'youtube')
- `followers`: Number of followers/subscribers
- `engagement_rate`: Calculated engagement rate as a percentage
- `total_posts`: Total number of posts/videos
- `total_views`: Total view count
- `avg_likes`: Average likes per post
- `avg_comments`: Average comments per post
- `raw_data`: JSON data containing the full metrics
- `captured_at`: When the metrics were captured
- `created_at`: When the record was created

## Database Functions

### store_social_metrics

Stores metrics for a social account.

Parameters:
- `p_metrics`: JSONB object containing metrics data

Returns: ID of the stored metrics record

### get_latest_metrics

Gets the most recent metrics for a social account.

Parameters:
- `p_account_id`: Social account ID
- `p_max_age_days`: Maximum age in days (default: 1)

Returns: JSONB object with metrics data

### update_social_account_metadata

Updates metadata for a social account.

Parameters:
- `p_account_id`: Social account ID
- `p_metadata`: JSONB object with metadata fields

Returns: Boolean indicating success 