-- Create functions to support sermons management

-- Function to get sermons with pastor names
CREATE OR REPLACE FUNCTION get_sermons_with_pastors()
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  description TEXT,
  pastor_id UUID,
  date DATE,
  duration INTEGER,
  video_url TEXT,
  audio_url TEXT,
  thumbnail_url TEXT,
  scripture_reference TEXT,
  series_name VARCHAR,
  tags TEXT[],
  view_count INTEGER,
  download_count INTEGER,
  is_featured BOOLEAN,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  pastor_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.title,
    s.description,
    s.pastor_id,
    s.date,
    s.duration,
    s.video_url,
    s.audio_url,
    s.thumbnail_url,
    s.scripture_reference,
    s.series_name,
    s.tags,
    s.view_count,
    s.download_count,
    s.is_featured,
    s.status,
    s.created_at,
    s.updated_at,
    COALESCE(m.fullname, 'Unknown Pastor') as pastor_name
  FROM sermons s
  LEFT JOIN members m ON s.pastor_id = m.id
  ORDER BY s.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync auth users to members (if not exists)
CREATE OR REPLACE FUNCTION sync_auth_users_to_members()
RETURNS INTEGER AS $$
DECLARE
  sync_count INTEGER := 0;
BEGIN
  -- Insert auth users that don't have member records
  INSERT INTO members (
    user_id,
    email,
    fullname,
    category,
    isactive,
    created_at,
    updated_at
  )
  SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    CASE 
      WHEN u.email = 'ojidelawrence@gmail.com' THEN 'Pastors'
      ELSE 'Members'
    END,
    true,
    u.created_at,
    NOW()
  FROM auth.users u
  LEFT JOIN members m ON u.id = m.user_id
  WHERE m.user_id IS NULL;
  
  GET DIAGNOSTICS sync_count = ROW_COUNT;
  
  RETURN sync_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get member statistics
CREATE OR REPLACE FUNCTION get_member_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT COUNT(*) FROM members),
    'active_members', (SELECT COUNT(*) FROM members WHERE isactive = true),
    'pastors', (SELECT COUNT(*) FROM members WHERE category = 'Pastors'),
    'recent_registrations', (SELECT COUNT(*) FROM members WHERE created_at >= NOW() - INTERVAL '30 days'),
    'members_with_auth', (SELECT COUNT(*) FROM members WHERE user_id IS NOT NULL),
    'members_without_auth', (SELECT COUNT(*) FROM members WHERE user_id IS NULL),
    'church_units', (
      SELECT json_object_agg(
        COALESCE(churchunit, 'No Unit'), 
        unit_count
      )
      FROM (
        SELECT 
          churchunit,
          COUNT(*) as unit_count
        FROM members 
        WHERE isactive = true
        GROUP BY churchunit
      ) unit_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_sermons_with_pastors() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_auth_users_to_members() TO authenticated;
GRANT EXECUTE ON FUNCTION get_member_statistics() TO authenticated;

-- Create RLS policy for sermons (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sermons') THEN
    -- Enable RLS
    ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Anyone can view published sermons
    DROP POLICY IF EXISTS "Anyone can view published sermons" ON sermons;
    CREATE POLICY "Anyone can view published sermons" ON sermons
      FOR SELECT USING (status = 'published');
    
    -- Policy: Admins can manage all sermons
    DROP POLICY IF EXISTS "Admins can manage all sermons" ON sermons;
    CREATE POLICY "Admins can manage all sermons" ON sermons
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM user_roles 
          WHERE user_id = auth.uid() 
          AND role IN ('admin', 'superuser')
        )
      );
  END IF;
END $$;