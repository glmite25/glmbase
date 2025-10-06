-- Complete Database Schema for Gospel Labour Ministry
-- This script creates all necessary tables for the church management system

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create missing essential tables

-- 1. Sermons table
CREATE TABLE IF NOT EXISTS sermons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    pastor_id UUID REFERENCES members(id),
    date DATE NOT NULL,
    duration INTEGER, -- in minutes
    video_url TEXT,
    audio_url TEXT,
    thumbnail_url TEXT,
    scripture_reference TEXT,
    series_name VARCHAR(255),
    tags TEXT[],
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- 2. Testimonies table
CREATE TABLE IF NOT EXISTS testimonies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date_shared DATE DEFAULT CURRENT_DATE,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Prayer requests table
CREATE TABLE IF NOT EXISTS prayer_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('healing', 'family', 'financial', 'spiritual', 'general', 'urgent')),
    is_anonymous BOOLEAN DEFAULT false,
    is_answered BOOLEAN DEFAULT false,
    answered_testimony TEXT,
    answered_date DATE,
    prayer_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'answered', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ministry teams table
CREATE TABLE IF NOT EXISTS ministry_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID REFERENCES members(id),
    meeting_day VARCHAR(20),
    meeting_time TIME,
    meeting_location TEXT,
    is_active BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES ministry_teams(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('leader', 'assistant', 'member')),
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, member_id)
);

-- 6. Financial records table
CREATE TABLE IF NOT EXISTS financial_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('tithe', 'offering', 'donation', 'pledge', 'expense')),
    category VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'card', 'transfer', 'mobile')),
    reference_number VARCHAR(100),
    is_recurring BOOLEAN DEFAULT false,
    recurring_frequency VARCHAR(20) CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    recorded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Visitor records table
CREATE TABLE IF NOT EXISTS visitors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    visit_date DATE NOT NULL,
    service_type VARCHAR(50) DEFAULT 'sunday_service',
    how_heard_about_us TEXT,
    interests TEXT[],
    follow_up_needed BOOLEAN DEFAULT true,
    follow_up_date DATE,
    follow_up_notes TEXT,
    assigned_to UUID REFERENCES members(id),
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'following_up', 'joined', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Communication logs table
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES members(id),
    visitor_id UUID REFERENCES visitors(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'call', 'visit', 'letter')),
    subject VARCHAR(255),
    message TEXT,
    sent_by UUID REFERENCES profiles(id),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'failed', 'bounced')),
    response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sermons_pastor_id ON sermons(pastor_id);
CREATE INDEX IF NOT EXISTS idx_sermons_date ON sermons(date DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_status ON sermons(status);
CREATE INDEX IF NOT EXISTS idx_testimonies_member_id ON testimonies(member_id);
CREATE INDEX IF NOT EXISTS idx_testimonies_approved ON testimonies(is_approved);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_member_id ON prayer_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_financial_records_member_id ON financial_records(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON visitors(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_member_id ON communication_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_sent_at ON communication_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Sermons policies
CREATE POLICY "Public can view published sermons" ON sermons
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admins can manage all sermons" ON sermons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Testimonies policies
CREATE POLICY "Public can view approved testimonies" ON testimonies
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Members can create testimonies" ON testimonies
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    );

CREATE POLICY "Admins can manage testimonies" ON testimonies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Prayer requests policies
CREATE POLICY "Members can view non-anonymous prayer requests" ON prayer_requests
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND
        (is_anonymous = false OR member_id IN (SELECT id FROM members WHERE user_id = auth.uid()))
    );

CREATE POLICY "Members can create prayer requests" ON prayer_requests
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    );

-- Financial records policies (restricted to admins and finance team)
CREATE POLICY "Admins can manage financial records" ON financial_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser', 'finance')
        )
    );

-- System settings policies (admin only)
CREATE POLICY "Admins can manage system settings" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

CREATE POLICY "Public can view public settings" ON system_settings
    FOR SELECT USING (is_public = true);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
    ('church_name', 'Gospel Labour Ministry', 'Official church name', 'general', true),
    ('church_address', '123 Church Street, City, State 12345', 'Church physical address', 'general', true),
    ('church_phone', '+1 (555) 123-4567', 'Main church phone number', 'general', true),
    ('church_email', 'info@gospellabourministry.com', 'Main church email', 'general', true),
    ('service_times', 'Sunday: 9:00 AM & 11:00 AM, Wednesday: 7:00 PM', 'Regular service times', 'general', true),
    ('max_file_size', '50MB', 'Maximum file upload size', 'system', false),
    ('enable_online_giving', 'true', 'Enable online donation feature', 'financial', false),
    ('auto_approve_testimonies', 'false', 'Automatically approve new testimonies', 'content', false),
    ('visitor_follow_up_days', '7', 'Days after visit to follow up', 'pastoral', false),
    ('backup_frequency', 'daily', 'Database backup frequency', 'system', false)
ON CONFLICT (key) DO NOTHING;

-- Create functions for common operations

-- Function to update member count in ministry teams
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ministry_teams 
        SET member_count = member_count + 1 
        WHERE id = NEW.team_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ministry_teams 
        SET member_count = member_count - 1 
        WHERE id = OLD.team_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for team member count
DROP TRIGGER IF EXISTS trigger_update_team_member_count ON team_members;
CREATE TRIGGER trigger_update_team_member_count
    AFTER INSERT OR DELETE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_team_member_count();

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
CREATE TRIGGER audit_members AFTER INSERT OR UPDATE OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_financial_records AFTER INSERT OR UPDATE OR DELETE ON financial_records
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Create views for common queries

-- Active members view
CREATE OR REPLACE VIEW active_members AS
SELECT 
    m.*,
    p.email,
    p.full_name as profile_name
FROM members m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE m.status = 'active';

-- Financial summary view
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    DATE_TRUNC('month', date) as month,
    type,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM financial_records
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', date), type
ORDER BY month DESC, type;

-- Recent activities view
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    'sermon' as activity_type,
    title as activity_title,
    created_at,
    created_by as user_id
FROM sermons
WHERE created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'testimony' as activity_type,
    title as activity_title,
    created_at,
    member_id as user_id
FROM testimonies
WHERE created_at >= NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'prayer_request' as activity_type,
    title as activity_title,
    created_at,
    member_id as user_id
FROM prayer_requests
WHERE created_at >= NOW() - INTERVAL '30 days'

ORDER BY created_at DESC
LIMIT 50;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';