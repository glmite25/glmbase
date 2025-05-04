-- SQL script to standardize column names to lowercase in the members table
-- This will fix case sensitivity issues with column names

-- First, let's check what columns actually exist and their exact names
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
ORDER BY ordinal_position;

-- Now let's handle each column carefully, checking for both existence and target name conflicts

-- Handle fullName/fullname
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    -- Check if source column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'fullName'
    ) INTO source_exists;

    -- Check if target column already exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'fullname'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "fullName" TO fullname;
        RAISE NOTICE 'Renamed fullName to fullname';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both fullName and fullname exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase fullname exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither fullName nor fullname found - check your schema';
    END IF;
END $$;

-- Handle assignedTo/assignedto
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'assignedTo'
    ) INTO source_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'assignedto'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "assignedTo" TO assignedto;
        RAISE NOTICE 'Renamed assignedTo to assignedto';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both assignedTo and assignedto exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase assignedto exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither assignedTo nor assignedto found - check your schema';
    END IF;
END $$;

-- Handle churchUnit/churchunit
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'churchUnit'
    ) INTO source_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'churchunit'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "churchUnit" TO churchunit;
        RAISE NOTICE 'Renamed churchUnit to churchunit';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both churchUnit and churchunit exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase churchunit exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither churchUnit nor churchunit found - check your schema';
    END IF;
END $$;

-- Handle churchUnits/churchunits
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'churchUnits'
    ) INTO source_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'churchunits'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "churchUnits" TO churchunits;
        RAISE NOTICE 'Renamed churchUnits to churchunits';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both churchUnits and churchunits exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase churchunits exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither churchUnits nor churchunits found - check your schema';
    END IF;
END $$;

-- Handle auxanoGroup/auxanogroup
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'auxanoGroup'
    ) INTO source_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'auxanogroup'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "auxanoGroup" TO auxanogroup;
        RAISE NOTICE 'Renamed auxanoGroup to auxanogroup';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both auxanoGroup and auxanogroup exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase auxanogroup exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither auxanoGroup nor auxanogroup found - check your schema';
    END IF;
END $$;

-- Handle isActive/isactive
DO $$
DECLARE
    source_exists boolean;
    target_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'isActive'
    ) INTO source_exists;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'isactive'
    ) INTO target_exists;

    IF source_exists AND NOT target_exists THEN
        ALTER TABLE public.members RENAME COLUMN "isActive" TO isactive;
        RAISE NOTICE 'Renamed isActive to isactive';
    ELSIF source_exists AND target_exists THEN
        RAISE NOTICE 'Both isActive and isactive exist - manual merge needed';
    ELSIF NOT source_exists AND target_exists THEN
        RAISE NOTICE 'Only lowercase isactive exists - no action needed';
    ELSE
        RAISE NOTICE 'Neither isActive nor isactive found - check your schema';
    END IF;
END $$;

-- Verify the results
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
ORDER BY ordinal_position;
