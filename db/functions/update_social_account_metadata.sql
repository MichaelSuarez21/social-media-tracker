-- Function to update social account metadata
CREATE OR REPLACE FUNCTION update_social_account_metadata(p_account_id TEXT, p_metadata JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updates TEXT := '';
  v_username TEXT := p_metadata->>'username';
  v_avatar_url TEXT := p_metadata->>'avatar_url';
  v_last_refresh TEXT := p_metadata->>'last_metrics_refresh';
BEGIN
  -- Build the update fields dynamically based on what's provided
  IF v_username IS NOT NULL THEN
    v_updates := v_updates || 'username = ' || quote_literal(v_username) || ', ';
  END IF;
  
  IF v_avatar_url IS NOT NULL THEN
    v_updates := v_updates || 'avatar_url = ' || quote_literal(v_avatar_url) || ', ';
  END IF;
  
  IF v_last_refresh IS NOT NULL THEN
    v_updates := v_updates || 'last_metrics_refresh = ' || quote_literal(v_last_refresh) || ', ';
  END IF;
  
  -- If nothing to update, return true
  IF v_updates = '' THEN
    RETURN TRUE;
  END IF;
  
  -- Remove trailing comma and space
  v_updates := LEFT(v_updates, LENGTH(v_updates) - 2);
  
  -- Perform the update
  EXECUTE 'UPDATE social_accounts SET ' || v_updates || 
          ', updated_at = NOW() WHERE id = ' || quote_literal(p_account_id);
  
  -- Check if the update affected any rows
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$; 