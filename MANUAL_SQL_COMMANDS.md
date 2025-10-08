# Manual SQL Commands to Fix Database Issues

## Issue Summary
The database consolidation is missing the `genotype` and `address` columns in the `members` table, causing TypeScript errors in the test file.

## SQL Commands to Run

Run these commands in your Supabase SQL editor or database console:

### 1. Add missing genotype column to members table

```sql
-- Check if genotype column exists in members table, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'genotype'
    ) THEN
        ALTER TABLE public.members ADD COLUMN genotype VARCHAR(10);
        
        -- Add constraint for valid genotype values
        ALTER TABLE public.members ADD CONSTRAINT valid_genotype 
        CHECK (genotype IS NULL OR genotype IN ('AA', 'AS', 'SS', 'AC', 'SC', 'CC'));
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.members.genotype IS 'Blood genotype from profiles table (AA, AS, SS, AC, SC, CC)';
        
        RAISE NOTICE 'Added genotype column to members table';
    ELSE
        RAISE NOTICE 'Genotype column already exists in members table';
    END IF;
END $$;
```

### 2. Add missing address column to members table

```sql
-- Check if address column exists in members table, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'members'
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.members ADD COLUMN address TEXT;
        
        -- Add comment for documentation
        COMMENT ON COLUMN public.members.address IS 'Physical address of the member';
        
        RAISE NOTICE 'Added address column to members table';
    ELSE
        RAISE NOTICE 'Address column already exists in members table';
    END IF;
END $$;
```

### 3. Verify the columns were added

```sql
-- Verify both columns exist
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
AND column_name IN ('genotype', 'address')
ORDER BY column_name;
```

### 4. Show current members table structure

```sql
-- Show complete members table structure
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'members'
ORDER BY ordinal_position;
```

## After Running SQL Commands

Once you've run these SQL commands:

1. The `genotype` column will be added to the `members` table with proper constraints
2. The `address` column will be added to the `members` table
3. The TypeScript errors in the test file should be resolved
4. Task 7 "Comprehensive Testing and Validation" will be properly completed

## Expected Results

After running the commands, you should see:
- `genotype VARCHAR(10)` column with CHECK constraint
- `address TEXT` column
- No more TypeScript errors about missing properties
- All member management tests should pass

## Verification

You can verify the fix worked by running:
```sql
SELECT id, fullname, email, genotype, address 
FROM members 
LIMIT 5;
```

This should return results without errors, showing the new columns (which may be NULL for existing records).