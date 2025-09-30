-- Gospel Labour Ministry Database Setup
-- This script creates the necessary tables and views for the GLM CMS

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fullname TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    churchunit TEXT,
    churchunits TEXT[],
    assignedto TEXT,
    isactive BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_category ON public.members(category);
CREATE INDEX IF NOT EXISTS idx_members_churchunit ON public.members(churchunit);
CREATE INDEX IF NOT EXISTS idx_members_assignedto ON public.members(assignedto);
CREATE INDEX IF NOT EXISTS idx_members_isactive ON public.members(isactive);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at);

-- Create user_roles_view
CREATE OR REPLACE VIEW public.user_roles_view AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    COALESCE(ur.role::text, 'user') as highest_role,
    p.updated_at as created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id;

-- Enable Row Level Security (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policies for members table
CREATE POLICY "Allow authenticated users to read members" ON public.members
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to insert members" ON public.members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow admins to update members" ON public.members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Allow admins to delete members" ON public.members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert some sample data
INSERT INTO public.members (fullname, email, phone, category, churchunit, isactive) VALUES
('Pastor John Doe', 'pastor.john@glm.org', '+1234567890', 'Pastors', 'Main Church', true),
('Sister Mary Smith', 'mary.smith@glm.org', '+1234567891', 'Members', 'Youth Ministry', true),
('Brother David Wilson', 'david.wilson@glm.org', '+1234567892', 'Members', 'Music Ministry', true),
('Pastor Sarah Johnson', 'pastor.sarah@glm.org', '+1234567893', 'Pastors', 'Children Ministry', true),
('Elder Michael Brown', 'michael.brown@glm.org', '+1234567894', 'Elders', 'Main Church', true)
ON CONFLICT (email) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON public.members 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.user_roles_view TO authenticated;