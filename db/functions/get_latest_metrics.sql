-- Function to get the latest metrics for a social account
CREATE OR REPLACE FUNCTION get_latest_metrics(p_account_id TEXT, p_max_age_days INTEGER DEFAULT 1)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_cutoff_date TIMESTAMP;
BEGIN
  -- Calculate the cutoff date based on p_max_age_days
  v_cutoff_date := NOW() - (p_max_age_days || ' days')::INTERVAL;
  
  -- Get the latest metrics record for the account within the age limit
  SELECT 
    JSONB_BUILD_OBJECT(
      'id', id,
      'account_id', account_id,
      'platform', platform,
      'followers', followers,
      'engagement_rate', engagement_rate,
      'total_posts', total_posts,
      'total_views', total_views,
      'avg_likes', avg_likes,
      'avg_comments', avg_comments,
      'raw_data', raw_data,
      'captured_at', captured_at
    ) INTO v_result
  FROM social_metrics
  WHERE account_id = p_account_id
    AND captured_at >= v_cutoff_date
  ORDER BY captured_at DESC
  LIMIT 1;
  
  -- Return the result (will be NULL if no metrics found)
  RETURN v_result;
END;
$$; 