-- Manual Data Consolidation Setup
-- Task 3.1: Execute data consolidation from profiles to enhanced members table
-- Run this SQL manually in your Supabase SQL editor

-- Step 1: Create the enhanced members table
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
    gender VARCHAR(10),
    marital_status VARCHAR(20),
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
    category VARCHAR(50) NOT NULL DEFAULT 'Members',
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
    membership_status VARCHAR(20) DEFAULT 'active',
    
    -- Communication preferences
    preferred_contact_method VARCHAR(20) DEFAULT 'email',
    
    -- Skills and interests
    skills_talents TEXT[],
    interests TEXT[],
    
    -- Profile information
    bio TEXT,
    profile_image_url TEXT,
    
    -- Authentication and role information
    role VARCHAR(20) DEFAULT 'user',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT valid_genotype CHECK (genotype IS NULL OR genotype IN ('AA', 'AS', 'SS', 'AC', 'SC', 'CC')),
    CONSTRAINT valid_joindate CHECK (joindate <= CURRENT_DATE),
    CONSTRAINT valid_baptism_date CHECK (baptism_date IS NULL OR baptism_date <= CURRENT_DATE),
    CONSTRAINT valid_date_of_birth CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '1 year'),
    CONSTRAINT valid_gender CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    CONSTRAINT valid_marital_status CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed')),
    CONSTRAINT valid_membership_status CHECK (membership_status IN ('active', 'inactive', 'suspended', 'transferred')),
    CONSTRAINT valid_contact_method CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp'))
);

-- Step 2: Create indexes for optimal performance
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

-- Step 3: Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_members_enhanced_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 4: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_members_enhanced_updated_at ON public.members_enhanced;
CREATE TRIGGER update_members_enhanced_updated_at 
    BEFORE UPDATE ON public.members_enhanced 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_members_enhanced_updated_at();

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE public.members_enhanced ENABLE ROW LEVEL SECURITY;

-- Step 6: Grant necessary permissions
GRANT ALL ON public.members_enhanced TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 7: Add comments for documentation
COMMENT ON TABLE public.members_enhanced IS 'Enhanced members table consolidating data from members and profiles tables';
COMMENT ON COLUMN public.members_enhanced.user_id IS 'Reference to auth.users table, nullable for members without auth accounts';
COMMENT ON COLUMN public.members_enhanced.email IS 'Primary email address, must be unique across the system';
COMMENT ON COLUMN public.members_enhanced.genotype IS 'Blood genotype from profiles table (AA, AS, SS, AC, SC, CC)';
COMMENT ON COLUMN public.members_enhanced.churchunits IS 'Array of church units for members involved in multiple units';
COMMENT ON COLUMN public.members_enhanced.assignedto IS 'Self-referencing foreign key to assigned pastor/leader';
COMMENT ON COLUMN public.members_enhanced.role IS 'Application role from profiles table (user, admin, superuser)';
COMMENT ON COLUMN public.members_enhanced.isactive IS 'Soft delete flag - false means member is inactive/deleted';