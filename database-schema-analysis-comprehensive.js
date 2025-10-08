#!/usr/bin/env node

/**
 * Comprehensive Database Schema Analysis Script
 * 
 * This script provides a complete analysis of the current database schema,
 * focusing on the members and profiles tables for consolidation planning.
 * 
 * Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
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

class ComprehensiveSchemaAnalyzer {
  constructor() {
    this.analysis = {
      timestamp: new Date().toISOString(),
      members_table: {},
      profiles_table: {},
      data_volumes: {},
      relationships: {},
      overlapping_fields: [],
      unique_fields: {},
      constraints_analysis: {},
      consolidation_recommendations: {}
    };
  }

  /**
   * Get detailed table structure using sample data
   */
  async getTableStructure(tableName) {
    console.log(`Analyzing ${tableName} table structure...`);
    
    try {
      // Get sample data to infer structure
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);

      if (error) throw error;

      if (!sampleData || sampleData.length === 0) {
        console.log(`⚠️  No data found in ${tableName} table`);
        return { columns: [], constraints: [], indexes: [], empty: true };
      }

      // Infer column structure from sample data
      const columns = Object.keys(sampleData[0]).map(key => ({
        column_name: key,
        data_type: this.inferDataType(sampleData[0][key]),
        is_nullable: sampleData[0][key] === null ? 'YES' : 'NO',
        sample_values: sampleData.map(row => row[key]).filter(val => val !== null).slice(0, 3)
      }));

      console.log(`✓ ${tableName} table: ${columns.length} columns analyzed`);
      
      return {
        columns,
        constraints: [], // Would need additional queries for full constraint info
        indexes: [], // Would need additional queries for index info
        sample_data: sampleData
      };
    } catch (error) {
      console.error(`Error analyzing ${tableName} structure:`, error.message);
      return { error: error.message, columns: [], constraints: [], indexes: [] };
    }
  }

  /**
   * Infer data type from JavaScript value
   */
  inferDataType(value) {
    if (value === null) return 'nullable';
    if (typeof value === 'string') {
      if (value.includes('@')) return 'email';
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date/timestamp';
      if (value.length > 100) return 'text';
      return 'varchar';
    }
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'numeric';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'json';
    return 'unknown';
  }

  /**
   * Analyze data volumes and distribution
   */
  async analyzeDataVolumes() {
    console.log('Analyzing data volumes...');
    
    try {
      // Get record counts
      const { count: membersCount, error: membersError } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      if (membersError) throw membersError;

      const { count: profilesCount, error: profilesError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (profilesError) throw profilesError;

      // Get sample data for analysis
      const { data: membersSample } = await supabase
        .from('members')
        .select('*')
        .limit(10);

      const { data: profilesSample } = await supabase
        .from('profiles')
        .select('*')
        .limit(10);

      this.analysis.data_volumes = {
        members: {
          count: membersCount || 0,
          sample: membersSample || []
        },
        profiles: {
          count: profilesCount || 0,
          sample: profilesSample || []
        },
        analysis_timestamp: new Date().toISOString()
      };

      console.log(`✓ Members: ${membersCount} records, Profiles: ${profilesCount} records`);
    } catch (error) {
      console.error('Error analyzing data volumes:', error.message);
      this.analysis.data_volumes = { error: error.message };
    }
  }

  /**
   * Analyze relationships between tables
   */
  async analyzeRelationships() {
    console.log('Analyzing table relationships...');
    
    try {
      // Get members with user_id
      const { data: membersWithUserIds } = await supabase
        .from('members')
        .select('id, user_id, email')
        .not('user_id', 'is', null)
        .limit(10);

      // Get all profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(10);

      // Count relationships
      const { count: membersWithProfiles } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'is', null);

      const { count: membersWithoutProfiles } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);

      this.analysis.relationships = {
        members_to_auth: {
          relationship_type: 'foreign_key',
          foreign_key_column: 'user_id',
          references: 'auth.users(id)',
          members_with_auth_link: membersWithProfiles || 0,
          members_without_auth_link: membersWithoutProfiles || 0,
          sample_data: membersWithUserIds || []
        },
        profiles_to_auth: {
          relationship_type: 'primary_key',
          foreign_key_column: 'id',
          references: 'auth.users(id)',
          sample_data: allProfiles || []
        }
      };

      console.log('✓ Relationships analyzed');
    } catch (error) {
      console.error('Error analyzing relationships:', error.message);
      this.analysis.relationships = { error: error.message };
    }
  }

  /**
   * Identify overlapping and unique fields
   */
  analyzeFieldOverlaps() {
    console.log('Analyzing field overlaps...');
    
    const membersColumns = this.analysis.members_table.columns || [];
    const profilesColumns = this.analysis.profiles_table.columns || [];
    
    const membersFields = membersColumns.map(col => col.column_name.toLowerCase());
    const profilesFields = profilesColumns.map(col => col.column_name.toLowerCase());
    
    // Known semantic overlaps based on schema analysis
    const semanticOverlaps = [
      { members: 'email', profiles: 'email', type: 'exact_match' },
      { members: 'fullname', profiles: 'full_name', type: 'semantic_match' },
      { members: 'phone', profiles: 'phone', type: 'exact_match' },
      { members: 'address', profiles: 'address', type: 'exact_match' },
      { members: 'churchunit', profiles: 'church_unit', type: 'semantic_match' }
    ];
    
    // Filter to actual overlaps
    const actualOverlaps = semanticOverlaps.filter(overlap => 
      membersFields.includes(overlap.members.toLowerCase()) && 
      profilesFields.includes(overlap.profiles.toLowerCase())
    );
    
    // Find unique fields
    const uniqueToMembers = membersFields.filter(field => 
      !profilesFields.includes(field) && 
      !['id', 'created_at', 'updated_at'].includes(field)
    );
    
    const uniqueToProfiles = profilesFields.filter(field => 
      !membersFields.includes(field) && 
      !['id', 'created_at', 'updated_at'].includes(field)
    );
    
    this.analysis.overlapping_fields = actualOverlaps;
    this.analysis.unique_fields = {
      members_only: uniqueToMembers,
      profiles_only: uniqueToProfiles
    };
    
    console.log(`✓ Found ${actualOverlaps.length} overlapping fields`);
    console.log(`✓ Members unique: ${uniqueToMembers.length}, Profiles unique: ${uniqueToProfiles.length}`);
  }

  /**
   * Generate consolidation recommendations
   */
  generateConsolidationRecommendations() {
    console.log('Generating consolidation recommendations...');
    
    const membersCount = this.analysis.data_volumes.members?.count || 0;
    const profilesCount = this.analysis.data_volumes.profiles?.count || 0;
    const overlapsCount = this.analysis.overlapping_fields.length;
    const membersUniqueCount = this.analysis.unique_fields.members_only?.length || 0;
    const profilesUniqueCount = this.analysis.unique_fields.profiles_only?.length || 0;
    
    this.analysis.consolidation_recommendations = {
      strategy: 'enhanced_members_table',
      rationale: [
        `Members table has ${membersCount} records vs ${profilesCount} profiles`,
        `${overlapsCount} overlapping fields create data redundancy`,
        `Members table has ${membersUniqueCount} unique church-specific fields`,
        `Profiles table has ${profilesUniqueCount} unique authentication fields`
      ],
      approach: {
        primary_table: 'members',
        secondary_table: 'profiles',
        consolidation_method: 'merge_into_enhanced_members',
        preserve_profiles: 'lightweight_auth_only'
      },
      migration_steps: [
        'Create enhanced members table with all fields',
        'Migrate data from both tables with conflict resolution',
        'Update profiles table to lightweight structure',
        'Update application code and database functions',
        'Implement bidirectional sync mechanisms'
      ],
      risk_assessment: {
        data_loss_risk: 'low',
        application_impact: 'medium',
        rollback_complexity: 'medium',
        testing_requirements: 'high'
      }
    };
    
    console.log('✓ Consolidation recommendations generated');
  }

  /**
   * Save comprehensive analysis report
   */
  saveAnalysisReport() {
    const timestamp = Date.now();
    const reportPath = `comprehensive-schema-analysis-${timestamp}.json`;
    const summaryPath = `schema-analysis-summary-${timestamp}.md`;
    
    try {
      // Save detailed JSON report
      fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
      
      // Generate markdown summary
      const summary = this.generateMarkdownSummary();
      fs.writeFileSync(summaryPath, summary);
      
      console.log(`✓ Comprehensive report saved: ${reportPath}`);
      console.log(`✓ Summary report saved: ${summaryPath}`);
      
      return { reportPath, summaryPath };
    } catch (error) {
      console.error('Error saving analysis report:', error.message);
      return null;
    }
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary() {
    const membersCount = this.analysis.data_volumes.members?.count || 0;
    const profilesCount = this.analysis.data_volumes.profiles?.count || 0;
    
    return `# Comprehensive Database Schema Analysis

**Generated:** ${this.analysis.timestamp}

## Executive Summary

The analysis reveals significant overlap between the \`members\` and \`profiles\` tables, with ${this.analysis.overlapping_fields.length} overlapping fields creating data redundancy. The recommended approach is to consolidate into an enhanced \`members\` table while maintaining a lightweight \`profiles\` table for authentication.

## Data Volumes
- **Members Table:** ${membersCount} records
- **Profiles Table:** ${profilesCount} records

## Schema Analysis

### Members Table Structure
${this.analysis.members_table.columns?.map(col => 
  `- \`${col.column_name}\`: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`
).join('\n') || 'Structure analysis pending'}

