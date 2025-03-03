-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for social media platforms
CREATE TABLE IF NOT EXISTS platforms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  auth_type TEXT NOT NULL DEFAULT 'oauth2',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for connected social accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  platform_id INTEGER REFERENCES platforms ON DELETE CASCADE NOT NULL,
  platform_user_id TEXT,
  username TEXT,
  display_name TEXT,
  profile_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform_id)
);

-- Create a table for social metrics
CREATE TABLE IF NOT EXISTS social_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id UUID REFERENCES social_accounts ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  followers INTEGER,
  following INTEGER,
  posts INTEGER,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  engagement_rate DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(social_account_id, metric_date)
);

-- Initialize platforms
INSERT INTO platforms (name, slug, icon, auth_type) VALUES
('Twitter', 'twitter', 'twitter', 'oauth2'),
('Instagram', 'instagram', 'instagram', 'oauth2'),
('YouTube', 'youtube', 'youtube', 'oauth2'),
('Facebook', 'facebook', 'facebook', 'oauth2'),
('TikTok', 'tiktok', 'tiktok', 'oauth2'),
('Pinterest', 'pinterest', 'pinterest', 'oauth2'),
('Twitch', 'twitch', 'twitch', 'oauth2'),
('BlueSky', 'bluesky', 'bluesky', 'oauth2')
ON CONFLICT (slug) DO NOTHING;

-- Set up row level security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
-- Users can only access their own profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Users can only access their own social accounts
CREATE POLICY "Users can view their own social accounts" 
  ON social_accounts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own social accounts" 
  ON social_accounts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social accounts" 
  ON social_accounts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social accounts" 
  ON social_accounts FOR DELETE 
  USING (auth.uid() = user_id);

-- Users can only access metrics for their own social accounts
CREATE POLICY "Users can view metrics for their own social accounts" 
  ON social_metrics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM social_accounts 
      WHERE social_accounts.id = social_metrics.social_account_id 
        AND social_accounts.user_id = auth.uid()
    )
  );

-- Function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 