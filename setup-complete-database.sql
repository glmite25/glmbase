-- Gospel Labour Ministry CMS - Complete Database Setup
-- This script creates all tables, roles, policies, and initial data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superuser');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.member_category AS ENUM ('Members', 'Pastors', 'Workers', 'Visitors', 'Partners');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE,
    full_name text,
    phone text,
    address text,
    church_unit text,
    assigned_pastor text,
    genotype text,
    role public.app_role DEFAULT 'user',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Create user_roles table for multiple role assignments
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Ensure unique user-role combinations
    UNIQUE(user_id, role)
);

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    fullname text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    category public.member_category NOT NULL DEFAULT 'Members',
    title text, -- For pastors (e.g., Senior Pastor, Youth Pastor)
    assignedto uuid REFERENCES public.members(id), -- Pastor assigned to this member
    churchunit text, -- Primary church unit
    churchunits text[], -- Array of church units
    auxanogroup text, -- Auxano group
    joindate date NOT NULL DEFAULT CURRENT_DATE,
    notes text,
    isactive boolean NOT NULL DEFAULT true,
    userid uuid REFERENCES auth.users(id), -- Link to auth user
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT unique_email UNIQUE(email)
);

-- Create church_units table
CREATE TABLE IF NOT EXISTS public.church_units (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    leader_id uuid REFERENCES public.members(id),
    parent_unit_id uuid REFERENCES public.church_units(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create auxano_groups table
CREATE TABLE IF NOT EXISTS public.auxano_groups (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    leader_id uuid REFERENCES public.members(id),
    meeting_day text,
    meeting_time time,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    start_time time,
    end_time time,
    location text,
    organizer_id uuid REFERENCES public.members(id),
    church_unit text,
    is_recurring boolean DEFAULT false,
    recurrence_pattern text, -- daily, weekly, monthly, yearly
    max_attendees integer,
    registration_required boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    registration_date timestamp with time zone DEFAULT now() NOT NULL,
    attendance_status text DEFAULT 'registered', -- registered, attended, absent
    notes text,
    
    -- Ensure unique registrations
    UNIQUE(event_id, member_id)
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES public.members(id) NOT NULL,
    target_audience text[], -- Array of categories or units
    priority text DEFAULT 'normal', -- low, normal, high, urgent
    publish_date date DEFAULT CURRENT_DATE,
    expiry_date date,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    donor_id uuid REFERENCES public.members(id),
    donor_name text, -- For anonymous or non-member donations
    amount decimal(10,2) NOT NULL,
    currency text DEFAULT 'NGN',
    donation_type text NOT NULL, -- tithe, offering, special_offering, building_fund, etc.
    payment_method text, -- cash, transfer, card, cheque
    reference_number text,
    donation_date date DEFAULT CURRENT_DATE,
    notes text,
    recorded_by uuid REFERENCES public.members(id) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Create pastoral_care table
CREATE TABLE IF NOT EXISTS public.pastoral_care (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    pastor_id uuid REFERENCES public.members(id) NOT NULL,
    care_type text NOT NULL, -- visit, counseling, prayer, hospital_visit, etc.
    date_of_care date DEFAULT CURRENT_DATE,
    notes text,
    follow_up_required boolean DEFAULT false,
    follow_up_date date,
    status text DEFAULT 'completed', -- scheduled, completed, cancelled
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    service_date date NOT NULL,
    service_type text NOT NULL, -- sunday_service, midweek_service, special_service
    church_unit text,
    present boolean DEFAULT true,
    recorded_by uuid REFERENCES public.members(id) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Ensure unique attendance records
    UNIQUE(member_id, service_date, service_type)
);

-- Create migrations table to track schema changes
CREATE TABLE IF NOT EXISTS public.migrations (
    id serial PRIMARY KEY,
    name text NOT NULL UNIQUE,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    description text
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_church_unit ON public.profiles(church_unit);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_members_fullname ON public.members(fullname);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_category ON public.members(category);
CREATE INDEX IF NOT EXISTS idx_members_assignedto ON public.members(assignedto);
CREATE INDEX IF NOT EXISTS idx_members_churchunit ON public.members(churchunit);
CREATE INDEX IF NOT EXISTS idx_members_isactive ON public.members(isactive);
CREATE INDEX IF NOT EXISTS idx_members_userid ON public.members(userid);
CREATE INDEX IF NOT EXISTS idx_members_churchunits ON public.members USING GIN(churchunits);

CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_church_unit ON public.events(church_unit);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);

CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON public.donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_donation_type ON public.donations(donation_type);

CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON public.attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_service_date ON public.attendance(service_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.members;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.church_units;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.church_units
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.auxano_groups;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.auxano_groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.events;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.announcements;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.donations;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.donations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.pastoral_care;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.pastoral_care
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create role synchronization functions
CREATE OR REPLACE FUNCTION public.sync_user_role_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile role with the highest role from user_roles
    UPDATE public.profiles 
    SET role = (
        SELECT CASE 
            WHEN 'superuser' = ANY(array_agg(ur.role)) THEN 'superuser'::public.app_role
            WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::public.app_role
            ELSE 'user'::public.app_role
        END
        FROM public.user_roles ur 
        WHERE ur.user_id = COALESCE(NEW.user_id, OLD.user_id)
    )
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply role synchronization triggers
DROP TRIGGER IF EXISTS sync_user_role_to_profile ON public.user_roles;
CREATE TRIGGER sync_user_role_to_profile
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_to_profile();

-- Create profile synchronization function
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Insert the new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply profile synchronization trigger
DROP TRIGGER IF EXISTS sync_profile_role_to_user_roles ON public.profiles;
CREATE TRIGGER sync_profile_role_to_user_roles
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_user_roles();

-- Create user_roles_view for easier querying
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role as highest_role,
    COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[p.role]) as all_roles
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
GROUP BY p.id, p.email, p.full_name, p.role;

-- Insert default church units
INSERT INTO public.church_units (name, description) VALUES
    ('Administration', 'Church administration and management'),
    ('Youth Ministry', 'Ministry for young people'),
    ('Children Ministry', 'Ministry for children'),
    ('Music Ministry', 'Worship and music ministry'),
    ('Ushering Ministry', 'Ushering and hospitality'),
    ('Technical Ministry', 'Audio/visual and technical support'),
    ('Evangelism Ministry', 'Outreach and evangelism'),
    ('Prayer Ministry', 'Prayer and intercession'),
    ('Welfare Ministry', 'Care and welfare services'),
    ('Security Ministry', 'Church security and safety')
ON CONFLICT (name) DO NOTHING;

-- Insert default auxano groups
INSERT INTO public.auxano_groups (name, description, meeting_day) VALUES
    ('Group A', 'Auxano Group A', 'Wednesday'),
    ('Group B', 'Auxano Group B', 'Thursday'),
    ('Group C', 'Auxano Group C', 'Friday'),
    ('Group D', 'Auxano Group D', 'Saturday'),
    ('Youth Group', 'Youth Auxano Group', 'Saturday'),
    ('Children Group', 'Children Auxano Group', 'Sunday')
ON CONFLICT (name) DO NOTHING;

-- Record this migration
INSERT INTO public.migrations (name, description) VALUES
    ('001_initial_setup', 'Initial database setup with all core tables, indexes, and triggers')
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auxano_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

DROP POLICY IF EXISTS "Superusers can manage all profiles" ON public.profiles;
CREATE POLICY "Superusers can manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'superuser'
        )
    );

-- Members policies
DROP POLICY IF EXISTS "Members can view active members" ON public.members;
CREATE POLICY "Members can view active members" ON public.members
    FOR SELECT USING (isactive = true);

DROP POLICY IF EXISTS "Admins can manage members" ON public.members;
CREATE POLICY "Admins can manage members" ON public.members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Events policies
DROP POLICY IF EXISTS "Everyone can view active events" ON public.events;
CREATE POLICY "Everyone can view active events" ON public.events
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Announcements policies
DROP POLICY IF EXISTS "Everyone can view published announcements" ON public.announcements;
CREATE POLICY "Everyone can view published announcements" ON public.announcements
    FOR SELECT USING (is_published = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant limited permissions to anon users
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT ON public.church_units TO anon;