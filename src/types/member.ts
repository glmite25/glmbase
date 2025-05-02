
import * as z from "zod";

export type MemberCategory = 'Sons' | 'Pastors' | 'MINT' | 'Others';

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  category: MemberCategory;
  assignedTo?: string; // ID of pastor or MINT member assigned to this member
  assignedPastor?: Pastor; // Pastor object (populated when needed)

  // Support both camelCase and lowercase column names
  churchUnits?: string[]; // Multiple church units (e.g., ["3HMedia", "3HMusic"])
  churchunits?: string[]; // Lowercase variant
  churchUnit?: string; // Legacy field for backward compatibility
  churchunit?: string; // Lowercase variant

  auxanoGroup?: string; // Auxano group
  joinDate: string;
  notes?: string;
  isActive: boolean;
}

export const memberSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required" }),
  email: z.string().email({ message: "Valid email is required" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.enum(["Sons", "Pastors", "MINT", "Others"]),
  assignedTo: z.string().optional(),
  churchUnits: z.array(z.string()).optional(),
  churchUnit: z.string().optional(), // Legacy field for backward compatibility
  auxanoGroup: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type MemberFormValues = z.infer<typeof memberSchema>;

export interface Pastor {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  title?: string;
  bio?: string;
  churchUnit?: string; // Church unit (e.g., 3HMedia, 3HMusic)
  auxanoGroup?: string; // Auxano group
  memberCount?: number; // Number of members assigned to this pastor
}

export interface MintMember {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
}
