-- Create Consolidation Log Table
-- Run this FIRST before running migration-validation-rollback.sql

-- Create consolidation log table for tracking migration operations
CREATE TABLE IF NOT EXISTS public.consolidation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Keep for compatibility
    operation_type TEXT NOT NULL,
    records_affected INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    details JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_by TEXT DEFAULT 'system'
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_consolidation_log_operation_timestamp ON public.consolidation_log(operation_timestamp);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_created_at ON public.consolidation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_operation_type ON public.consolidation_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_consolidation_log_status ON public.consolidation_log(status);

-- Add comment for documentation
COMMENT ON TABLE public.consolidation_log IS 'Tracks all database consolidation operations for audit and rollback purposes';

-- Insert initial log entry
INSERT INTO public.consolidation_log (
    operation_type, 
    records_affected, 
    status, 
    details
) VALUES (
    'CONSOLIDATION_LOG_CREATED',
    0,
    'SUCCESS',
    jsonb_build_object(
        'message', 'Consolidation log table created successfully',
        'created_by', 'migration_setup'
    )
);

SELECT 'Consolidation log table created successfully!' as status;