### Profiles Table Structure  
${this.analysis.profiles_table.columns?.map(col => 
  `- \`${col.column_name}\`: ${col.data_type}${col.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`
).join('\n') || 'Structure analysis pending'}

## Field Analysis

### Overlapping Fields
${this.analysis.overlapping_fields.map(overlap => 
  `- \`${overlap.members}\` ↔ \`${overlap.profiles}\` (${overlap.type})`
).join('\n') || 'No overlaps identified'}

### Unique to Members
${this.analysis.unique_fields.members_only?.map(field => `- \`${field}\``).join('\n') || 'None'}

### Unique to Profiles
${this.analysis.unique_fields.profiles_only?.map(field => `- \`${field}\``).join('\n') || 'None'}

## Consolidation Recommendation

**Strategy:** ${this.analysis.consolidation_recommendations.strategy || 'Enhanced Members Table'}

**Rationale:**
${this.analysis.consolidation_recommendations.rationale?.map(reason => `- ${reason}`).join('\n') || 'Analysis pending'}

**Migration Approach:**
${this.analysis.consolidation_recommendations.migration_steps?.map((step, i) => `${i + 1}. ${step}`).join('\n') || 'Steps to be defined'}

## Risk Assessment
- **Data Loss Risk:** ${this.analysis.consolidation_recommendations.risk_assessment?.data_loss_risk || 'TBD'}
- **Application Impact:** ${this.analysis.consolidation_recommendations.risk_assessment?.application_impact || 'TBD'}
- **Rollback Complexity:** ${this.analysis.consolidation_recommendations.risk_assessment?.rollback_complexity || 'TBD'}

