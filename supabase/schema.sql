-- =======================================
-- SOCIAL MEDIA TRACKER DATABASE SCHEMA
-- =======================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================================
-- USER PROFILES
-- =======================================

-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =======================================
-- SOCIAL ACCOUNTS
-- =======================================

-- Create a table for connected social accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'youtube', etc.
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_secret TEXT, -- For OAuth 1.0 platforms
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store platform-specific data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each user can only connect one account per platform
  UNIQUE(user_id, platform)
);

-- =======================================
-- SOCIAL METRICS
-- =======================================

-- Create a table for social media metrics
CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  followers INTEGER,
  following INTEGER,
  posts INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  engagement_rate DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(social_account_id, metric_date)
);

-- =======================================
-- INDEXES
-- =======================================

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS social_accounts_platform_user_id_idx ON social_accounts(platform_user_id);

CREATE INDEX IF NOT EXISTS social_metrics_social_account_id_idx ON social_metrics(social_account_id);
CREATE INDEX IF NOT EXISTS social_metrics_metric_date_idx ON social_metrics(metric_date);

-- =======================================
-- ROW LEVEL SECURITY
-- =======================================

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Social Accounts RLS policies
CREATE POLICY "Users can view their own social accounts" 
  ON social_accounts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social accounts" 
  ON social_accounts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts" 
  ON social_accounts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts" 
  ON social_accounts FOR DELETE 
  USING (auth.uid() = user_id);

-- Social Metrics RLS policies
CREATE POLICY "Users can view metrics for their own social accounts" 
  ON social_metrics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE social_accounts.id = social_metrics.social_account_id 
        AND social_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their own social accounts" 
  ON social_metrics FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE social_accounts.id = social_metrics.social_account_id 
        AND social_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for their own social accounts" 
  ON social_metrics FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE social_accounts.id = social_metrics.social_account_id 
        AND social_accounts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete metrics for their own social accounts" 
  ON social_metrics FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE social_accounts.id = social_metrics.social_account_id 
        AND social_accounts.user_id = auth.uid()
    )
  );

-- =======================================
-- FUNCTIONS AND TRIGGERS
-- =======================================

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url, timezone)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'timezone'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to clean expired tokens
CREATE OR REPLACE FUNCTION clean_expired_social_tokens()
RETURNS void AS $$
BEGIN
  -- Remove tokens that expired more than 30 days ago
  -- This helps keep the database clean while allowing for
  -- reasonable time to refresh tokens
  DELETE FROM social_accounts
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- =======================================
-- DOCUMENTATION
-- =======================================

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'Stores user profile information';
COMMENT ON COLUMN profiles.id IS 'Primary key referencing auth.users';
COMMENT ON COLUMN profiles.full_name IS 'User''s full name';
COMMENT ON COLUMN profiles.avatar_url IS 'URL to user''s avatar image';
COMMENT ON COLUMN profiles.timezone IS 'User''s preferred timezone';

COMMENT ON TABLE social_accounts IS 'Stores social media accounts connected by users';
COMMENT ON COLUMN social_accounts.platform IS 'The social media platform (twitter, youtube, etc.)';
COMMENT ON COLUMN social_accounts.platform_user_id IS 'The user ID from the platform';
COMMENT ON COLUMN social_accounts.platform_username IS 'The username on the platform';
COMMENT ON COLUMN social_accounts.access_token IS 'OAuth access token';
COMMENT ON COLUMN social_accounts.refresh_token IS 'OAuth refresh token';
COMMENT ON COLUMN social_accounts.token_secret IS 'Token secret for OAuth 1.0';
COMMENT ON COLUMN social_accounts.expires_at IS 'When the access token expires';
COMMENT ON COLUMN social_accounts.scopes IS 'OAuth scopes granted by the user';
COMMENT ON COLUMN social_accounts.metadata IS 'JSON field for platform-specific data that doesn''t fit in standard columns';

COMMENT ON TABLE social_metrics IS 'Stores daily social media metrics for connected accounts';
COMMENT ON COLUMN social_metrics.social_account_id IS 'Foreign key to social_accounts';
COMMENT ON COLUMN social_metrics.metric_date IS 'Date the metrics were collected';
COMMENT ON COLUMN social_metrics.followers IS 'Number of followers/subscribers';
COMMENT ON COLUMN social_metrics.following IS 'Number of accounts being followed';
COMMENT ON COLUMN social_metrics.posts IS 'Total number of posts/videos';
COMMENT ON COLUMN social_metrics.views IS 'Total views across content';
COMMENT ON COLUMN social_metrics.likes IS 'Total likes across content';
COMMENT ON COLUMN social_metrics.comments IS 'Total comments across content';
COMMENT ON COLUMN social_metrics.shares IS 'Total shares/retweets across content';
COMMENT ON COLUMN social_metrics.engagement_rate IS 'Calculated engagement rate percentage';