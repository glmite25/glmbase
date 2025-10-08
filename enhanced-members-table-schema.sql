-- Enhanced Members Table Schema
-- Task 2.1: Create enhanced members table schema with consolidated columns
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5

-- Create custom types if they don't exist
DO $$ 
BEGIN
    -- Create member_category enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_category') THEN
        CREATE TYPE member_category AS ENUM ('Members', 'Pastors', 'Workers', 'Visitors', 'Partners');
    END IF;
    
    -- Create app_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('user', 'admin', 'superuser');
    END IF;
END $$;

-- Create the enhanced members table
CREATE TABLE IF NOT EXISTS public.members_enhanced (
    -- Primary identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Basic information (consolidated from both tables)
    email VARCHAR(255) NOT NULL UNIQUE,
    fullname VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    genotype VARCHAR(10), -- From profiles table
    
    -- Extended personal information
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    occupation VARCHAR(255),
    
    -- Emergency contact information
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    
    -- Location information
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Nigeria',
    
    -- Church-specific information
    category member_category NOT NULL DEFAULT 'Members',
    title TEXT,
    assignedto UUID REFERENCES public.members_enhanced(id),
    churchunit TEXT, -- Primary church unit
    churchunits TEXT[], -- Multiple church units
    auxanogroup TEXT,
    joindate DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    isactive BOOLEAN NOT NULL DEFAULT true,
    
    -- Spiritual information
    baptism_date DATE,
    baptism_location VARCHAR(255),
    is_baptized BOOLEAN DEFAULT false,
    membership_status VARCHAR(20) DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended', 'transferred')),
    
    -- Communication preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp')),
    
    -- Skills and interests
    skills_talents TEXT[],
    interests TEXT[],
    
    -- Profile information
    bio TEXT,
    profile_image_url TEXT,
    
    -- Authentication and role information
    role app_role DEFAULT 'user', -- From profiles table
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_postal_code CHECK (postal_code IS NULL OR length(postal_code) <= 20),
    CONSTRAINT valid_genotype CHECK (genotype IS NULL OR genotype IN ('AA', 'AS', 'SS', 'AC', 'SC', 'CC')),
    CONSTRAINT valid_joindate CHECK (joindate <= CURRENT_DATE),
    CONSTRAINT valid_baptism_date CHECK (baptism_date IS NULL OR baptism_date <= CURRENT_DATE),
    CONSTRAINT valid_date_of_birth CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '1 year')
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_id ON public.members_enhanced(user_id);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_email ON public.members_enhanced(email);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category ON public.members_enhanced(category);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit ON public.members_enhanced(churchunit);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assignedto ON public.members_enhanced(assignedto);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_isactive ON public.members_enhanced(isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role ON public.members_enhanced(role);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_membership_status ON public.members_enhanced(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_created_at ON public.members_enhanced(created_at);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_joindate ON public.members_enhanced(joindate);

-- Create GIN indexes for array columns
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunits_gin ON public.members_enhanced USING GIN(churchunits);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_skills_talents_gin ON public.members_enhanced USING GIN(skills_talents);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_interests_gin ON public.members_enhanced USING GIN(interests);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category_active ON public.members_enhanced(category, isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit_active ON public.members_enhanced(churchunit, isactive);
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role_active ON public.members_enhanced(role, isactive);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_members_enhanced_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_members_enhanced_updated_at ON public.members_enhanced;
CREATE TRIGGER update_members_enhanced_updated_at 
    BEFORE UPDATE ON public.members_enhanced 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_members_enhanced_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.members_enhanced ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for the enhanced members table
-- Policy for viewing members (authenticated users can view active members)
CREATE POLICY "authenticated_users_can_view_active_members" ON public.members_enhanced
    FOR SELECT USING (
        auth.role() = 'authenticated' AND isactive = true
    );

-- Policy for viewing own record (users can view their own record even if inactive)
CREATE POLICY "users_can_view_own_record" ON public.members_enhanced
    FOR SELECT USING (
        auth.uid() = user_id
    );

-- Policy for admins to view all records
CREATE POLICY "admins_can_view_all_members" ON public.members_enhanced
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Policy for superusers to have full access
CREATE POLICY "superusers_full_access" ON public.members_enhanced
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'superuser'
        )
        OR 
        -- Hardcoded superuser emails for emergency access
        auth.jwt() ->> 'email' IN ('ojidelawrence@gmail.com', 'popsabey1@gmail.com')
    );

-- Policy for admins to insert members
CREATE POLICY "admins_can_insert_members" ON public.members_enhanced
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Policy for admins to update members
CREATE POLICY "admins_can_update_members" ON public.members_enhanced
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Policy for users to update their own basic information
CREATE POLICY "users_can_update_own_basic_info" ON public.members_enhanced
    FOR UPDATE USING (
        auth.uid() = user_id
    ) WITH CHECK (
        auth.uid() = user_id AND
        -- Restrict which fields users can update themselves
        OLD.email = NEW.email AND -- Cannot change email
        OLD.role = NEW.role AND -- Cannot change role
        OLD.category = NEW.category AND -- Cannot change category
        OLD.assignedto = NEW.assignedto -- Cannot change assigned pastor
    );

-- Policy for admins to delete members (soft delete by setting isactive = false)
CREATE POLICY "admins_can_delete_members" ON public.members_enhanced
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.members_enhanced TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create comments for documentation
COMMENT ON TABLE public.members_enhanced IS 'Enhanced members table consolidating data from members and profiles tables';
COMMENT ON COLUMN public.members_enhanced.user_id IS 'Reference to auth.users table, nullable for members without auth accounts';
COMMENT ON COLUMN public.members_enhanced.email IS 'Primary email address, must be unique across the system';
COMMENT ON COLUMN public.members_enhanced.genotype IS 'Blood genotype from profiles table (AA, AS, SS, AC, SC, CC)';
COMMENT ON COLUMN public.members_enhanced.churchunits IS 'Array of church units for members involved in multiple units';
COMMENT ON COLUMN public.members_enhanced.assignedto IS 'Self-referencing foreign key to assigned pastor/leader';
COMMENT ON COLUMN public.members_enhanced.role IS 'Application role from profiles table (user, admin, superuser)';
COMMENT ON COLUMN public.members_enhanced.isactive IS 'Soft delete flag - false means member is inactive/deleted';

-- Create validation function for data integrity
CREATE OR REPLACE FUNCTION public.validate_members_enhanced_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate email format
    IF NEW.email IS NOT NULL AND NEW.email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Validate phone format if provided
    IF NEW.phone IS NOT NULL AND NEW.phone !~* '^\+?[1-9]\d{1,14}$' THEN
        RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
    
    -- Validate dates
    IF NEW.date_of_birth IS NOT NULL AND NEW.date_of_birth > CURRENT_DATE - INTERVAL '1 year' THEN
        RAISE EXCEPTION 'Date of birth cannot be in the future or less than 1 year ago';
    END IF;
    
    IF NEW.baptism_date IS NOT NULL AND NEW.baptism_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Baptism date cannot be in the future';
    END IF;
    
    IF NEW.joindate > CURRENT_DATE THEN
        RAISE EXCEPTION 'Join date cannot be in the future';
    END IF;
    
    -- Validate self-assignment (cannot assign to self)
    IF NEW.assignedto = NEW.id THEN
        RAISE EXCEPTION 'Member cannot be assigned to themselves';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_members_enhanced_data_trigger ON public.members_enhanced;
CREATE TRIGGER validate_members_enhanced_data_trigger
    BEFORE INSERT OR UPDATE ON public.members_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_members_enhanced_data();

-- Create function to ensure email uniqueness across auth.users if user_id is provided
CREATE OR REPLACE FUNCTION public.sync_members_enhanced_email_with_auth()
RETURNS TRIGGER AS $$
DECLARE
    auth_email TEXT;
BEGIN
    -- If user_id is provided, ensure email matches auth.users email
    IF NEW.user_id IS NOT NULL THEN
        SELECT email INTO auth_email FROM auth.users WHERE id = NEW.user_id;
        
        IF auth_email IS NOT NULL AND auth_email != NEW.email THEN
            RAISE EXCEPTION 'Email % does not match auth.users email % for user_id %', 
                NEW.email, auth_email, NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create email sync trigger
DROP TRIGGER IF EXISTS sync_members_enhanced_email_trigger ON public.members_enhanced;
CREATE TRIGGER sync_members_enhanced_email_trigger
    BEFORE INSERT OR UPDATE ON public.members_enhanced
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_members_enhanced_email_with_auth();

-- Create view for backward compatibility with existing queries
CREATE OR REPLACE VIEW public.members_view AS
SELECT 
    id,
    user_id,
    email,
    fullname,
    phone,
    address,
    category::text as category,
    title,
    assignedto,
    churchunit,
    churchunits,
    auxanogroup,
    joindate,
    notes,
    isactive,
    created_at,
    updated_at
FROM public.members_enhanced;

-- Grant access to the view
GRANT SELECT ON public.members_view TO authenticated;

-- Create summary statistics view
CREATE OR REPLACE VIEW public.members_enhanced_stats AS
SELECT 
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE isactive = true) as active_members,
    COUNT(*) FILTER (WHERE isactive = false) as inactive_members,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as members_with_auth,
    COUNT(*) FILTER (WHERE user_id IS NULL) as members_without_auth,
    COUNT(DISTINCT category) as categories_count,
    COUNT(DISTINCT churchunit) as church_units_count,
    COUNT(DISTINCT role) as roles_count
FROM public.members_enhanced;

-- Grant access to stats view
GRANT SELECT ON public.members_enhanced_stats TO authenticated;