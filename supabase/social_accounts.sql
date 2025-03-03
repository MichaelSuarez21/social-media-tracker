-- Create a general social_accounts table for all platforms
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'twitter', 'instagram', etc.
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_secret TEXT, -- For OAuth 1.0 platforms
  expires_at TIMESTAMPTZ,
  scopes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Store platform-specific data
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Each user can only connect one account per platform
  UNIQUE(user_id, platform)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS social_accounts_user_id_idx ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS social_accounts_platform_idx ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS social_accounts_platform_user_id_idx ON social_accounts(platform_user_id);

-- Add RLS policies for security
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own accounts
CREATE POLICY "Users can view their own social accounts"
  ON social_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own accounts
CREATE POLICY "Users can insert their own social accounts"
  ON social_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own accounts
CREATE POLICY "Users can update their own social accounts"
  ON social_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own accounts
CREATE POLICY "Users can delete their own social accounts"
  ON social_accounts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to clean expired tokens
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

-- Add comments for documentation
COMMENT ON TABLE social_accounts IS 'Stores social media accounts connected by users';
COMMENT ON COLUMN social_accounts.platform IS 'The social media platform (twitter, instagram, etc.)';
COMMENT ON COLUMN social_accounts.platform_user_id IS 'The user ID from the platform';
COMMENT ON COLUMN social_accounts.platform_username IS 'The username on the platform';
COMMENT ON COLUMN social_accounts.metadata IS 'JSON field for platform-specific data that doesn''t fit in the standard columns';
COMMENT ON COLUMN social_accounts.scopes IS 'OAuth scopes granted by the user'; 