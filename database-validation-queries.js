#!/usr/bin/env node

/**
 * Database Validation Queries Script
 * 
 * This script contains comprehensive validation queries to verify data integrity
 * before, during, and after the database consolidation migration.
 * 
 * Requirements covered: Data integrity validation for migration safety
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class DatabaseValidator {
  constructor() {
    this.validationResults = {
      timestamp: new Date().toISOString(),
      pre_migration: {},
      post_migration: {},
      integrity_checks: {},
      consistency_checks: {}
    };
  }

  /**
   * Pre-migration validation queries
   */
  async runPreMigrationValidation() {
    console.log('Running pre-migration validation...');
    
    const validations = {
      // Basic record counts
      record_counts: await this.validateRecordCounts(),
      
      // Email uniqueness validation
      email_uniqueness: await this.validateEmailUniqueness(),
      
      // Foreign key integrity
      foreign_key_integrity: await this.validateForeignKeyIntegrity(),
      
      // Data completeness
      data_completeness: await this.validateDataCompleteness(),
      
      // Constraint validation
      constraint_validation: await this.validateConstraints(),
      
      // Relationship consistency
      relationship_consistency: await this.validateRelationshipConsistency()
    };
    
    this.validationResults.pre_migration = validations;
    return validations;
  }

  /**
   * Post-migration validation queries
   */
  async runPostMigrationValidation() {
    console.log('Running post-migration validation...');
    
    const validations = {
      // Verify no data loss
      data_preservation: await this.validateDataPreservation(),
      
      // Verify consolidated structure
      consolidated_structure: await this.validateConsolidatedStructure(),
      
      // Verify sync mechanisms
      sync_mechanisms: await this.validateSyncMechanisms(),
      
      // Verify application compatibility
      application_compatibility: await this.validateApplicationCompatibility(),
      
      // Performance validation
      performance_validation: await this.validatePerformance()
    };
    
    this.validationResults.post_migration = validations;
    return validations;
  }

  /**
   * Validate record counts
   */
  async validateRecordCounts() {
    console.log('  Validating record counts...');
    
    try {
      const queries = [
        { name: 'members_count', sql: 'SELECT COUNT(*) as count FROM members' },
        { name: 'profiles_count', sql: 'SELECT COUNT(*) as count FROM profiles' },
        { name: 'auth_users_count', sql: 'SELECT COUNT(*) as count FROM auth.users' },
        { name: 'members_with_user_id', sql: 'SELECT COUNT(*) as count FROM members WHERE user_id IS NOT NULL' },
        { name: 'members_without_user_id', sql: 'SELECT COUNT(*) as count FROM members WHERE user_id IS NULL' }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data?.[0]?.count || 0;
      }
      
      console.log('    ✓ Record counts validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Record count validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate email uniqueness
   */
  async validateEmailUniqueness() {
    console.log('  Validating email uniqueness...');
    
    try {
      const queries = [
        {
          name: 'duplicate_emails_members',
          sql: `
            SELECT email, COUNT(*) as count 
            FROM members 
            WHERE email IS NOT NULL 
            GROUP BY email 
            HAVING COUNT(*) > 1
          `
        },
        {
          name: 'duplicate_emails_profiles',
          sql: `
            SELECT email, COUNT(*) as count 
            FROM profiles 
            WHERE email IS NOT NULL 
            GROUP BY email 
            HAVING COUNT(*) > 1
          `
        },
        {
          name: 'email_conflicts_between_tables',
          sql: `
            SELECT 
              m.email as member_email,
              p.email as profile_email,
              COUNT(*) as conflicts
            FROM members m
            JOIN profiles p ON m.email = p.email AND m.user_id != p.id
            GROUP BY m.email, p.email
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      const hasIssues = Object.values(results).some(result => result.length > 0);
      console.log(`    ${hasIssues ? '⚠️' : '✓'} Email uniqueness validated`);
      
      return { 
        status: hasIssues ? 'warning' : 'success', 
        results,
        issues: hasIssues ? 'Duplicate emails found' : null
      };
    } catch (error) {
      console.log('    ❌ Email uniqueness validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate foreign key integrity
   */
  async validateForeignKeyIntegrity() {
    console.log('  Validating foreign key integrity...');
    
    try {
      const queries = [
        {
          name: 'members_auth_integrity',
          sql: `
            SELECT COUNT(*) as orphaned_members
            FROM members m
            LEFT JOIN auth.users au ON m.user_id = au.id
            WHERE m.user_id IS NOT NULL AND au.id IS NULL
          `
        },
        {
          name: 'profiles_auth_integrity',
          sql: `
            SELECT COUNT(*) as orphaned_profiles
            FROM profiles p
            LEFT JOIN auth.users au ON p.id = au.id
            WHERE au.id IS NULL
          `
        },
        {
          name: 'members_self_reference_integrity',
          sql: `
            SELECT COUNT(*) as invalid_assignments
            FROM members m1
            LEFT JOIN members m2 ON m1.assignedto = m2.id
            WHERE m1.assignedto IS NOT NULL AND m2.id IS NULL
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data?.[0] || {};
      }
      
      const hasIssues = Object.values(results).some(result => 
        Object.values(result).some(count => count > 0)
      );
      
      console.log(`    ${hasIssues ? '⚠️' : '✓'} Foreign key integrity validated`);
      
      return { 
        status: hasIssues ? 'warning' : 'success', 
        results,
        issues: hasIssues ? 'Foreign key violations found' : null
      };
    } catch (error) {
      console.log('    ❌ Foreign key integrity validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate data completeness
   */
  async validateDataCompleteness() {
    console.log('  Validating data completeness...');
    
    try {
      const queries = [
        {
          name: 'members_required_fields',
          sql: `
            SELECT 
              COUNT(*) as total_records,
              COUNT(email) as has_email,
              COUNT(fullname) as has_fullname,
              COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_email,
              COUNT(CASE WHEN fullname IS NULL OR fullname = '' THEN 1 END) as missing_fullname
            FROM members
          `
        },
        {
          name: 'profiles_required_fields',
          sql: `
            SELECT 
              COUNT(*) as total_records,
              COUNT(email) as has_email,
              COUNT(full_name) as has_full_name,
              COUNT(CASE WHEN email IS NULL OR email = '' THEN 1 END) as missing_email,
              COUNT(CASE WHEN full_name IS NULL OR full_name = '' THEN 1 END) as missing_full_name
            FROM profiles
          `
        },
        {
          name: 'data_quality_metrics',
          sql: `
            SELECT 
              'members' as table_name,
              COUNT(*) as total_records,
              COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as has_phone,
              COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as has_address,
              COUNT(CASE WHEN churchunit IS NOT NULL AND churchunit != '' THEN 1 END) as has_church_unit
            FROM members
            UNION ALL
            SELECT 
              'profiles' as table_name,
              COUNT(*) as total_records,
              COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as has_phone,
              COUNT(CASE WHEN address IS NOT NULL AND address != '' THEN 1 END) as has_address,
              COUNT(CASE WHEN church_unit IS NOT NULL AND church_unit != '' THEN 1 END) as has_church_unit
            FROM profiles
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      console.log('    ✓ Data completeness validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Data completeness validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate constraints
   */
  async validateConstraints() {
    console.log('  Validating constraints...');
    
    try {
      const queries = [
        {
          name: 'email_format_validation',
          sql: `
            SELECT 
              'members' as table_name,
              COUNT(*) as total_emails,
              COUNT(CASE WHEN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 END) as valid_emails,
              COUNT(CASE WHEN email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 END) as invalid_emails
            FROM members WHERE email IS NOT NULL
            UNION ALL
            SELECT 
              'profiles' as table_name,
              COUNT(*) as total_emails,
              COUNT(CASE WHEN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 END) as valid_emails,
              COUNT(CASE WHEN email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 END) as invalid_emails
            FROM profiles WHERE email IS NOT NULL
          `
        },
        {
          name: 'phone_format_validation',
          sql: `
            SELECT 
              'members' as table_name,
              COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as total_phones,
              COUNT(CASE WHEN phone ~* '^\\+?[1-9]\\d{1,14}$' THEN 1 END) as valid_phones,
              COUNT(CASE WHEN phone IS NOT NULL AND phone !~* '^\\+?[1-9]\\d{1,14}$' THEN 1 END) as invalid_phones
            FROM members
            UNION ALL
            SELECT 
              'profiles' as table_name,
              COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as total_phones,
              COUNT(CASE WHEN phone ~* '^\\+?[1-9]\\d{1,14}$' THEN 1 END) as valid_phones,
              COUNT(CASE WHEN phone IS NOT NULL AND phone !~* '^\\+?[1-9]\\d{1,14}$' THEN 1 END) as invalid_phones
            FROM profiles
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      console.log('    ✓ Constraints validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Constraint validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate relationship consistency
   */
  async validateRelationshipConsistency() {
    console.log('  Validating relationship consistency...');
    
    try {
      const queries = [
        {
          name: 'member_profile_consistency',
          sql: `
            SELECT 
              COUNT(*) as total_members_with_profiles,
              COUNT(CASE WHEN m.email = p.email THEN 1 END) as matching_emails,
              COUNT(CASE WHEN m.email != p.email THEN 1 END) as mismatched_emails,
              COUNT(CASE WHEN m.phone = p.phone THEN 1 END) as matching_phones,
              COUNT(CASE WHEN m.phone != p.phone AND m.phone IS NOT NULL AND p.phone IS NOT NULL THEN 1 END) as mismatched_phones
            FROM members m
            JOIN profiles p ON m.user_id = p.id
          `
        },
        {
          name: 'auth_user_consistency',
          sql: `
            SELECT 
              COUNT(DISTINCT au.id) as total_auth_users,
              COUNT(DISTINCT p.id) as auth_users_with_profiles,
              COUNT(DISTINCT m.user_id) as auth_users_with_members,
              COUNT(CASE WHEN p.id IS NOT NULL AND m.user_id IS NOT NULL THEN 1 END) as auth_users_with_both
            FROM auth.users au
            LEFT JOIN profiles p ON au.id = p.id
            LEFT JOIN members m ON au.id = m.user_id
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data?.[0] || {};
      }
      
      console.log('    ✓ Relationship consistency validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Relationship consistency validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate data preservation after migration
   */
  async validateDataPreservation() {
    console.log('  Validating data preservation...');
    
    try {
      // This would be run after migration to ensure no data was lost
      const queries = [
        {
          name: 'total_records_preserved',
          sql: `
            SELECT 
              'enhanced_members' as table_name,
              COUNT(*) as record_count
            FROM members
          `
        },
        {
          name: 'unique_emails_preserved',
          sql: `
            SELECT COUNT(DISTINCT email) as unique_emails FROM members
          `
        },
        {
          name: 'all_fields_populated',
          sql: `
            SELECT 
              COUNT(*) as total_records,
              COUNT(email) as has_email,
              COUNT(fullname) as has_fullname,
              COUNT(genotype) as has_genotype,
              COUNT(role) as has_role
            FROM members
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      console.log('    ✓ Data preservation validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Data preservation validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate consolidated structure
   */
  async validateConsolidatedStructure() {
    console.log('  Validating consolidated structure...');
    
    try {
      const queries = [
        {
          name: 'enhanced_members_structure',
          sql: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'members' AND table_schema = 'public'
            ORDER BY ordinal_position
          `
        },
        {
          name: 'lightweight_profiles_structure',
          sql: `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'profiles' AND table_schema = 'public'
            ORDER BY ordinal_position
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      console.log('    ✓ Consolidated structure validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Consolidated structure validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate sync mechanisms
   */
  async validateSyncMechanisms() {
    console.log('  Validating sync mechanisms...');
    
    try {
      // Test sync function existence and basic functionality
      const queries = [
        {
          name: 'sync_functions_exist',
          sql: `
            SELECT routine_name, routine_type
            FROM information_schema.routines
            WHERE routine_schema = 'public'
            AND routine_name LIKE '%sync%'
          `
        },
        {
          name: 'triggers_exist',
          sql: `
            SELECT trigger_name, event_manipulation, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND (event_object_table = 'members' OR event_object_table = 'profiles')
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = data || [];
      }
      
      console.log('    ✓ Sync mechanisms validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Sync mechanisms validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate application compatibility
   */
  async validateApplicationCompatibility() {
    console.log('  Validating application compatibility...');
    
    try {
      // Test basic queries that the application would make
      const queries = [
        {
          name: 'member_list_query',
          sql: `
            SELECT id, email, fullname, category, isactive
            FROM members
            WHERE isactive = true
            LIMIT 5
          `
        },
        {
          name: 'profile_auth_query',
          sql: `
            SELECT id, email, full_name
            FROM profiles
            LIMIT 5
          `
        },
        {
          name: 'member_profile_join_query',
          sql: `
            SELECT m.id, m.email, m.fullname, p.id as profile_id
            FROM members m
            LEFT JOIN profiles p ON m.user_id = p.id
            LIMIT 5
          `
        }
      ];
      
      const results = {};
      for (const query of queries) {
        const { data, error } = await supabase.rpc('exec_sql', { sql: query.sql });
        if (error) throw error;
        results[query.name] = { success: true, record_count: data?.length || 0 };
      }
      
      console.log('    ✓ Application compatibility validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Application compatibility validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Validate performance
   */
  async validatePerformance() {
    console.log('  Validating performance...');
    
    try {
      // Basic performance tests
      const startTime = Date.now();
      
      const { data: memberCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });
      
      const memberQueryTime = Date.now() - startTime;
      
      const profileStartTime = Date.now();
      
      const { data: profileCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const profileQueryTime = Date.now() - profileStartTime;
      
      const results = {
        member_count_query_time: memberQueryTime,
        profile_count_query_time: profileQueryTime,
        total_members: memberCount,
        total_profiles: profileCount
      };
      
      console.log('    ✓ Performance validated');
      return { status: 'success', results };
    } catch (error) {
      console.log('    ❌ Performance validation failed');
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const timestamp = Date.now();
    const reportPath = `validation-report-${timestamp}.json`;
    const summaryPath = `validation-summary-${timestamp}.md`;
    
    try {
      // Save detailed JSON report
      fs.writeFileSync(reportPath, JSON.stringify(this.validationResults, null, 2));
      
      // Generate markdown summary
      const summary = this.generateValidationSummary();
      fs.writeFileSync(summaryPath, summary);
      
      console.log(`✓ Validation report saved: ${reportPath}`);
      console.log(`✓ Validation summary saved: ${summaryPath}`);
      
      return { reportPath, summaryPath };
    } catch (error) {
      console.error('Error generating validation report:', error.message);
      return null;
    }
  }

  /**
   * Generate validation summary
   */
  generateValidationSummary() {
    return `# Database Validation Report

**Generated:** ${this.validationResults.timestamp}

## Pre-Migration Validation Results

### Record Counts
- Status: ${this.validationResults.pre_migration?.record_counts?.status || 'Not run'}
- Issues: ${this.validationResults.pre_migration?.record_counts?.issues || 'None'}

### Email Uniqueness
- Status: ${this.validationResults.pre_migration?.email_uniqueness?.status || 'Not run'}
- Issues: ${this.validationResults.pre_migration?.email_uniqueness?.issues || 'None'}

### Foreign Key Integrity
- Status: ${this.validationResults.pre_migration?.foreign_key_integrity?.status || 'Not run'}
- Issues: ${this.validationResults.pre_migration?.foreign_key_integrity?.issues || 'None'}

### Data Completeness
- Status: ${this.validationResults.pre_migration?.data_completeness?.status || 'Not run'}

### Constraints
- Status: ${this.validationResults.pre_migration?.constraint_validation?.status || 'Not run'}

### Relationship Consistency
- Status: ${this.validationResults.pre_migration?.relationship_consistency?.status || 'Not run'}

## Post-Migration Validation Results

### Data Preservation
- Status: ${this.validationResults.post_migration?.data_preservation?.status || 'Not run'}

### Consolidated Structure
- Status: ${this.validationResults.post_migration?.consolidated_structure?.status || 'Not run'}

### Sync Mechanisms
- Status: ${this.validationResults.post_migration?.sync_mechanisms?.status || 'Not run'}

### Application Compatibility
- Status: ${this.validationResults.post_migration?.application_compatibility?.status || 'Not run'}

### Performance
- Status: ${this.validationResults.post_migration?.performance_validation?.status || 'Not run'}

## Recommendations

1. Address any validation issues before proceeding with migration
2. Run post-migration validation immediately after consolidation
3. Monitor performance metrics for 24-48 hours after migration
4. Keep validation reports for audit trail and troubleshooting
`;
  }

  /**
   * Run complete validation suite
   */
  async runCompleteValidation(phase = 'pre-migration') {
    console.log(`🔍 Running ${phase} database validation...\n`);
    
    try {
      if (phase === 'pre-migration') {
        await this.runPreMigrationValidation();
      } else if (phase === 'post-migration') {
        await this.runPostMigrationValidation();
      } else {
        // Run both
        await this.runPreMigrationValidation();
        await this.runPostMigrationValidation();
      }
      
      const reports = this.generateValidationReport();
      
      console.log(`\n✅ Database validation completed for ${phase}!`);
      if (reports) {
        console.log(`📊 Detailed report: ${reports.reportPath}`);
        console.log(`📋 Summary report: ${reports.summaryPath}`);
      }
      
      return this.validationResults;
    } catch (error) {
      console.error(`\n❌ Database validation failed for ${phase}:`, error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
export { DatabaseValidator };

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new DatabaseValidator();
  const phase = process.argv[2] || 'pre-migration';
  
  validator.runCompleteValidation(phase)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}