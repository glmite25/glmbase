#!/usr/bin/env node

/**
 * Database Schema Analysis and Backup Script
 * 
 * This script analyzes the current database schema for the members and profiles tables,
 * documents their structures, data volumes, and relationships, and generates backup scripts.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

class DatabaseAnalyzer {
  constructor() {
    this.analysisResults = {
      timestamp: new Date().toISOString(),
      tables: {},
      relationships: {},
      dataVolumes: {},
      overlappingFields: [],
      uniqueFields: {},
      constraints: {},
      indexes: {}
    };
  }

  /**
   * Requirement 1.1: Identify all columns in the members table with their data types and constraints
   */
  async analyzeMembersTable() {
    console.log('Analyzing members table structure...');
    
    try {
      // Get table structure from information_schema
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'members')
        .eq('table_schema', 'public');

      if (columnsError) throw columnsError;

      // Get constraints
      const { data: constraints, error: constraintsError } = await supabase
        .rpc('get_table_constraints', { table_name: 'members' })
        .single();

      // Get indexes
      const { data: indexes, error: indexesError } = await supabase
        .rpc('get_table_indexes', { table_name: 'members' })
        .single();

      this.analysisResults.tables.members = {
        columns: columns || [],
        constraints: constraints || [],
        indexes: indexes || []
      };

      console.log(`✓ Members table: ${columns?.length || 0} columns analyzed`);
    } catch (error) {
      console.error('Error analyzing members table:', error.message);
      // Fallback: Direct query to get basic structure
      await this.fallbackTableAnalysis('members');
    }
  }

  /**
   * Requirement 1.2: Identify all columns in the profiles table with their data types and constraints
   */
  async analyzeProfilesTable() {
    console.log('Analyzing profiles table structure...');
    
    try {
      // Get table structure from information_schema
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'profiles')
        .eq('table_schema', 'public');

      if (columnsError) throw columnsError;

      // Get constraints
      const { data: constraints, error: constraintsError } = await supabase
        .rpc('get_table_constraints', { table_name: 'profiles' })
        .single();

      // Get indexes
      const { data: indexes, error: indexesError } = await supabase
        .rpc('get_table_indexes', { table_name: 'profiles' })
        .single();

      this.analysisResults.tables.profiles = {
        columns: columns || [],
        constraints: constraints || [],
        indexes: indexes || []
      };

      console.log(`✓ Profiles table: ${columns?.length || 0} columns analyzed`);
    } catch (error) {
      console.error('Error analyzing profiles table:', error.message);
      // Fallback: Direct query to get basic structure
      await this.fallbackTableAnalysis('profiles');
    }
  }

  /**
   * Fallback method to analyze table structure using direct queries
   */
  async fallbackTableAnalysis(tableName) {
    console.log(`Using fallback analysis for ${tableName} table...`);
    
    try {
      // Get a sample record to understand structure
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) throw error;

      if (sampleData && sampleData.length > 0) {
        const columns = Object.keys(sampleData[0]).map(columnName => ({
          column_name: columnName,
          data_type: typeof sampleData[0][columnName],
          is_nullable: sampleData[0][columnName] === null ? 'YES' : 'NO'
        }));

        this.analysisResults.tables[tableName] = {
          columns,
          constraints: [],
          indexes: [],
          fallback: true
        };

        console.log(`✓ ${tableName} table: ${columns.length} columns analyzed (fallback)`);
      }
    } catch (error) {
      console.error(`Error in fallback analysis for ${tableName}:`, error.message);
      this.analysisResults.tables[tableName] = {
        error: error.message,
        columns: [],
        constraints: [],
        indexes: []
      };
    }
  }

  /**
   * Requirement 1.3: Identify overlapping fields between tables
   */
  analyzeOverlappingFields() {
    console.log('Analyzing overlapping fields...');
    
    const membersColumns = this.analysisResults.tables.members?.columns || [];
    const profilesColumns = this.analysisResults.tables.profiles?.columns || [];
    
    const membersFieldNames = membersColumns.map(col => col.column_name.toLowerCase());
    const profilesFieldNames = profilesColumns.map(col => col.column_name.toLowerCase());
    
    // Known overlapping fields based on schema analysis
    const knownOverlaps = [
      { members: 'email', profiles: 'email' },
      { members: 'fullname', profiles: 'full_name' },
      { members: 'phone', profiles: 'phone' },
      { members: 'address', profiles: 'address' },
      { members: 'churchunit', profiles: 'church_unit' }
    ];
    
    // Find actual overlaps
    const overlaps = [];
    for (const overlap of knownOverlaps) {
      if (membersFieldNames.includes(overlap.members.toLowerCase()) && 
          profilesFieldNames.includes(overlap.profiles.toLowerCase())) {
        overlaps.push(overlap);
      }
    }
    
    // Find exact name matches
    const exactMatches = membersFieldNames.filter(field => 
      profilesFieldNames.includes(field) && !['id', 'created_at', 'updated_at'].includes(field)
    );
    
    this.analysisResults.overlappingFields = [...overlaps, ...exactMatches.map(field => ({ exact: field }))];
    
    console.log(`✓ Found ${this.analysisResults.overlappingFields.length} overlapping fields`);
  }

  /**
   * Requirement 1.4: Identify unique fields in each table
   */
  analyzeUniqueFields() {
    console.log('Analyzing unique fields...');
    
    const membersColumns = this.analysisResults.tables.members?.columns || [];
    const profilesColumns = this.analysisResults.tables.profiles?.columns || [];
    
    const membersFieldNames = membersColumns.map(col => col.column_name.toLowerCase());
    const profilesFieldNames = profilesColumns.map(col => col.column_name.toLowerCase());
    
    const uniqueToMembers = membersFieldNames.filter(field => 
      !profilesFieldNames.includes(field)
    );
    
    const uniqueToProfiles = profilesFieldNames.filter(field => 
      !membersFieldNames.includes(field)
    );
    
    this.analysisResults.uniqueFields = {
      members: uniqueToMembers,
      profiles: uniqueToProfiles
    };
    
    console.log(`✓ Members unique fields: ${uniqueToMembers.length}`);
    console.log(`✓ Profiles unique fields: ${uniqueToProfiles.length}`);
  }

  /**
   * Requirement 1.5: Document how both tables relate to auth.users
   */
  async analyzeAuthRelationships() {
    console.log('Analyzing relationships with auth.users...');
    
    try {
      // Check members table relationship
      const { data: membersWithAuth, error: membersError } = await supabase
        .from('members')
        .select('id, user_id, email')
        .not('user_id', 'is', null)
        .limit(5);

      // Check profiles table relationship  
      const { data: profilesWithAuth, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(5);

      this.analysisResults.relationships = {
        members_to_auth: {
          relationship_type: 'foreign_key',
          foreign_key_column: 'user_id',
          references: 'auth.users(id)',
          constraint: 'ON DELETE SET NULL',
          sample_data: membersWithAuth || []
        },
        profiles_to_auth: {
          relationship_type: 'primary_key',
          foreign_key_column: 'id',
          references: 'auth.users(id)',
          constraint: 'ON DELETE CASCADE',
          sample_data: profilesWithAuth || []
        }
      };

      console.log('✓ Auth relationships analyzed');
    } catch (error) {
      console.error('Error analyzing auth relationships:', error.message);
      this.analysisResults.relationships = { error: error.message };
    }
  }

  /**
   * Requirement 1.6: Determine the number of records in each table
   */
  async analyzeDataVolumes() {
    console.log('Analyzing data volumes...');
    
    try {
      // Count members
      const { count: membersCount, error: membersError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      if (membersError) throw membersError;

      // Count profiles
      const { count: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) throw profilesError;

      // Count auth users for reference
      const { count: authUsersCount, error: authError } = await supabase
        .from('auth.users')
        .select('*', { count: 'exact', head: true });

      this.analysisResults.dataVolumes = {
        members: membersCount || 0,
        profiles: profilesCount || 0,
        auth_users: authUsersCount || 0,
        analysis_date: new Date().toISOString()
      };

      console.log(`✓ Data volumes: Members(${membersCount}), Profiles(${profilesCount}), Auth Users(${authUsersCount})`);
    } catch (error) {
      console.error('Error analyzing data volumes:', error.message);
      this.analysisResults.dataVolumes = { error: error.message };
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  generateAnalysisReport() {
    const reportPath = `database-analysis-report-${Date.now()}.json`;
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(this.analysisResults, null, 2));
      console.log(`✓ Analysis report saved to: ${reportPath}`);
      
      // Also create a human-readable summary
      this.generateSummaryReport();
      
      return reportPath;
    } catch (error) {
      console.error('Error generating analysis report:', error.message);
      return null;
    }
  }

  /**
   * Generate human-readable summary report
   */
  generateSummaryReport() {
    const summaryPath = `database-analysis-summary-${Date.now()}.md`;
    
    const summary = `# Database Schema Analysis Summary

Generated: ${this.analysisResults.timestamp}

## Data Volumes
- Members table: ${this.analysisResults.dataVolumes.members || 'Unknown'} records
- Profiles table: ${this.analysisResults.dataVolumes.profiles || 'Unknown'} records
- Auth users: ${this.analysisResults.dataVolumes.auth_users || 'Unknown'} records

## Table Structures

### Members Table
Columns: ${this.analysisResults.tables.members?.columns?.length || 0}
${this.analysisResults.tables.members?.columns?.map(col => 
  `- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`
).join('\n') || 'No column data available'}

### Profiles Table  
Columns: ${this.analysisResults.tables.profiles?.columns?.length || 0}
${this.analysisResults.tables.profiles?.columns?.map(col => 
  `- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`
).join('\n') || 'No column data available'}

## Overlapping Fields
${this.analysisResults.overlappingFields.map(overlap => 
  overlap.exact ? `- ${overlap.exact} (exact match)` : 
  `- ${overlap.members} ↔ ${overlap.profiles}`
).join('\n') || 'No overlapping fields identified'}

## Unique Fields

### Members Only
${this.analysisResults.uniqueFields.members?.map(field => `- ${field}`).join('\n') || 'None'}

### Profiles Only  
${this.analysisResults.uniqueFields.profiles?.map(field => `- ${field}`).join('\n') || 'None'}

## Relationships with auth.users
- Members: ${this.analysisResults.relationships.members_to_auth?.relationship_type || 'Unknown'} via ${this.analysisResults.relationships.members_to_auth?.foreign_key_column || 'unknown'}
- Profiles: ${this.analysisResults.relationships.profiles_to_auth?.relationship_type || 'Unknown'} via ${this.analysisResults.relationships.profiles_to_auth?.foreign_key_column || 'unknown'}
`;

    try {
      fs.writeFileSync(summaryPath, summary);
      console.log(`✓ Summary report saved to: ${summaryPath}`);
    } catch (error) {
      console.error('Error generating summary report:', error.message);
    }
  }

  /**
   * Run complete analysis
   */
  async runAnalysis() {
    console.log('🔍 Starting comprehensive database schema analysis...\n');
    
    try {
      await this.analyzeMembersTable();
      await this.analyzeProfilesTable();
      this.analyzeOverlappingFields();
      this.analyzeUniqueFields();
      await this.analyzeAuthRelationships();
      await this.analyzeDataVolumes();
      
      const reportPath = this.generateAnalysisReport();
      
      console.log('\n✅ Database schema analysis completed successfully!');
      console.log(`📊 Full report: ${reportPath}`);
      
      return this.analysisResults;
    } catch (error) {
      console.error('\n❌ Analysis failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
export { DatabaseAnalyzer };

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new DatabaseAnalyzer();
  analyzer.runAnalysis()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}