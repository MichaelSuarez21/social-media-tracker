-- =======================================
-- SOCIAL METRICS STORAGE AND RETRIEVAL FUNCTIONS
-- =======================================

-- Function to insert or update metrics data
CREATE OR REPLACE FUNCTION store_social_metrics(
  p_social_account_id UUID,
  p_followers INTEGER,
  p_following INTEGER DEFAULT 0,
  p_posts INTEGER DEFAULT 0,
  p_views INTEGER DEFAULT 0, 
  p_likes INTEGER DEFAULT 0,
  p_comments INTEGER DEFAULT 0,
  p_shares INTEGER DEFAULT 0,
  p_engagement_rate DECIMAL DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  today DATE := CURRENT_DATE;
  v_metrics_id UUID;
  v_calculated_engagement DECIMAL;
BEGIN
  -- Calculate engagement rate if not provided and we have views
  IF p_engagement_rate IS NULL AND p_views > 0 THEN
    v_calculated_engagement := ((p_likes + p_comments + p_shares)::DECIMAL / p_views) * 100;
  ELSE
    v_calculated_engagement := p_engagement_rate;
  END IF;

  -- Check if we already have metrics for this account today
  SELECT id INTO v_metrics_id
  FROM social_metrics
  WHERE social_account_id = p_social_account_id
    AND metric_date = today;
  
  IF v_metrics_id IS NOT NULL THEN
    -- Update existing record
    UPDATE social_metrics
    SET 
      followers = p_followers,
      following = p_following,
      posts = p_posts,
      views = p_views,
      likes = p_likes,
      comments = p_comments,
      shares = p_shares,
      engagement_rate = v_calculated_engagement,
      created_at = NOW()
    WHERE id = v_metrics_id;
  ELSE
    -- Insert new record
    INSERT INTO social_metrics (
      social_account_id,
      metric_date,
      followers,
      following,
      posts,
      views,
      likes,
      comments,
      shares,
      engagement_rate
    ) VALUES (
      p_social_account_id,
      today,
      p_followers,
      p_following,
      p_posts,
      p_views,
      p_likes,
      p_comments,
      p_shares,
      v_calculated_engagement
    );
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error storing metrics: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get the latest metrics for an account
CREATE OR REPLACE FUNCTION get_latest_metrics(
  p_social_account_id UUID,
  p_max_age_days INTEGER DEFAULT 1
) RETURNS SETOF social_metrics AS $$
DECLARE
  oldest_date DATE := CURRENT_DATE - p_max_age_days;
BEGIN
  RETURN QUERY
  SELECT *
  FROM social_metrics
  WHERE social_account_id = p_social_account_id
    AND metric_date >= oldest_date
  ORDER BY metric_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update an account's metadata
CREATE OR REPLACE FUNCTION update_social_account_metadata(
  p_account_id UUID,
  p_metadata JSONB
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE social_accounts
  SET 
    metadata = CASE 
      WHEN metadata IS NULL THEN p_metadata
      ELSE metadata || p_metadata
    END,
    updated_at = NOW()
  WHERE id = p_account_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating account metadata: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create API for metrics storage and retrieval
COMMENT ON FUNCTION store_social_metrics IS 'Stores or updates social metrics for a given account';
COMMENT ON FUNCTION get_latest_metrics IS 'Gets the latest metrics for a social account within the specified number of days';
COMMENT ON FUNCTION update_social_account_metadata IS 'Updates the metadata for a social account, merging with existing data'; 