-- Function to store social media metrics
CREATE OR REPLACE FUNCTION store_social_metrics(p_metrics JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id TEXT;
BEGIN
  -- Insert metrics and return the ID
  INSERT INTO social_metrics (
    account_id,
    platform,
    followers,
    engagement_rate,
    total_posts,
    total_views,
    avg_likes,
    avg_comments,
    raw_data,
    captured_at
  ) VALUES (
    p_metrics->>'account_id',
    p_metrics->>'platform',
    (p_metrics->>'followers')::INTEGER,
    (p_metrics->>'engagement_rate')::NUMERIC,
    (p_metrics->>'total_posts')::INTEGER,
    (p_metrics->>'total_views')::INTEGER,
    (p_metrics->>'avg_likes')::NUMERIC,
    (p_metrics->>'avg_comments')::NUMERIC,
    p_metrics->'raw_data',
    COALESCE((p_metrics->>'captured_at')::TIMESTAMP, NOW())
  )
  RETURNING id INTO v_id;
  
  -- Also update the account's last refresh timestamp
  UPDATE social_accounts
  SET last_metrics_refresh = NOW()
  WHERE id = p_metrics->>'account_id';
  
  RETURN v_id;
END;
$$; 