-- Clear Enhanced Members Table
-- Run this ONLY if you need to start the consolidation process fresh
-- WARNING: This will delete all data in the members_enhanced table

-- Log the clear operation
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'CLEAR_ENHANCED_TABLE_START',
    (SELECT COUNT(*) FROM public.members_enhanced),
    'IN_PROGRESS',
    jsonb_build_object(
        'message', 'Starting to clear enhanced members table',
        'records_before_clear', (SELECT COUNT(*) FROM public.members_enhanced),
        'timestamp', NOW()
    )
);

-- Clear the enhanced members table
TRUNCATE TABLE public.members_enhanced CASCADE;

-- Log the completion
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'CLEAR_ENHANCED_TABLE_COMPLETE',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Enhanced members table cleared successfully',
        'records_after_clear', (SELECT COUNT(*) FROM public.members_enhanced),
        'timestamp', NOW()
    )
);

SELECT 'Enhanced members table cleared successfully!' as status,
       'You can now run manual-data-consolidation.sql' as next_step;