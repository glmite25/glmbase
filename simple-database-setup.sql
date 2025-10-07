-- Simple Database Setup for Gospel Labour Ministry
-- Run this in Supabase SQL Editor

-- 1. Ensure members table has correct structure
CREATE TABLE IF NOT EXISTS members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    email VARCHAR(255) NOT NULL,
    fullname VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    churchunit VARCHAR(100),
    churchunits TEXT[],
    assignedto VARCHAR(255),
    category VARCHAR(50) DEFAULT 'Members',
    isactive BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email)
);

-- 2. Ensure user_roles table exists
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_category ON members(category);
CREATE INDEX IF NOT EXISTS idx_members_isactive ON members(isactive);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- 4. Insert admin user role if not exists
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
    u.id,
    'superuser',
    NOW()
FROM auth.users u
WHERE u.email = 'ojidelawrence@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role = 'superuser'
);

-- 5. Sync existing auth users to members table
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
WHERE NOT EXISTS (
    SELECT 1 FROM members m WHERE m.user_id = u.id
)
ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    fullname = COALESCE(EXCLUDED.fullname, members.fullname),
    updated_at = NOW();

-- 6. Enable RLS on tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for members
DROP POLICY IF EXISTS "Users can view active members" ON members;
CREATE POLICY "Users can view active members" ON members
    FOR SELECT USING (isactive = true);

DROP POLICY IF EXISTS "Admins can manage all members" ON members;
CREATE POLICY "Admins can manage all members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- 8. Create RLS policies for user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );