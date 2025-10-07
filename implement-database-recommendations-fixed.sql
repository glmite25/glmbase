-- IMPLEMENT DATABASE RECOMMENDATIONS - FIXED VERSION
-- Run this AFTER comprehensive-fix-all-issues.sql completes successfully

-- ========================================
-- PART 0: PRE-CHECK EXISTING DATA
-- ========================================

-- First, let's see what church unit values exist
SELECT 'Existing Church Unit Values:' as info;
SELECT DISTINCT churchunit, COUNT(*) as count
FROM public.members 
WHERE churchunit IS NOT NULL
GROUP BY churchunit
ORDER BY count DESC;

-- ========================================
-- PART 1: PERFORMANCE INDEXES
-- ========================================

-- Members table indexes (most critical)
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_category ON public.members(category);
CREATE INDEX IF NOT EXISTS idx_members_active ON public.members(isactive) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_church_unit ON public.members(churchunit);
CREATE INDEX IF NOT EXISTS idx_members_assigned_pastor ON public.members(assignedto) WHERE assignedto IS NOT NULL;

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Profiles indexes (if keeping the table)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_active_category ON public.members(isactive, category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_active_church_unit ON public.members(isactive, churchunit) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_unit_leaders ON public.members(churchunit, category) WHERE category = 'Pastors';

-- ========================================
-- PART 2: DATA VALIDATION CONSTRAINTS
-- ========================================

-- Email validation constraint
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_email;
ALTER TABLE public.members ADD CONSTRAINT valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone validation constraint (international format)
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_phone;
ALTER TABLE public.members ADD CONSTRAINT valid_phone 
    CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

-- Category validation constraint
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_category;
ALTER TABLE public.members ADD CONSTRAINT valid_category 
    CHECK (category IN ('Pastors', 'Members', 'MINT'));

-- Church unit validation constraint - UPDATED to include all existing values
-- First, let's get all unique church unit values and create a comprehensive constraint
DO $$
DECLARE
    church_units text[];
    constraint_sql text;
BEGIN
    -- Get all existing church unit values
    SELECT array_agg(DISTINCT churchunit) 
    INTO church_units
    FROM public.members 
    WHERE churchunit IS NOT NULL AND churchunit != '';
    
    -- Drop existing constraint if it exists
    ALTER TABLE public.members DROP CONSTRAINT IF EXISTS valid_church_unit;
    
    -- Build the constraint SQL dynamically
    IF array_length(church_units, 1) > 0 THEN
        constraint_sql := 'ALTER TABLE public.members ADD CONSTRAINT valid_church_unit CHECK (churchunit IS NULL OR churchunit IN (';
        
        -- Add each church unit to the constraint
        FOR i IN 1..array_length(church_units, 1) LOOP
            IF i > 1 THEN
                constraint_sql := constraint_sql || ', ';
            END IF;
            constraint_sql := constraint_sql || '''' || church_units[i] || '''';
        END LOOP;
        
        constraint_sql := constraint_sql || '))';
        
        -- Execute the constraint
        EXECUTE constraint_sql;
        
        RAISE NOTICE 'Created church unit constraint with values: %', array_to_string(church_units, ', ');
    ELSE
        -- If no church units exist, create a basic constraint
        ALTER TABLE public.members ADD CONSTRAINT valid_church_unit 
            CHECK (churchunit IS NULL OR LENGTH(churchunit) > 0);
        
        RAISE NOTICE 'Created basic church unit constraint (no existing units found)';
    END IF;
END $$;

-- ========================================
-- PART 3: AUDIT TRAIL FUNCTIONALITY
-- ========================================

-- Add audit columns to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Update existing records to set created_by to user_id where possible
UPDATE public.members 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_member_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger
DROP TRIGGER IF EXISTS audit_members_update ON public.members;
CREATE TRIGGER audit_members_update
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.audit_member_changes();

-- ========================================
-- PART 4: ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own member record" ON public.members;
DROP POLICY IF EXISTS "Super admins can view all members" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Pastors can view their unit members" ON public.members;
DROP POLICY IF EXISTS "Users can update own basic info" ON public.members;

-- Policy 1: Users can view their own record
CREATE POLICY "Users can view own member record" ON public.members
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Super admins can view and manage all members
CREATE POLICY "Super admins can manage all members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- Policy 3: Pastors can view members in their church unit
CREATE POLICY "Pastors can view their unit members" ON public.members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members pastor 
            WHERE pastor.user_id = auth.uid() 
            AND pastor.category = 'Pastors'
            AND pastor.churchunit = members.churchunit
            AND pastor.isactive = true
        )
    );

-- Policy 4: Users can update their own basic info (restricted fields)
CREATE POLICY "Users can update own basic info" ON public.members
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND category = OLD.category          -- Can't change their own category
        AND user_id = OLD.user_id           -- Can't change user_id
        AND assignedto = OLD.assignedto     -- Can't change assigned pastor
        AND churchunit = OLD.churchunit     -- Can't change church unit (admin only)
        AND isactive = OLD.isactive         -- Can't change active status
    );

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Policy 1: Super admins can manage all roles
CREATE POLICY "Super admins can manage all roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- Policy 2: Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- ========================================
-- PART 5: CHURCH UNIT STATISTICS VIEW
-- ========================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS public.church_unit_stats;

-- Create church unit statistics materialized view
CREATE MATERIALIZED VIEW public.church_unit_stats AS
SELECT 
    churchunit,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE category = 'Pastors') as pastors_count,
    COUNT(*) FILTER (WHERE category = 'Members') as members_count,
    COUNT(*) FILTER (WHERE category = 'MINT') as mint_count,
    COUNT(*) FILTER (WHERE date_of_birth IS NOT NULL AND 
                     EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 35) as youth_count,
    COUNT(*) FILTER (WHERE assignedto IS NOT NULL) as assigned_members,
    MAX(created_at) as last_member_joined
FROM public.members 
WHERE isactive = true AND churchunit IS NOT NULL
GROUP BY churchunit;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_church_unit_stats_unit ON public.church_unit_stats(churchunit);

-- Function to refresh church unit statistics
CREATE OR REPLACE FUNCTION public.refresh_church_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.church_unit_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.church_unit_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_church_stats() TO authenticated;

-- ========================================
-- PART 6: ADDITIONAL HELPER FUNCTIONS
-- ========================================

-- Function to get member count by category
CREATE OR REPLACE FUNCTION public.get_member_count_by_category()
RETURNS TABLE(category public.member_category, count bigint) AS $$
BEGIN
    RETURN QUERY
    SELECT m.category, COUNT(*)
    FROM public.members m
    WHERE m.isactive = true
    GROUP BY m.category
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get church unit summary
CREATE OR REPLACE FUNCTION public.get_church_unit_summary()
RETURNS TABLE(
    unit_name text,
    total_members bigint,
    pastors_count bigint,
    members_count bigint,
    mint_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.churchunit,
        COUNT(*),
        COUNT(*) FILTER (WHERE m.category = 'Pastors'),
        COUNT(*) FILTER (WHERE m.category = 'Members'),
        COUNT(*) FILTER (WHERE m.category = 'MINT')
    FROM public.members m
    WHERE m.isactive = true AND m.churchunit IS NOT NULL
    GROUP BY m.churchunit
    ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for helper functions
GRANT EXECUTE ON FUNCTION public.get_member_count_by_category() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_church_unit_summary() TO authenticated;

-- ========================================
-- PART 7: VERIFICATION AND SUMMARY
-- ========================================

SELECT 'DATABASE RECOMMENDATIONS IMPLEMENTATION COMPLETED!' as status;

-- Show what church units were included in the constraint
SELECT 'Church Units included in constraint:' as info;
SELECT DISTINCT churchunit, COUNT(*) as member_count
FROM public.members 
WHERE churchunit IS NOT NULL
GROUP BY churchunit
ORDER BY member_count DESC;

-- Show created indexes
SELECT 'Created Indexes:' as info;
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('members', 'user_roles', 'profiles')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Show RLS policies
SELECT 'RLS Policies Created:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show constraints
SELECT 'Data Validation Constraints:' as info;
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
  AND table_name = 'members'
  AND constraint_type = 'CHECK'
ORDER BY constraint_name;

SELECT 'All database recommendations have been successfully implemented!' as final_status;