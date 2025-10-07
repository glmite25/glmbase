# 🏛️ Gospel Labour Ministry Database Schema Recommendations

## 🚨 **Critical Fixes Applied**

### **Fixed SQL Script Issues:**
1. ✅ **Added missing trigger drop**: `sync_roles_safely_trigger`
2. ✅ **Added CASCADE to all function drops** for dependency safety
3. ✅ **Removed invalid categories**: "Deacons", "Elders" from migration logic
4. ✅ **Comprehensive trigger cleanup** before function drops

## 📊 **Current Schema Analysis**

### **Your Current Tables:**
```
auth.users (8 rows) - Supabase authentication
├── profiles (8 rows) - Extended user info
├── members (8 rows) - Church member data  
└── user_roles (1 row) - Role assignments
```

### **Problems Identified:**
1. **Data Duplication** - Same info in `profiles` and `members`
2. **Circular Dependencies** - Triggers creating infinite loops
3. **Inconsistent Data** - Email/name mismatches between tables
4. **Complex Sync Logic** - Multiple triggers trying to sync everything

## 🎯 **Recommended Schema Improvements**

### **Option 1: Consolidate Tables (RECOMMENDED)**

**Eliminate `profiles` table and use `members` as single source of truth:**

```sql
-- Keep only essential tables:
auth.users (authentication only)
├── members (all user data)
└── user_roles (role assignments)
```

**Benefits:**
- ✅ No data duplication
- ✅ Single source of truth
- ✅ Simpler sync logic
- ✅ Better performance

### **Option 2: Keep Separate Tables (Current)**

**If you must keep `profiles` table:**

```sql
-- Clear separation of concerns:
auth.users (authentication)
├── profiles (basic user info)
├── members (church-specific data)
└── user_roles (permissions)
```

**Requirements:**
- ✅ ONE-WAY sync only (auth.users → others)
- ✅ NO circular triggers
- ✅ Clear data ownership

## 🔧 **Sync Strategy Recommendations**

### **SAFE Sync Pattern (What We Implemented):**

```sql
-- ONLY ONE trigger:
auth.users → members (one-way)

-- NO automatic sync for:
profiles ← → members (manual updates only)
user_roles ← → anything (manual management)
```

### **Why This Works:**
1. **No Circular References** - Only one direction
2. **Predictable Behavior** - Clear data flow
3. **Easy Debugging** - Simple trigger chain
4. **Performance** - Minimal overhead

## 🗃️ **Indexing Recommendations**

### **Critical Indexes for Performance:**

```sql
-- Members table (most queried)
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_category ON members(category);
CREATE INDEX IF NOT EXISTS idx_members_active ON members(isactive) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_church_unit ON members(churchunit);

-- User roles (for admin functions)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Profiles (if keeping)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_active_category ON members(isactive, category) WHERE isactive = true;
CREATE INDEX IF NOT EXISTS idx_members_active_church_unit ON members(isactive, churchunit) WHERE isactive = true;
```

## 🔒 **Row Level Security (RLS) Recommendations**

### **Members Table RLS:**

```sql
-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own record
CREATE POLICY "Users can view own member record" ON members
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Super admins can view all
CREATE POLICY "Super admins can view all members" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- Policy 3: Pastors can view members in their church unit
CREATE POLICY "Pastors can view their unit members" ON members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members pastor 
            WHERE pastor.user_id = auth.uid() 
            AND pastor.category = 'Pastors'
            AND pastor.churchunit = members.churchunit
        )
    );

-- Policy 4: Users can update their own basic info
CREATE POLICY "Users can update own basic info" ON members
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id 
        AND category = OLD.category  -- Can't change their own category
        AND user_id = OLD.user_id    -- Can't change user_id
    );
```

### **User Roles RLS:**

```sql
-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super admins can manage all roles
CREATE POLICY "Super admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'superuser'
        )
    );

-- Policy 2: Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);
```

## 📈 **Performance Optimization**

### **Query Optimization:**

```sql
-- Efficient member listing (with pagination)
SELECT m.*, ur.role
FROM members m
LEFT JOIN user_roles ur ON m.user_id = ur.user_id
WHERE m.isactive = true
ORDER BY m.fullname
LIMIT 50 OFFSET 0;

-- Efficient church unit filtering
SELECT *
FROM members
WHERE isactive = true 
  AND churchunit = 'Discipleship'
ORDER BY fullname;

-- Efficient category filtering
SELECT *
FROM members
WHERE isactive = true 
  AND category = 'Pastors'
ORDER BY fullname;
```

### **Database Configuration:**

```sql
-- Optimize for your workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage
SELECT pg_reload_conf();
```

## 🛡️ **Security Best Practices**

### **1. Data Validation:**

```sql
-- Add constraints for data integrity
ALTER TABLE members ADD CONSTRAINT valid_email 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE members ADD CONSTRAINT valid_phone 
    CHECK (phone ~ '^\+?[1-9]\d{1,14}$');

ALTER TABLE members ADD CONSTRAINT valid_category 
    CHECK (category IN ('Pastors', 'Members', 'MINT'));
```

### **2. Audit Trail:**

```sql
-- Add audit columns
ALTER TABLE members ADD COLUMN created_by UUID REFERENCES auth.users(id);
ALTER TABLE members ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Audit trigger
CREATE OR REPLACE FUNCTION audit_member_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_members_update
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION audit_member_changes();
```

## 🚀 **Migration Strategy**

### **Phase 1: Immediate (DONE)**
- ✅ Fix recursion issues
- ✅ Standardize categories
- ✅ Migrate church units

### **Phase 2: Short-term (Next 1-2 weeks)**
- 📋 Add recommended indexes
- 📋 Implement RLS policies
- 📋 Add data validation constraints

### **Phase 3: Long-term (Next month)**
- 📋 Consider consolidating profiles → members
- 📋 Implement audit trail
- 📋 Add backup/recovery procedures

## 🎯 **Specific to Gospel Labour Ministry**

### **Church-Specific Optimizations:**

```sql
-- Pastoral care tracking
CREATE INDEX idx_members_assigned_pastor ON members(assignedto) WHERE assignedto IS NOT NULL;

-- Church unit leadership queries
CREATE INDEX idx_members_unit_leaders ON members(churchunit, category) WHERE category = 'Pastors';

-- Active member counts by unit
CREATE MATERIALIZED VIEW church_unit_stats AS
SELECT 
    churchunit,
    COUNT(*) as total_members,
    COUNT(*) FILTER (WHERE category = 'Pastors') as pastors_count,
    COUNT(*) FILTER (WHERE category = 'Members') as members_count,
    COUNT(*) FILTER (WHERE category = 'MINT') as mint_count
FROM members 
WHERE isactive = true 
GROUP BY churchunit;

-- Refresh stats daily
CREATE OR REPLACE FUNCTION refresh_church_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW church_unit_stats;
END;
$$ LANGUAGE plpgsql;
```

## ✅ **Next Steps**

1. **Run the corrected SQL script** - Should work without errors now
2. **Test super admin functions** - Verify no recursion
3. **Implement recommended indexes** - For better performance
4. **Add RLS policies** - For security
5. **Consider schema consolidation** - Eliminate profiles table

**Your database will be much more robust and maintainable after these improvements!** 🏛️✨
