# Requirements Document

## Introduction

The Gospel Labour Ministry database currently maintains two separate tables - `members` and `profiles` - that store overlapping user-related information. This creates data redundancy, potential inconsistencies, and maintenance complexity. The consolidation project aims to streamline the database schema by merging these tables while preserving all existing functionality and data integrity.

## Requirements

### Requirement 1

**User Story:** As a database administrator, I want to analyze the current schema structure of both `members` and `profiles` tables, so that I can understand the data overlap and unique fields in each table.

#### Acceptance Criteria

1. WHEN analyzing the database schema THEN the system SHALL identify all columns in the `members` table with their data types and constraints
2. WHEN analyzing the database schema THEN the system SHALL identify all columns in the `profiles` table with their data types and constraints  
3. WHEN comparing table structures THEN the system SHALL identify overlapping fields (email, phone, address, full_name/fullname)
4. WHEN comparing table structures THEN the system SHALL identify unique fields in each table
5. WHEN analyzing relationships THEN the system SHALL document how both tables relate to `auth.users`
6. WHEN analyzing data volume THEN the system SHALL determine the number of records in each table

### Requirement 2

**User Story:** As a database administrator, I want to consolidate the `members` and `profiles` tables into a unified structure, so that I can eliminate data redundancy and maintain a single source of truth for user information.

#### Acceptance Criteria

1. WHEN consolidating tables THEN the system SHALL preserve all existing data from both tables without loss
2. WHEN consolidating tables THEN the system SHALL merge overlapping columns intelligently (prioritizing non-null values)
3. WHEN consolidating tables THEN the system SHALL retain all unique columns from both tables
4. WHEN consolidating tables THEN the system SHALL maintain the relationship with `auth.users` table
5. WHEN consolidating tables THEN the system SHALL preserve all existing constraints and indexes
6. WHEN consolidating tables THEN the system SHALL maintain backward compatibility with existing application code

### Requirement 3

**User Story:** As a system administrator, I want all database triggers, functions, and RLS policies to be updated accordingly, so that the consolidated table maintains the same security and automation features.

#### Acceptance Criteria

1. WHEN updating database functions THEN the system SHALL modify all functions that reference `members` or `profiles` tables
2. WHEN updating triggers THEN the system SHALL ensure user synchronization triggers work with the consolidated table
3. WHEN updating RLS policies THEN the system SHALL maintain the same access control rules for the consolidated table
4. WHEN updating foreign key relationships THEN the system SHALL preserve all existing relationships with other tables
5. WHEN updating indexes THEN the system SHALL recreate all necessary indexes for optimal performance

### Requirement 4

**User Story:** As a developer, I want a comprehensive migration script that safely executes the consolidation, so that I can apply the changes without breaking the application.

#### Acceptance Criteria

1. WHEN executing migration THEN the system SHALL create backup tables before making changes
2. WHEN executing migration THEN the system SHALL validate data integrity before and after consolidation
3. WHEN executing migration THEN the system SHALL provide detailed logging of all operations
4. WHEN executing migration THEN the system SHALL include rollback procedures in case of failure
5. WHEN executing migration THEN the system SHALL preserve superuser roles for `ojidelawrence@gmail.com` and `popsabey1@gmail.com`
6. WHEN executing migration THEN the system SHALL maintain all existing authentication flows

### Requirement 5

**User Story:** As a developer, I want to identify all application code files that need updates, so that I can ensure the application continues to work with the consolidated database structure.

#### Acceptance Criteria

1. WHEN analyzing application code THEN the system SHALL identify all files that query the `members` table
2. WHEN analyzing application code THEN the system SHALL identify all files that query the `profiles` table
3. WHEN analyzing application code THEN the system SHALL identify all TypeScript types and interfaces that need updates
4. WHEN analyzing application code THEN the system SHALL identify all React hooks and utilities that need modifications
5. WHEN analyzing application code THEN the system SHALL provide specific file paths and line numbers for required changes

### Requirement 6

**User Story:** As a quality assurance tester, I want a comprehensive testing checklist, so that I can verify that all existing functionality continues to work after the consolidation.

#### Acceptance Criteria

1. WHEN testing authentication THEN the system SHALL verify user login and registration still work
2. WHEN testing member management THEN the system SHALL verify CRUD operations on member records work
3. WHEN testing admin functions THEN the system SHALL verify superuser access and permissions are maintained
4. WHEN testing data integrity THEN the system SHALL verify all existing data is accessible and accurate
5. WHEN testing performance THEN the system SHALL verify query performance is maintained or improved
6. WHEN testing RLS policies THEN the system SHALL verify access control rules work correctly

### Requirement 7

**User Story:** As a system administrator, I want clear documentation of the consolidation approach and rationale, so that I can understand the decisions made and maintain the system effectively.

#### Acceptance Criteria

1. WHEN documenting the approach THEN the system SHALL explain whether to merge into one table or keep separate tables
2. WHEN documenting the approach THEN the system SHALL justify the chosen consolidation strategy
3. WHEN documenting the approach THEN the system SHALL explain how duplicate/overlapping columns are handled
4. WHEN documenting the approach THEN the system SHALL document the final table structure and relationships
5. WHEN documenting the approach THEN the system SHALL provide maintenance guidelines for the consolidated structure