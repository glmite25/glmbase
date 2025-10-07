# 🏛️ Church Units Configuration Update

## ✅ **Official Church Units (Updated)**

The church units have been standardized to use the exact official names:

1. **3HMedia** (was: "3H Media")
2. **3HMusic** (was: "3H Music") 
3. **3HMovies** (was: "3H Movies")
4. **3HSecurity** (was: "3H Security")
5. **Discipleship** (unchanged)
6. **Praise Feet** (unchanged)
7. **Cloven Tongues** (unchanged)

## 📁 **Files Updated**

### **1. Constants File (NEW)**
- ✅ `src/constants/churchUnits.ts` - Central configuration for all church units

### **2. Components Updated**
- ✅ `src/components/admin/members/MultipleChurchUnitsSelect.tsx`
- ✅ `src/components/profile/ProfileEditForm.tsx`
- ✅ `src/components/admin/pastors/AddPastorDialog.tsx`
- ✅ `src/components/admin/users/EditUserDialog.tsx`
- ✅ `src/components/auth/AuthForm.tsx`
- ✅ `src/components/admin/AdminSidebar.tsx`
- ✅ `src/components/admin/members/MembersManager.tsx`

### **3. Database Migration**
- ✅ `update-church-units.sql` - Migrates existing data to official names

## 🔧 **Key Changes Made**

### **Centralized Configuration**
```typescript
// Before: Hardcoded in each component
const churchUnits = [
  { id: "3hmedia", name: "3H Media" },
  { id: "auxano", name: "Auxano Group" },
  // ...
];

// After: Centralized in constants
import { OFFICIAL_CHURCH_UNITS } from "@/constants/churchUnits";
const churchUnits = OFFICIAL_CHURCH_UNITS;
```

### **Official Names (Case-Sensitive)**
- **3HMedia** (not "3H Media")
- **3HMusic** (not "3H Music")
- **3HMovies** (not "3H Movies")
- **3HSecurity** (not "3H Security")
- **Praise Feet** (with space)
- **Cloven Tongues** (with space)

### **Legacy Mapping**
The system now maps legacy names to official names:
- "3H Media" → "3HMedia"
- "Auxano Group" → "Discipleship"
- "TOF" → "Cloven Tongues"
- "Music Ministry" → "3HMusic"
- etc.

## 📋 **Implementation Steps**

### **Step 1: Frontend Updates (COMPLETED)**
All components now use the centralized `OFFICIAL_CHURCH_UNITS` constant.

### **Step 2: Database Migration (READY)**
Run `update-church-units.sql` in Supabase SQL Editor to:
- Update existing member records
- Migrate legacy church unit names
- Insert official church units into church_units table
- Update validation functions

### **Step 3: Verification**
After running the migration:
1. Check that all dropdowns show the correct official names
2. Verify existing member records are updated
3. Test that new registrations use official names

## 🎯 **Benefits**

### **Consistency**
- All church units now use exact official names
- No more variations like "3H Media" vs "3HMedia"

### **Maintainability**
- Single source of truth in `src/constants/churchUnits.ts`
- Easy to add/remove church units in one place

### **Data Integrity**
- Database validation ensures only official names are used
- Legacy data is automatically migrated

### **Backward Compatibility**
- Existing records are preserved and migrated
- Legacy names are mapped to official names

## 🚀 **Next Steps**

1. **Run the database migration**:
   ```sql
   -- Copy and paste update-church-units.sql into Supabase SQL Editor
   ```

2. **Test the frontend**:
   - Check all dropdown menus show official names
   - Verify member registration works
   - Test member editing functionality

3. **Monitor for issues**:
   - Check for any unmapped legacy church units
   - Verify all existing data is correctly migrated

## 📊 **Migration Impact**

The migration will:
- ✅ **Preserve all existing data**
- ✅ **Update church unit names to official format**
- ✅ **Maintain member assignments**
- ✅ **Add validation for future entries**
- ✅ **Provide mapping for legacy names**

## ⚠️ **Important Notes**

1. **Case-Sensitive**: The official names are case-sensitive and must match exactly
2. **No "Auxano Group"**: This has been mapped to "Discipleship"
3. **Database IDs**: Internal IDs remain lowercase (e.g., "3hmedia") for consistency
4. **Display Names**: User-facing names use official format (e.g., "3HMedia")

The church units configuration is now standardized and ready for use! 🎉
