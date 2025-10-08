-- Task 4.3: Optimize Enhanced Database Indexes (Clean Version)
-- This script creates optimized indexes for the enhanced members table

-- ========================================
-- CLEANUP OLD INDEXES
-- ========================================

-- Drop any conflicting indexes from old members table if they exist
DROP INDEX IF EXISTS public.idx_members_user_id;
DROP INDEX IF EXISTS public.idx_members_email;
DROP INDEX IF EXISTS public.idx_members_category;
DROP INDEX IF EXISTS public.idx_members_isactive;
DROP INDEX IF EXISTS public.idx_members_churchunit;
DROP INDEX IF EXISTS public.idx_members_assignedto;
DROP INDEX IF EXISTS public.idx_members_fullname;

-- ========================================
-- CORE IDENTIFICATION INDEXES
-- ========================================

-- Core identification indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_id 
ON public.members_enhanced(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_email 
ON public.members_enhanced(email);

-- ========================================
-- STATUS AND FILTERING INDEXES
-- ========================================

-- Active status index (most common filter)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_isactive 
ON public.members_enhanced(isactive);

-- Category index for member type filtering
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category 
ON public.members_enhanced(category);

-- Role index for authentication and permissions
CREATE INDEX IF NOT EXISTS idx_members_enhanced_role 
ON public.members_enhanced(role);

-- Membership status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_membership_status 
ON public.members_enhanced(membership_status);

-- ========================================
-- CHURCH ORGANIZATION INDEXES
-- ========================================

-- Church unit index for organizational queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit 
ON public.members_enhanced(churchunit) WHERE churchunit IS NOT NULL;

-- Pastor assignment index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assignedto 
ON public.members_enhanced(assignedto) WHERE assignedto IS NOT NULL;

-- Auxano group index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_auxanogroup 
ON public.members_enhanced(auxanogroup) WHERE auxanogroup IS NOT NULL;

-- ========================================
-- DATE-BASED INDEXES FOR REPORTING
-- ========================================

-- Join date index for membership tracking
CREATE INDEX IF NOT EXISTS idx_members_enhanced_joindate 
ON public.members_enhanced(joindate);

-- Creation and update timestamps
CREATE INDEX IF NOT EXISTS idx_members_enhanced_created_at 
ON public.members_enhanced(created_at);

CREATE INDEX IF NOT EXISTS idx_members_enhanced_updated_at 
ON public.members_enhanced(updated_at);

-- Baptism date index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_baptism_date 
ON public.members_enhanced(baptism_date) WHERE baptism_date IS NOT NULL;

-- Date of birth index for age-based queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_date_of_birth 
ON public.members_enhanced(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- ========================================
-- TEXT SEARCH INDEXES
-- ========================================

-- Full name index for member search
CREATE INDEX IF NOT EXISTS idx_members_enhanced_fullname 
ON public.members_enhanced(fullname);

-- Phone number index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_phone 
ON public.members_enhanced(phone) WHERE phone IS NOT NULL;

-- Title index for leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_title 
ON public.members_enhanced(title) WHERE title IS NOT NULL;

-- ========================================
-- LOCATION-BASED INDEXES
-- ========================================

-- City index for location-based queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_city 
ON public.members_enhanced(city) WHERE city IS NOT NULL;

-- State index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_state 
ON public.members_enhanced(state) WHERE state IS NOT NULL;

-- Country index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_country 
ON public.members_enhanced(country);

-- ========================================
-- DEMOGRAPHIC AND PERSONAL INDEXES
-- ========================================

-- Genotype index for medical/health queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_genotype 
ON public.members_enhanced(genotype) WHERE genotype IS NOT NULL;

-- Occupation index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_occupation 
ON public.members_enhanced(occupation) WHERE occupation IS NOT NULL;

-- Gender index for demographic queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_gender 
ON public.members_enhanced(gender) WHERE gender IS NOT NULL;

-- Marital status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_marital_status 
ON public.members_enhanced(marital_status) WHERE marital_status IS NOT NULL;

-- Baptism status index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_is_baptized 
ON public.members_enhanced(is_baptized);

-- Communication preference index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_contact_method 
ON public.members_enhanced(preferred_contact_method);

-- Emergency contact index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_emergency_contact 
ON public.members_enhanced(emergency_contact_name) WHERE emergency_contact_name IS NOT NULL;

-- ========================================
-- ARRAY INDEXES (GIN)
-- ========================================

-- Church units array index for multi-unit membership
CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunits_gin 
ON public.members_enhanced USING GIN(churchunits);

-- Skills and talents array index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_skills_talents_gin 
ON public.members_enhanced USING GIN(skills_talents);

-- Interests array index
CREATE INDEX IF NOT EXISTS idx_members_enhanced_interests_gin 
ON public.members_enhanced USING GIN(interests);

-- ========================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ========================================

-- Active members by category (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_category 
ON public.members_enhanced(isactive, category) WHERE isactive = true;

-- Active members by church unit
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_churchunit 
ON public.members_enhanced(isactive, churchunit) WHERE isactive = true AND churchunit IS NOT NULL;

-- Active members by role
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_role 
ON public.members_enhanced(isactive, role) WHERE isactive = true;

-- Active members by membership status
CREATE INDEX IF NOT EXISTS idx_members_enhanced_active_membership 
ON public.members_enhanced(isactive, membership_status) WHERE isactive = true;

-- Pastor and leadership queries
CREATE INDEX IF NOT EXISTS idx_members_enhanced_pastors_active 
ON public.members_enhanced(category, isactive, churchunit) 
WHERE category = 'Pastors' AND isactive = true;

-- Members assigned to pastors
CREATE INDEX IF NOT EXISTS idx_members_enhanced_assigned_members 
ON public.members_enhanced(assignedto, isactive) 
WHERE assignedto IS NOT NULL AND isactive = true;

-- Authentication and user management
CREATE INDEX IF NOT EXISTS idx_members_enhanced_user_email 
ON public.members_enhanced(user_id, email) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_auth_active 
ON public.members_enhanced(user_id, isactive) WHERE user_id IS NOT NULL;

-- Reporting and analytics indexes
CREATE INDEX IF NOT EXISTS idx_members_enhanced_category_joindate 
ON public.members_enhanced(category, joindate) WHERE isactive = true;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_churchunit_joindate 
ON public.members_enhanced(churchunit, joindate) 
WHERE isactive = true AND churchunit IS NOT NULL;

-- Age-based queries (date of birth with category)
CREATE INDEX IF NOT EXISTS idx_members_enhanced_age_category 
ON public.members_enhanced(date_of_birth, category) 
WHERE date_of_birth IS NOT NULL AND isactive = true;

-- Search and filtering combinations
CREATE INDEX IF NOT EXISTS idx_members_enhanced_name_category 
ON public.members_enhanced(fullname, category) WHERE isactive = true;

CREATE INDEX IF NOT EXISTS idx_members_enhanced_location_active 
ON public.members_enhanced(city, state, isactive) 
WHERE city IS NOT NULL AND state IS NOT NULL AND isactive = true;

-- ========================================
-- PERFORMANCE MONITORING
-- ========================================

-- Log the index creation completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'ENHANCED_INDEXES_CREATED',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Enhanced database indexes created successfully',
        'members_indexes_created', (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'members_enhanced' AND schemaname = 'public'),
        'timestamp', NOW()
    )
);

-- Final success message
SELECT 'Task 4.3: Enhanced database indexes created successfully!' as completion_status,
       (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'members_enhanced' AND schemaname = 'public') as members_indexes_created;