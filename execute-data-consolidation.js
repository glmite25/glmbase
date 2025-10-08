import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function executeDataConsolidation() {
  try {
    console.log('Starting data consolidation process...\n');
    
    // Step 1: Execute the main consolidation function
    console.log('Step 1: Executing data consolidation from profiles to enhanced members table...');
    const { data: consolidationResults, error: consolidationError } = await supabase
      .rpc('consolidate_members_and_profiles');
    
    if (consolidationError) {
      console.error('Error during consolidation:', consolidationError);
      return;
    }
    
    console.log('Consolidation results:');
    consolidationResults.forEach(result => {
      console.log(`- ${result.operation_type}: ${result.status} - ${result.notes}`);
      if (result.conflicts_resolved && result.conflicts_resolved.length > 0) {
        result.conflicts_resolved.forEach(conflict => {
          console.log(`  * Conflict resolved: ${conflict}`);
        });
      }
    });
    
    // Step 2: Resolve all data conflicts
    console.log('\nStep 2: Resolving data conflicts...');
    const { data: conflictResults, error: conflictError } = await supabase
      .rpc('resolve_all_data_conflicts');
    
    if (conflictError) {
      console.error('Error resolving conflicts:', conflictError);
      return;
    }
    
    console.log('Conflict resolution results:');
    conflictResults.forEach(result => {
      console.log(`- ${result.operation}: ${result.status} - ${result.details}`);
    });
    
    // Step 3: Validate data integrity
    console.log('\nStep 3: Validating data integrity...');
    const { data: validationResults, error: validationError } = await supabase
      .rpc('validate_consolidation_integrity');
    
    if (validationError) {
      console.error('Error during validation:', validationError);
      return;
    }
    
    console.log('Data integrity validation results:');
    validationResults.forEach(result => {
      const status = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : 'ℹ';
      console.log(`${status} ${result.check_name}: ${result.details}`);
    });
    
    // Step 4: Check final record counts
    console.log('\nStep 4: Checking final record counts...');
    const { count: finalCount, error: countError } = await supabase
      .from('members_enhanced')
      .select('*', { count: 'exact', head: true });
    
    if (!countError) {
      console.log(`✓ Enhanced members table now contains: ${finalCount} records`);
    }
    
    // Step 5: Sample some consolidated data
    console.log('\nStep 5: Sampling consolidated data...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('members_enhanced')
      .select('id, email, fullname, genotype, role, category, churchunit')
      .limit(3);
    
    if (!sampleError && sampleData) {
      console.log('Sample consolidated records:');
      sampleData.forEach(record => {
        console.log(`- ${record.fullname} (${record.email}) - Role: ${record.role}, Category: ${record.category}, Genotype: ${record.genotype || 'N/A'}`);
      });
    }
    
    console.log('\n✅ Data consolidation completed successfully!');
    
  } catch (err) {
    console.error('Error during data consolidation:', err.message);
  }
}

executeDataConsolidation();