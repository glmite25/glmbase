
import * as z from "zod";

export type MemberCategory = 'Members' | 'Pastors' | 'Workers' | 'Visitors' | 'Partners';

/**
 * Member interface representing a church member
 *
 * NOTE: The database uses lowercase column names (fullname, assignedto, etc.)
 * This interface uses camelCase for TypeScript conventions, but all database
 * operations should use lowercase column names in queries.
 */
export interface Member {
  id: string;
  fullName: string;      // DB column: 'fullname'
  email: string;
  phone?: string;
  address?: string;
  category: MemberCategory;
  assignedTo?: string;   // DB column: 'assignedto' - ID of pastor or MINT member assigned to this member
  assignedPastor?: Pastor; // Not a DB column - populated in code when needed

  // Church unit fields - DB uses lowercase (churchunits, churchunit)
  churchUnits?: string[]; // Multiple church units (e.g., ["3HMedia", "3HMusic"])
  churchUnit?: string;    // Single church unit (for backward compatibility)

  // The following are for internal use during data standardization
  churchunits?: string[]; // Lowercase variant - matches actual DB column name
  churchunit?: string;    // Lowercase variant - matches actual DB column name

  auxanoGroup?: string;  // DB column: 'auxanogroup'
  joinDate: string;      // DB column: 'joindate'
  notes?: string;
  isActive: boolean;     // DB column: 'isactive'
}

export const memberSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.enum(["Members", "Pastors", "Workers", "Visitors", "Partners"]),
  assignedTo: z.string().optional(),
  churchUnits: z.array(z.string()).optional(),
  churchUnit: z.string().optional(), // Legacy field for backward compatibility
  auxanoGroup: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

/**
 * Pastor interface representing a church pastor
 *
 * NOTE: The database uses lowercase column names (fullname, churchunit, etc.)
 * This interface uses camelCase for TypeScript conventions, but all database
 * operations should use lowercase column names in queries.
 */
export interface Pastor {
  id: string;
  fullName: string;      // DB column: 'fullname'
  email: string;
  phone?: string;
  title?: string;
  bio?: string;
  churchUnit?: string;   // DB column: 'churchunit' (e.g., 3HMedia, 3HMusic)
  auxanoGroup?: string;  // DB column: 'auxanogroup'
  memberCount?: number;  // Not a DB column - calculated in code
}

/**
 * MintMember interface representing a MINT team member
 *
 * NOTE: The database uses lowercase column names (fullname, etc.)
 */
export interface MintMember {
  id: string;
  fullName: string;      // DB column: 'fullname'
  email: string;
  phone?: string;
  role?: string;
}
