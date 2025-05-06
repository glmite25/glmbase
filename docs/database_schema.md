# Database Schema Documentation

This document outlines the database schema for the GLM Base application.

## Tables

### 1. members

Stores information about church members, including pastors.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier for the member |
| fullname | text | NOT NULL | Member's full name |
| email | text | NOT NULL | Member's email address |
| phone | text | | Member's phone number |
| address | text | | Member's physical address |
| category | text | NOT NULL | Member category (Sons, Pastors, MINT, Others) |
| title | text | | Pastor's title (e.g., Senior Pastor, Youth Pastor) |
| assignedto | uuid | | ID of the pastor assigned to this member |
| churchunit | text | | Primary church unit the member belongs to |
| churchunits | text[] | | Array of church units the member belongs to |
| auxanogroup | text | | Auxano group the member belongs to |
| joindate | date | NOT NULL, DEFAULT CURRENT_DATE | Date the member joined |
| notes | text | | Additional notes about the member |
| isactive | boolean | NOT NULL, DEFAULT true | Whether the member is active |
| created_at | timestamp with time zone | DEFAULT now() | Record creation timestamp |
| updated_at | timestamp with time zone | DEFAULT now() | Record update timestamp |

### 2. profiles

Stores user profile information for authentication.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | uuid | PRIMARY KEY | Unique identifier for the profile (matches auth.users) |
| email | text | | User's email address |
| full_name | text | | User's full name |
| updated_at | timestamp with time zone | DEFAULT timezone('utc', now()) | Record update timestamp |
| church_unit | text | | User's church unit |
| assigned_pastor | text | | ID of the pastor assigned to this user |
| phone | text | | User's phone number |
| genotype | text | | User's genotype |
| address | text | | User's physical address |
| role | text | | User's role in the system |

### 3. user_roles

Stores role assignments for users.

| Column Name | Data Type | Constraints | Description |
|-------------|-----------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the role assignment |
| user_id | uuid | NOT NULL | ID of the user (references auth.users) |
| role | public.app_role | NOT NULL, DEFAULT 'user' | Role assigned to the user |
| created_at | timestamp with time zone | DEFAULT now() | Record creation timestamp |

## Relationships

- A member can be assigned to one pastor (`members.assignedto` references `members.id` where category = 'Pastors')
- A user profile is linked to an auth user (`profiles.id` references `auth.users.id`)
- User roles are linked to auth users (`user_roles.user_id` references `auth.users.id`)

## Enums

### app_role

Possible values:

- 'user'
- 'admin'
- 'superuser'

## Notes

1. The `members` table has some duplicate columns that are being phased out:
   - Use `churchunits` (lowercase) instead of `"churchUnits"` (camelCase)
   - Use `churchunit` (lowercase) instead of `"churchUnit"` (camelCase)

2. All new database columns should follow the lowercase naming convention.
