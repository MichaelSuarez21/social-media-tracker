-- Migration script for social_metrics table and related functions

-- Create social_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_likes NUMERIC DEFAULT 0,
  avg_comments NUMERIC DEFAULT 0,
  raw_data JSONB,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_social_metrics_account_id ON social_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_captured_at ON social_metrics(captured_at);
CREATE INDEX IF NOT EXISTS idx_social_metrics_account_platform ON social_metrics(account_id, platform);

-- Add last_metrics_refresh column to social_accounts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'social_accounts' AND column_name = 'last_metrics_refresh'
  ) THEN
    ALTER TABLE social_accounts ADD COLUMN last_metrics_refresh TIMESTAMP WITH TIME ZONE;
  END IF;
END $$; 