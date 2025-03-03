-- Create the twitter_accounts table
CREATE TABLE IF NOT EXISTS twitter_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scopes TEXT,
  twitter_user_id TEXT,
  twitter_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS twitter_accounts_user_id_idx ON twitter_accounts(user_id);
CREATE INDEX IF NOT EXISTS twitter_accounts_twitter_user_id_idx ON twitter_accounts(twitter_user_id);

-- Set up RLS (Row Level Security) policies
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;

-- Only allow users to see and modify their own Twitter account data
CREATE POLICY "Users can view their own Twitter accounts"
  ON twitter_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Twitter accounts"
  ON twitter_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Twitter accounts"
  ON twitter_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Allow insert with the same user_id constraint
CREATE POLICY "Users can insert their own Twitter accounts"
  ON twitter_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all accounts (for admin functions)
CREATE POLICY "Service role can manage all Twitter accounts"
  ON twitter_accounts
  USING (auth.role() = 'service_role');

-- Function to clean expired tokens (to be run periodically)
CREATE OR REPLACE FUNCTION clean_expired_twitter_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM twitter_accounts
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the table and columns
COMMENT ON TABLE twitter_accounts IS 'Stores Twitter OAuth tokens for users';
COMMENT ON COLUMN twitter_accounts.user_id IS 'References the user in the auth.users table';
COMMENT ON COLUMN twitter_accounts.access_token IS 'Twitter OAuth access token';
COMMENT ON COLUMN twitter_accounts.refresh_token IS 'Twitter OAuth refresh token for getting new access tokens';
COMMENT ON COLUMN twitter_accounts.expires_at IS 'When the access token expires';
COMMENT ON COLUMN twitter_accounts.scopes IS 'OAuth scopes granted by the user';
COMMENT ON COLUMN twitter_accounts.twitter_user_id IS 'Twitter user ID';
COMMENT ON COLUMN twitter_accounts.twitter_username IS 'Twitter username'; 