## Next Steps
1. Review and approve consolidation strategy
2. Create detailed migration scripts
3. Implement comprehensive backup procedures
4. Execute migration in staging environment
5. Validate all functionality before production deployment
`;
  }

  /**
   * Run comprehensive analysis
   */
  async runComprehensiveAnalysis() {
    console.log('🔍 Starting comprehensive database schema analysis...\n');
    
    try {
      // Analyze table structures
      this.analysis.members_table = await this.getTableStructure('members');
      this.analysis.profiles_table = await this.getTableStructure('profiles');
      
      // Analyze data and relationships
      await this.analyzeDataVolumes();
      await this.analyzeRelationships();
      
      // Analyze field overlaps
      this.analyzeFieldOverlaps();
      
      // Generate recommendations
      this.generateConsolidationRecommendations();
      
      // Save reports
      const reports = this.saveAnalysisReport();
      
      console.log('\n✅ Comprehensive database schema analysis completed!');
      if (reports) {
        console.log(`📊 Detailed report: ${reports.reportPath}`);
        console.log(`📋 Summary report: ${reports.summaryPath}`);
      }
      
      return this.analysis;
    } catch (error) {
      console.error('\n❌ Comprehensive analysis failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
export { ComprehensiveSchemaAnalyzer };

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new ComprehensiveSchemaAnalyzer();
  analyzer.runComprehensiveAnalysis()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}